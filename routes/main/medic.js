var express = require('express');
var router = express.Router();
const cg = require('../../config')
const User = require('../../models/User')
const Medic = require('../../models/Medic')
const responseData = require('../../models/Responses.json');
const Request = require('../../models/Request');
const InvalidInputError = require('./error/invalid-input-error')
const ImpossibleError = require('./error/impossible-error')
const QueryError = require('./error/query-error');
const {
  Status
} = require('../../models/Request');
const {
  Topic
} = require('../../models/User');
const responder = require("../responder.js");



const Keyword = Object.freeze({
  CANCEL: "CANCEL",
  PAUSE: "PAUSE",
  RESUME: "RESUME",
  YES: "YES"
})

/* GET users listing. */
router.get('/', function (req, res, next) {
  //Helper function to send a response via Twilio API
  const respond = (message) => responder(req,res).respond(message)

  function continueConversation() {
    var input = req.query.Body.toUpperCase()
    switch (input) {
      default:
        getClientMedic()
        .then(({user,medic}) => validateAndFindRequest(user,medic))
        .then(docs => saveAllDocuments(docs))
        .catch(function (e) {
          if(e instanceof InvalidInputError){
            //Could not parse the medic's response. Ask them to try again in the right format
            respond(responseData.ERROR[3])
          }else{
            console.log(e)
          }
        })
        break;
      case Keyword.YES:
        //Find relevant request
        validateClientIdentity()
          .then(medic => confirmRequest(medic))
          .then(({request,medic}) => notifyAllParties(request, medic))
          .catch(err => {
            if(err)
            console.log(err)
            respond(responseData.ERROR[3])
          })

        break;
      case Keyword.CANCEL:
        //Send response to user

        //create brand new request?
        break;
      case Keyword.PAUSE:
        Medic.findOne({
          phone: req.query.From
        }).then(function (medic) {
          medic.available = false
          medic.save().then(function () {
            console.log("Medic no longer online: " + medic.id)
            unavailableMedic.log();
            respond("")
          })
        }).catch(function (e) {
          //Handle error: Error occurred while finding/saving Medic object
          respond("")
          console.error(e);
        })
        break;
      case Keyword.RESUME:
        Medic.findOne({
          phone: req.query.From
        }).then(function (medic) {
          medic.available = true
          medic.save().then(function () {
            console.log("Medic is now online: " + medic.id)
            availableMedic.log();
            respond("")
          })
        }).catch(function (e) {
          //Handle error: Error occurred while finding/saving Medic object
          respond("")
          console.error(e);
        })
        break;
    }
  }

  function getClientMedic() {
    return new Promise((resolve,reject) => {
      User.findOne({phone: req.query.From}).exec().then(function (user){
        if(!user) return reject(new QueryError("Unknown user on medic endpoint."))
        Medic.findOne({user: user.id}).exec().then(medic => resolve({user:user,medic:medic}))
        .catch(function (e) {
          reject(e)
        })
      }).catch(function (e) {
        reject(e)
      })  
    })
  }

  function validateAndFindRequest(user,medic) {
    return new Promise((resolve,reject) => {
      var input = req.query.Body
      if (!input.toUpperCase().includes("ACCEPT ")){
        return reject(new InvalidInputError("Input is not a valid response"))
      }
      //parse out the request id
      var parsedReqID = Number.parseInt(input.split(" ")[1])
      Request.findOne({reqID: parsedReqID}).exec().then(function (request){
        if(!request){
          return reject(new InvalidInputError("Unable to find request with that ID"))
        } 
        //to reduce cancelled calls,  bot asks for confirmation first
        respond(responseData.MEDIC[3].replace("%PLACEHOLDER%", request.location))
        //request never resaved
        request.medic = medic.id
        user.resID = 1
        resolve([user,medic,request])
      })//Ids will be padded
      .catch(function (e) {
        reject(e)
      })     
    })
  }


  function saveAllDocuments(docs){
    return new Promise((resolve, reject) => {
      try {
        for(doc of docs){
          doc.save()
        }
        console.log("Medic may be accepting a call")
        return resolve()
      }catch(e){
        return reject(new Error("Problem occurred during document saving process."))
      }
    })
  }

  function getOpenCases() {
    return new Promise((resolve, reject) => {
      Request.find({status: Status.Open}).exec().then(function (openRequests) {
        var openCases = ""
        for (var request of openRequests) {
          openCases += request.reqID + ","
        }
        return resolve(openCases.slice(0, openCases.length - 1))
      }).catch(function (e) {
        //Problem occurred while finding open cases.
        reject(new QueryError(e))
      })
    })
  }

  function validateClientIdentity() {
    return new Promise((resolve, reject) => {
      Medic.findOne({phone: req.query.From}).populate("user").exec() //promise-like
        .then(function (medic) {
          if (medic && medic.user.resID === 1) {
            resolve(medic)
          } else {
            reject(new InvalidInputError("Client is not a medic with a pending request acceptance confirmation."))
          }
        })
        .catch(function (e) {
          reject(e)
        })
    })
  }

  function confirmRequest(medic) {
    return new Promise((resolve, reject) => {
      //update info and push to db
      Request.findOne({
          medic: medic.id
        }).populate("user").exec() //promise-like
        .then(function (request) {
          if (!request) return reject(new QueryError("Unable to find request with id"))
          medic.available = false
          request.status = Status.Accepted
          request.save()
          medic.save()
          return resolve({
            request: request,
            medic: medic
          })
        })
        .catch(function (e) {
          reject(e)
        })
    })
  }

  function notifyAllParties(request, medic) {
    //Respond back to accepting medic 
    respond(responseData.MEDIC[4])
    //send dispatch notification to requester
    notifier.sendNotification(request.user.phone, responseData.HELP[3].replace("%PLACEHOLDER%", "#" + medic.medID))

    return new Promise((resolve, reject) => {
      //Broadcast request as accepted to all other relevant medics
      Medic.find({available: true}).populate("user").exec().then(function (medics) {
        if (medics.length === 0) return reject(new Error("There are no medics currently available to notify"))
        getOpenCases().then( function (openCaseIds) {
          var casesMessage = ""
          if (openCaseIds.length > 0) {
            casesMessage = "There are no other cases currently open"
          } else {
            casesMessage = "These cases are still open: " + openCaseIds
          }
          for (var medic of medics) {
            const message = responseData.MEDIC[2].replace("%PLACEHOLDER%", request.reqID).replace("%OTHERPLACEHOLDER%", casesMessage)
            notifier.sendNotification(medic.user.phone, message)
          }
          resolve()
        }).catch(function (e) {
          reject(e)
        })
      }).catch(function (e) {
        reject(e)
      })
    })
  }

  /*
  console.log("From: " + req.query.From)
  console.log("Body: " + req.query.Body)
  
  if(req.query.isNew === "true"){ //strict equality
    console.log("New conversation started")
    newConversation()
  }else{
    continueConversation()
  }
  */

  continueConversation();


})

module.exports = router;
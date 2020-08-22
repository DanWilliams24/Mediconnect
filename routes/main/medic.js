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
const notifier = require("../notifier.js")
const {
  Status
} = require('../../models/Request');
const {
  Topic
} = require('../../models/User');
const responder = require("../responder.js");
const LogicError = require('./error/logic-error');



const Keyword = Object.freeze({
  CANCEL: "CANCEL",
  PAUSE: "PAUSE",
  RESUME: "RESUME",
  YES: "YES",
  NO: "NO"

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
          } else if(e instanceof LogicError){
            respond(responseData.ERROR[6])
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
          .then(docs => saveAllDocuments(docs))
          .catch(function (e) {
            if(e instanceof ImpossibleError){
              //Request used to exist in DB but was deleted. Inform user
              console.log(e.stack)
              respond(responseData.ERROR[5])
            }else {
              console.log(e.stack)
              if(!res.headersSent){
                respond(responseData.ERROR[3])
              }
            }
          })

        break;
      case Keyword.NO:
        req.session.case = ""
        respond("")
        break;
      case Keyword.CANCEL:
        //Send response to user
        
        //create brand new request?
        break;
      case Keyword.PAUSE:
        Medic.findOne({
          user: req.query.User
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
          user: req.query.User
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
      Request.findOne({medic: medic.id, status: Status.Accepted}).exec().then(function (request){
        if(request){
          return reject(new LogicError("User has already accepted a different request"))
        }
      })
      //parse out the request id
      var parsedReqID = Number.parseInt(input.split(" ")[1])
      Request.findOne({reqID: parsedReqID}).exec().then(function (request){
        if(!request){
          return reject(new InvalidInputError("Unable to find request with that ID"))
        } 
        req.session.case = request.id
        console.log(req.session.case)
        //to reduce cancelled calls,  bot asks for confirmation first
        respond(responseData.MEDIC[3].replace("%PLACEHOLDER%", request.location))
        //using session variables replaces use of resID for medic endpoint
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
//====================================ACCEPTING REQUESTS===================================\\
  function validateClientIdentity() {
    return new Promise((resolve, reject) => {
      Medic.findOne({user: req.query.User}).populate("user").exec() //promise-like
        .then(function (medic) {
          if (medic && req.session.case) {
            resolve(medic)
          } else {
            console.log("Here: "+ req.session.case)
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
      Request.findById(req.session.case).populate("user").exec() //promise-like
        .then(function (request) {
          if (!request || (request && (request.status !== Status.Open) )) return reject(new ImpossibleError("Unable to find request with id, but request must exist. Did user retract help request or did the request status change?"))
          medic.available = false
          request.status = Status.Accepted
          request.medic = medic.id
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
        if (medics.length === 0) return reject(new Error("There are no medics currently available to notify about this update"))
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
          resolve([request,medic])
        }).catch(function (e) {
          reject(e)
        })
      }).catch(function (e) {
        reject(e)
      })
    })
  }
  continueConversation();


})

module.exports = router;
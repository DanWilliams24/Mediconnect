var express = require('express');
var router = express.Router();
const cg = require('../../config')
const User = require('../../models/user-schema')
const Medic = require('../../models/medic-schema')
const responseData = require('../util/responses.json');
const Request = require('../../models/request-schema');
const InvalidInputError = require('../error/invalid-input-error')
const ImpossibleError = require('../error/impossible-error')
const QueryError = require('../error/query-error');
const notifier = require("../util/notifier.js")
const {
  Status
} = require('../../models/request-schema');
const {
  Topic
} = require('../../models/user-schema');
const responder = require("../util/responder.js");
const LogicError = require('../error/logic-error');
const util = require('../util/utilities');
const {createOpenCaseMessage, getAvailableMedics} = require('../util/utilities');


const Keyword = Object.freeze({
  CANCEL: "CANCEL CASE",
  OFFLINE: "OFFLINE",
  ONLINE: "ONLINE",
  YES: "YES",
  NO: "NO",
  COMPLETE: "COMPLETE"

})

/* GET users listing. */
router.get('/', function (req, res, next) {
  //Helper function to send a response via Twilio API
  const respond = (message) => responder(req,res).respond(message)
  const requestBody = util.sanitize(req.query.Body)
  onACase().then((isOnCase) => {
    if(isOnCase){
      provideCaseOptions(isOnCase.medic,isOnCase.request)
    }else{
      processReply()
    }
  })
    
  
  //Need to add more options like getting more info on location
  function provideCaseOptions(medic,request){
    var input = requestBody.toUpperCase()
    switch (input) {
      case Keyword.CANCEL:
        //Send response to user
        //set request as open
        //create brand new request?
        cancelCaseAcceptance(medic,request)
        break;
      case Keyword.COMPLETE:
        //before hand, the user should recieve a list of these keywords
        //this is to complete a request
        //make medic available again
        request.status = Status.Fulfilled
        medic.available = true
        util.saveAllDocuments([request,medic]).then(function (){
          createOpenCaseMessage().then(function (caseMessage){
            respond(responseData.MEDIC[7] +" " + caseMessage + " To accept, reply 'ACCEPT (insert case number here)'")
          })
        })
        break;
      default: 
      if (input.toUpperCase().includes("ACCEPT ")){
        respond(responseData.ERROR[6])
      }else{
        respond(responseData.MEDIC[8])
      }
    }
  }
  function cancelCaseAcceptance(medic,request){
    return new Promise((resolve,reject) => {
      request.status = Status.Open
      request.medic = undefined
      medic.available = true
      util.saveAllDocuments([request,medic]).then(function () {
        createOpenCaseMessage().then(function (caseMessage){
          respond(responseData.MEDIC[5] + " " + caseMessage + " To accept, reply 'ACCEPT (insert case number here)'")
        })
      })
      
      
      notifier.sendNotification(request.user.phone, responseData.MEDIC[6])
      getAvailableMedics().then(function (medics){
        for(var med of medics){
          const message = responseData.MEDIC[0].replace("%PLACEHOLDER%", request.location).replace("%IDPLACEHOLDER%",request.reqID)
          notifier.sendMedicNotification(med.user.phone,message)
        }
      }) 
    })
  }

  function onACase(){
    return new Promise((resolve,reject) => {
      Medic.findOne({user: req.query.User}).exec().then( function (medic){
        Request.findOne({medic: medic.id, status: Status.Accepted}).populate("user").exec().then(function (request){
          if(request){
            return resolve({medic:medic,request:request});
          }else{
            return resolve(undefined);
          }
        }).catch(function (e) {
          console.log(e.stack)
          return resolve(undefined)
        })
      }).catch(function (e){
        console.log(e.stack)
        return resolve(undefined);
      })
    })
    
  }

  function processReply(){
    var input = requestBody.toUpperCase()
    switch (input) {
      default:
        getClientMedic()
        .then(medic => validateAndFindRequest(medic))
        .then(docs => util.saveAllDocuments(docs))
        .catch(function (e) {
          if(e instanceof InvalidInputError){
            //Could not parse the medic's response. Ask them to try again in the right format
            createOpenCaseMessage()
            .then(caseMessage => respond(responseData.ERROR[3].replace("%PLACEHOLDER%", caseMessage)))
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
          .then(({request,medic}) => util.saveAllDocuments([request,medic]))
          .then(docs => notifyAllParties(docs[0], docs[1]))
          
          .catch(function (e) {
            if(e instanceof ImpossibleError){
              //Request used to exist in DB but was deleted. Inform user
              console.log(e.stack)
              respond(responseData.ERROR[5])
            }else {
              console.log(e.stack)
              if(!res.headersSent){
                createOpenCaseMessage()
                .then(caseMessage => respond(responseData.ERROR[3].replace("%PLACEHOLDER%", caseMessage)))
              }
            }
          })

        break;
      case Keyword.NO:
        req.session.case = ""
        respond("")
        break;
      case Keyword.OFFLINE:
        Medic.findOne({
          user: req.query.User
        }).exec().then(function (medic) {
          medic.available = false
          util.saveDocument(medic).then(function () {
            console.log("Medic no longer online: " + medic.id)
            //unavailableMedic.log();
            respond("")
          })
        }).catch(function (e) {
          //Handle error: Error occurred while finding/saving Medic object
          respond("")
          console.error(e);
        })
        break;
      case Keyword.ONLINE:
        Medic.findOne({
          user: req.query.User
        }).exec().then(function (medic) {
          medic.available = true
          util.saveDocument(medic).then(function () {
            console.log("Medic is now online: " + medic.id)
            //availableMedic.log();
            createOpenCaseMessage().then(function (caseMessage){
              respond("Hello! " + caseMessage + " To accept, reply 'ACCEPT (insert case number here)'")
            })
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
      Medic.findOne({user: req.query.User}).exec().then(medic => resolve(medic))
      .catch(function (e) {
        reject(e)
      }) 
    })
  }

  function validateAndFindRequest(medic) {
    return new Promise((resolve,reject) => {
      var input = requestBody
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
        resolve([medic,request])
      })//Ids will be padded
      .catch(function (e) {
        reject(e)
      })     
    })
  }

//====================================ACCEPTING REQUESTS===================================\\
  function validateClientIdentity() {
    return new Promise((resolve, reject) => {
      Medic.findOne({user: req.query.User}).populate("user").exec() //promise-like
        .then(function (medic) {
          if (medic && req.session.case && medic.available) {
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
    respond(responseData.MEDIC[4].replace("%PLACEHOLDER%",request.idInfo))
    //send dispatch notification to requester
    notifier.sendNotification(request.user.phone, responseData.HELP[3].replace("%PLACEHOLDER%", "#" + medic.medID))

    return new Promise((resolve, reject) => {
      //Broadcast request as accepted to all other relevant medics
      getAvailableMedics().then(function (medics) {
        if (medics.length === 0) return reject(new Error("There are no medics currently available to notify about this update"))
        createOpenCaseMessage().then(function (casesMessage){
          for (var medic of medics) {
            const message = responseData.MEDIC[2].replace("%PLACEHOLDER%", request.reqID).replace("%OTHERPLACEHOLDER%", casesMessage)
            notifier.sendMedicNotification(medic.user.phone, message)
          }
          resolve([request,medic])
        })
      }).catch(function (e) {
        reject(e)
      })
    })
  }
})

module.exports = router;
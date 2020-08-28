var express = require('express');
var router = express.Router();
const User = require('../../models/user-schema')
const Medic = require('../../models/medic-schema')
const responseData = require('../util/responses.json');
const Request = require('../../models/request-schema');
const { Topic } = require('../../models/user-schema');
const { Status } = require('../../models/request-schema');
const dayjs = require('dayjs');
const responder = require("../util/responder.js")
const notifier = require("../util/notifier.js")
const util = require("../util/utilities.js")

const Keyword = Object.freeze({
  CANCEL: "CANCEL",
  YES: "YES",
  NO: "NO",
  HELP_ME: "HELP ME"
})
/* GET users listing. */
router.get('/', function(req, res, next) {
  //Helper function to send a response via Twilio API
  const respond = (message) => responder(req,res).respond(message)
  console.log(req.query.Body)
  const requestBody = util.sanitize(req.query.Body)
  function newConversation(){
    User.findOne({phone: req.query.From}).exec().then(function (user){
      if(!user){
        //Create new user and save to db
        util.saveDocument(createNewUser()).then(function () {
          //End response by sending an initial message back to twilio to the user.
          respond(responseData.HELP[req.session.counter])
        }).catch(function (e){
          respond(responseData.ERROR[4]) //technical difficulties
          console.log(e)
        })
      }else{
        //This must be an existing person, so restart on new conversation topic. 
        resetUser(user)
        .then((user) => util.saveDocument(user))
        .then(function () {
          //end response by sending an initial message back to twilio to the user.
          respond(responseData.HELP[req.session.counter])
        }).catch(function (e){
          respond(responseData.ERROR[4]) //technical difficulties
          console.log(e)
        })
      }
    }).catch(function (e){
      respond(responseData.ERROR[4]) //technical difficulties
      console.log("Impossible Error\n" + e.stack)
    })
  }

  function createNewUser(){
    //Create new user. Note that ResID is not set so it can default to 0.
    let newUser = new User({phone: req.query.From,isMedic: false, topic: Topic.Help})
    req.session.counter = 0
    return newUser
  }

  function createNewRequest(user){
    //create new request document, update the users resID, and push all changes to DB
    let newRequest = new Request({user: user.id})
    req.session.counter +=1;
    req.session.request = newRequest.id
    console.log("New value of session counter: " + req.session.counter)
    return newRequest
  }

  function resetUser(user){
    return new Promise((resolve,reject) => {
      //Change topic and reset ResID for user
      user.topic = Topic.Help
      //user.resID = 0
      req.session.counter = 0
      console.log("Current value of session counter: " + req.session.counter)
      //delete past incomplete request if any
      Request.deleteMany({user: user.id, status: Status.Incomplete}).exec().then(function (){
        console.log("Deleted past request")
      })
      resolve(user)
    })
  }

  function continueConversation(){
    console.log("Current value of session counter: " + req.session.counter)
    //Check to make sure conversation is in fact being continued
    if(req.session.counter === undefined){
      return respond(responseData.ERROR[0])
    }
    //Check to see if we are ready to create Help Request Dispatch
    User.findById(req.query.User).exec().then(function (user) {
      if(user){
        switch(req.session.counter){
          case 0: 
            //If the user responds yes, send back the next response,
            if(requestBody.toUpperCase() === "YES"){
              util.saveDocument(createNewRequest(user)).then(function () {
                //End response by sending an initial message back to twilio to the user.
                respond(responseData.HELP[req.session.counter])
              })
            } else {
              //User did not send back yes. Send back response waiting till they respond yes
              respond(responseData.ERROR[1])
            }
            break;
            
          case 1:
            Request.findById(req.session.request).exec().then(function (request){
              req.session.counter +=1;
              updateHelpRequest()
              respond(responseData.HELP[5])
            })
            break;
          case 2:
            Request.findById(req.session.request).exec().then(function (request){
              req.session.counter +=1;
              //Send response as soon as possible
              dispatchMedics(request.location,request.reqID)
              finalizeHelpRequest()
            }).catch(function (e){
              //request session exists, but db request is gone. shouldnt happen
              respond(responseData.ERROR[4]) 
            })
            break;
            //this is for completed/fulfilled/unfulfilled requests
          case 3: respond(responseData.ERROR[0])
            break;
        }
      }else{
        console.error("User Not Found: It seems that something has went wrong. There should be an existing user if the conversation is being continued ")
        //console.error("Error info: ")
      }
    })
  }

  function providePostRequestOptions(request){
    var input = requestBody.toUpperCase()
    if(input == Keyword.CANCEL){
      cancelRequest(request)
    }else if(input == Keyword.HELP_ME){
      respond(responseData.ERROR[9])
    }else{
      if(request.status == Status.Accepted){
        switch (input) {
          //Special keywords to send updates
          case Keyword.CANCEL:
            cancelRequest(request)
            break;
          default:
            respond(responseData.HELP[4])
        }
      }else{
        respond(responseData.HELP[4])
      }
    }
  }
  function hasOpenRequest(){
    return new Promise((resolve,reject) => {
      Request.findOne({user: req.query.User,status: {$in:[Status.Open,Status.Accepted]}}).exec().then(function (request){
        if(request){
          return resolve(request)
        }else{
          return resolve(undefined)
        }
      }).catch(function (e) {
          //console.log(e.stack)
          return resolve(undefined)
      })
    })
  }

  function cancelRequest(request){
    return new Promise((resolve,reject) => {
      request.status = Status.Unfulfilled
      respond(responseData.HELP[6])
      util.saveDocument(request)
      util.createOpenCaseMessage().then(function (caseMessage){
        Medic.findOne({user: request.medic}).populate("user").exec().then(function (medic){
          if(medic){
            notifier.sendMedicNotification(medic.user.phone, responseData.HELP[7].replace("%OTHERPLACEHOLDER%",caseMessage))
          }else{
            //no medic assigned to this case yet
          }
        })
        Medic.find({available: true}).populate("user").exec().then(function (medics){
          for(var med of medics){
            const message = responseData.MEDIC[9].replace("%PLACEHOLDER%", request.reqID).replace("%OTHERPLACEHOLDER%",caseMessage)
            notifier.sendMedicNotification(med.user.phone,message)
          }
        })
      }) 
    })
  }

  function updateHelpRequest(){
    //Right after medics are dispatched, save data
    Request.findById(req.session.request).exec().then(function (request){
      request.location = requestBody
      util.saveDocument(request).then(function () {
        console.log("Request Pushed to DB: " + request.id)
        request.log()
      }).catch(function (e){
        console.log(e)
      })
    }).catch(function (e){
      console.log(e)
    })
  }

  function finalizeHelpRequest(){
    //Right after medics are dispatched, save data
    Request.findById(req.session.request).exec().then(function (request){
      request.idInfo = requestBody
      let now = dayjs()
      request.madeAt = now.toISOString()
      request.status = Status.Open
      util.saveDocument(request).then(function () {
        console.log("Request Pushed to DB: " + request.id)
        request.log()
      }).catch(function (e){
        console.log(e)
      })
    }).catch(function (e){
      console.log(e)
    })
  }

  function dispatchMedics(location,reqID){
    //1. finalize Request, push to db
    //2. Search for available medics
    //3. Use response.json to send back the appropriate message
    //4. Send request to all available medics
    Medic.find({available: true}).populate("user").exec().then(function (medics){
      if(medics.length !== 0){
        respond(responseData.HELP[2])
        for(var medic of medics){
          const message = responseData.MEDIC[0].replace("%PLACEHOLDER%", location).replace("%IDPLACEHOLDER%",reqID)
          notifier.sendMedicNotification(medic.user.phone,message)
        }
      }else{
        //No available medics
        respond(responseData.ERROR[2])
      }
    }).catch(function (e){
      //Error occurred
      console.log(e)
      respond(responseData.ERROR[4])
    })
    
  }
  console.log("From: " + req.query.From)
  console.log("Body: " + requestBody)
  
  hasOpenRequest().then((hasOpenRequest) => {
    console.log(hasOpenRequest)
    if(hasOpenRequest){
      providePostRequestOptions(hasOpenRequest)
    }else{
      processReply()
    }
  })

  function processReply(){
    if(req.query.isNew === "true"){ //strict equality
      console.log("New conversation started")
      newConversation()
    }else{
      continueConversation()
    }
  }
  
});

module.exports = router;

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
/* GET users listing. */
router.get('/', function(req, res, next) {
  //Helper function to send a response via Twilio API
  const respond = (message) => responder(req,res).respond(message)

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
        util.saveDocument(user).then(function () {
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
    //Change topic and reset ResID for user
    user.topic = Topic.Help
    //user.resID = 0
    req.session.counter = 0
    console.log("Current value of session counter: " + req.session.counter)
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
            if(req.query.Body.toUpperCase() === "YES"){
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
              //Send response as soon as possible
              dispatchMedics(req.query.Body,request.reqID)
              finalizeHelpRequest()
            }).catch(function (e){
              //request session exists, but db request is gone. shouldnt happen
              respond(responseData.ERROR[4]) 
            })
            break;
          case 2: respond(responseData.HELP[4])
            break;
        }
      }else{
        console.error("User Not Found: It seems that something has went wrong. There should be an existing user if the conversation is being continued ")
        //console.error("Error info: ")
      }
    })
  }
  function finalizeHelpRequest(){
    //Right after medics are dispatched, save data
    Request.findById(req.session.request).exec().then(function (request){
      request.location = req.query.Body
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
          notifier.sendNotification(medic.user.phone,message)
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
  console.log("Body: " + req.query.Body)
  
  if(req.query.isNew === "true"){ //strict equality
    console.log("New conversation started")
    newConversation()
  }else{
    continueConversation()
  }
});

module.exports = router;

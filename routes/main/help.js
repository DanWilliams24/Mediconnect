var express = require('express');
var router = express.Router();
const cg = require('../../config')
const twilio = require('twilio')(cg.accountSid, cg.authToken);
const MessagingResponse = require('twilio').twiml.MessagingResponse;
const User = require('../../models/User')
const Medic = require('../../models/Medic')
const responseData = require('../../models/Responses.json');
const Request = require('../../models/Request');
const { Topic } = require('../../models/User');
const { Status } = require('../../models/Request');
const dayjs = require('dayjs');
const { MediaContext } = require('twilio/lib/rest/api/v2010/account/message/media');

/* GET users listing. */
router.get('/', function(req, res, next) {
  function respond(message) {
    const twiml = new MessagingResponse();
    twiml.message(message);
    console.log(twiml.toString())
    res.writeHead(200, {'Content-Type': 'text/xml'});
    res.end(twiml.toString());
  }

  function newConversation(){
    User.findOne({phone: req.query.From}, function (err, user){
      if(!user){
        //Create new user. Note that ResID is not set so it can default to 0.
        let newUser = new User({phone: req.query.From,isMedic: false, topic: Topic.Help})
        //End response by sending an initial message back to twilio to the user.
        respond(responseData.HELP[newUser.resID])
        //Push to DB. 
        newUser.save(function (err, createdUser){
          if(err) return console.error(err);
          console.log("NEW USER SUCCESSFULLY CREATED: " + createdUser.id)
          createdUser.log();
        });
      }else{
        //This must be an existing person, but new conversation topic. 
        //Change topic and reset ResID for user
        user.topic = Topic.Help
        user.resID = 0
        //end response by sending an initial message back to twilio to the user.
        respond(responseData.HELP[user.resID])
        //Finally, update database document for existing user
        user.save(function (err, updatedUser){
          if(err) return console.error(err);
          console.log("Updated existing User's topic: " + updatedUser.id)
        });
      }
    })
  }
  function continueConversation(){
    //Check to see if we are ready to create Help Request Dispatch
    User.findById(req.query.User, function (err, user){
      if(user){
        //console.log("Testing to see if Undefined === 0 in switch as falsy value " + user.resID)
        switch(user.resID){
          case 0: 
            //If the user responds yes, send back the next response,
            if(req.query.Body.toUpperCase() === "YES"){
              respond(responseData.HELP[user.resID+1])
              //create new request document, update the users resID, and push all changes to DB
              let newRequest = new Request({user: user.id})
              user.resID +=1;
              //Complete saves asynchronously with callbacks (order doesnt matter here)
              newRequest.save(function (err, request){
                if(err) return console.error(err);
                console.log("NEW REQUEST SUCCESSFULLY CREATED: " + request.id)
              });
              user.save(function (err, user){
                if(err) return console.error(err);
                console.log("Saved new resID as: " + user.resID)
                console.log("New Response: " + responseData.HELP[user.resID])
              });
            } else {
              //User did not send back yes. Send back response waiting till they respond yes
              respond(responseData.ERROR[1])
            }
            break;
          case 1:
            //Send response as soon as possible
            dispatchMedics(req.query.Body)
            Request.findOne({user: user.id}, function(err, request){
              if(err) return console.error(err);
              request.location = req.query.Body
              user.resID +=1
              let now = dayjs()
              let nextNotification = now.add("5", "minute")
              request.madeAt = now.toISOString()
              request.nextNotification = nextNotification.toISOString()
              request.status = Status.Open
              request.save(function (err, completeReq){
                if(err) return console.error(err);
                console.log("Request Pushed to DB: " + request.id)
                request.log()
              })
               //replace with, may need a callback :( 
              user.save(function (err, user){
                if(err) return console.error(err);
                console.log("Saved new resID as: " + user.resID)
              });
            })
            break;
          case 2: respond(responseData.HELP[4])
          break;

        }
      }else{
        console.error("User Not Found: It seems that something has went wrong. There should be an existing user if the conversation is being continued ")
        console.error("Error info: " + err)
      }
    })
  }

  function dispatchMedics(location){
    //1. finalize Request, push to db
    //2. Search for available medics
    //3. Use response.json to send back the appropriate message
    //4. Send request to all available medics
    Medic.find({available: true}).populate("user").exec(function (err, medics){
      if(medics.length !== 0){
        respond(responseData.HELP[2])
        for(var medic of medics){
          //console.log("Message Dispatched to: " + medic.user.phone)
          twilio.messages.create({
            body: responseData.MEDIC[0].replace("%PLACEHOLDER%", location),
            from: cg.twilioNumber,
            to: medic.user.phone
          }).then(message => console.log("Message Dispatched to: " + medic.user.phone + "\nSID: " + message.sid));
        }
      }else{
        respond(responseData.ERROR[2])
      }
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

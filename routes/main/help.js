var express = require('express');
var router = express.Router();
const cg = require('../../config')
//const Twilio = require('twilio')(cg.accountSid, cg.authToken);
const MessagingResponse = require('twilio').twiml.MessagingResponse;
const User = require('../../models/User')
const responseData = require('../../models/Responses.json');
const Request = require('../../models/Request');
const { Topic } = require('../../models/User');
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
        //Create new user and push to DB. Note that ResID is not set so it can default to 0.
        let newUser = new User({phone: req.query.From,isMedic: false, topic: Topic.Topics.Help})
        newUser.save(function (err, user){
          if(err) return console.error(err);
          console.log("NEW USER SUCCESSFULLY CREATED")
          user.log();
          //Finally, end response by sending an initial message back to twilio to the user.
          respond(responseData.HELP[user.resID])
        });
      }else{
        //This must be an existing person, but new conversation topic. 
        //Change topic and reset ResID for user
        user.topic = Topic.Topics.Help
        user.resID = 0
        user.save(function (err, user){
          if(err) return console.error(err);
          console.log("Updated existing User's topic!")
          user.log();
          //Finally, end response by sending an initial message back to twilio to the user.
          respond(responseData.HELP[user.resID])
        });
      }
      
    })
  }

  function continueConversation(){
    /*Check to see if we are ready to create Help Request Dispatch
    If so: 
      1. Create Request, push to db
      2. Search for available medics
      3. Send request to all available medics
      4. Use response.json to send back the appropriate message
    If not:
      1. Use response.json to send back the appropriate message
    */
    User.findById(req.query.From, function (err, user){
      if(user){
        //console.log("Testing to see if Undefined === 0 in switch as falsy value " + user.resID)
        switch(user.resID){
          case 0: 
            if(req.query.Body.toUpperCase() === "YES"){
              //console.log("Testing to see if Undefined === 0 in switch as falsy value " + user.resID)
              let newRequest = new Request({user: user.id})
              newRequest.save(function (err, request){
                if(err) return console.error(err);
                console.log("NEW REQUEST SUCCESSFULLY CREATED")
                //newRequest.log();
                user.resID +=1;
                console.log(user.resID)
                user.save(function (err, user){
                  if(err) return console.error(err);
                  console.log("Saved new resID as: " + user.resID)
                  console.log("New Response: " + responseData.HELP[user.resID])
                  respond(responseData.HELP[user.resID])
                });
              });
            } else{
              respond(responseData.ERROR[1])
            }
            break;
          case 1:
            Request.findOne({user: user.id}, function(err, request){
              if(err) return console.error(err);
              request.location = req.query.Body
              user.resID +=1
              user.save(function (err, user){
                if(err) return console.error(err);
                completeRequest() //replace with, may need a callback :( 
                request.save(function (err, request){
                  if(err) return console.error(err);
                  respond(responseData.HELP[user.resID])
                });
              });
            })
            break;
        }
        

      }else{
        console.error("User Not Found: It seems that something has went wrong. There should be an existing user if the conversation is being continued ")
        console.error("Error info: " + err)
      }
    })

  }

  function completeRequest(){
    //1. finalize Request, push to db
    //2. Search for available medics
    //3. Send request to all available medics
    //4. Use response.json to send back the appropriate message
  }
  console.log("From: " + req.query.From)
  console.log("Body: " + req.query.Body)
  
  if(req.query.isNew === "true"){ //strict equality
    console.log("New conversation started")
    newConversation()
  }else{
    continueConversation()
  }

  //respond('respond with a resource') // remove once endpoint is completed
  //res.send('respond with a resource');
});

module.exports = router;

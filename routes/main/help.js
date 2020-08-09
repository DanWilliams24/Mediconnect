var express = require('express');
var router = express.Router();
const cg = require('../../config')
//const Twilio = require('twilio')(cg.accountSid, cg.authToken);
const MessagingResponse = require('twilio').twiml.MessagingResponse;
const User = require('../../models/User')
const responseData = require('../../models/Responses.json')
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
        let newUser = new User({phone: req.query.From,isMedic: false, topic: User.Topic.Help})
        newUser.save(function (err, user){
          if(err) return console.error(err);
          console.log("NEW USER SUCCESSFULLY CREATED")
          user.log();
        });
      }else{
        //This must be an existing person, but new conversation topic. 
        //Change topic and reset ResID for user
        user.topic = User.Topic.Help
        user.resID = 0
        user.save(function (err, user){
          if(err) return console.error(err);
          console.log("Updated existing User's topic!")
          user.log();
        });
      }
      //Finally, end response by sending an initial message back to twilio to the user.
      respond(responseData.HELP[user.resID])
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
    

  }

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

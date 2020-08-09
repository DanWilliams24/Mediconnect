var express = require('express');
var router = express.Router();
const cg = require('../../config')
const MessagingResponse = require('twilio').twiml.MessagingResponse;
const User = require('../../models/User');
const url = require('url')
const { Topic } = require('../../models/User');
const responseData = require('../../models/Responses.json');

/* GET home page. */
router.get('/', function (req, res, next) {
  //Helper function to send a response via Twilio API
  function respond(message) {
    const twiml = new MessagingResponse();
    twiml.message(message);
    console.log(twiml.toString())
    res.writeHead(200, {'Content-Type': 'text/xml'});
    res.end(twiml.toString());
  }
  
  //Redirects to other pages while preserving important data 
  //Options: If starting a new convo, supply only true to isNew. Otherwise, supply user id to from field 
  function redirect(pathname, options){
    //console.log("Req Query: " + req.body)
    const redirectQuery = {
      "From": options.From || req.body.From,
      "Body": req.body.Body, 
      "isNew": options.isNew || false 
    }
    res.redirect(url.format({pathname: pathname,query: redirectQuery}))
  }

  function checkMongo() {
    // Check if there are any responses for the current number in an incomplete
    // survey response
    User.findOne({phone: req.body.From}, function (err, user){
      if(user){
        //existing phone number. Search existing data for state and redirect user. 
        switch(user.topic){
          case Topic.Topics.Help: redirect("/inbound/help", {From: user.id})
            break;
          case Topic.Topics.SignUp: redirect("/inbound/signup", {From: user.id})
            break;
          case Topic.Topics.Medic: redirect("/inbound/medic", {From: user.id})
            break;
          default: throw new Error("This is an impossible case as user should always have a topic.")
            break;
        }
      } else {
        //new phone number, number has never been logged. They also did not use a keyword. 
        // This may be an invalid request, send them back a list of valid keywords.
        respond(responseData.ERROR[0])
      }
    })
  }

  var phone = req.body.From; 
  var input = req.body.Body;
  console.log(phone)
  console.log(input)

  //Check input to see if it is a keyword
  switch (input.toUpperCase()) {
    case "HELP":
      console.log("HELP ME")
      redirect("/inbound/help",{isNew: true});
      break;
    case "SIGNUP":
      console.log("SIGN ME UP")
      redirect("/inbound/signup", {isNew: true});
      break;
    default: checkMongo(); //otherwise check mongo for phone and carry on conversation
  }
});

module.exports = router;
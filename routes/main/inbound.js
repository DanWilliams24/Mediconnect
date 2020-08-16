var express = require('express');
var router = express.Router();

const MessagingResponse = require('twilio').twiml.MessagingResponse;
const User = require('../../models/User');
const url = require('url')
const { Topic } = require('../../models/User');
const responseData = require('../../models/Responses.json');
const responder = require("../responder.js")
const Keyword = Object.freeze({
    HELP_ME: "HELP ME",
    SIGNUP: "SIGNUP",
    CHANGE: "CHANGE"
})

/* GET home page. */
router.get('/', function (req, res, next) {
  //Helper function to send a response via Twilio API
  const respond = (message) => responder(res).respond(message)
  //Options: If starting a new convo, supply only true to isNew. Otherwise, supply user id to from field 
  function redirect(pathname, options){
    //console.log("Req Query: " + req.body)
    const redirectQuery = {
      "User": options.From || req.query.From, 
      "isNew": options.isNew || false 
    }
    res.redirect(url.format({pathname: pathname,query: redirectQuery}))
  }

  function testredirect(pathname, options){
    //console.log("Req Query: " + req.body)
    const redirectQuery = {
      "From": req.query.From,
      "User": options.From || req.query.From,
      "Body": options.Body || req.query.Body, 
      "isNew": options.isNew || false 
    }
    res.redirect(url.format({pathname: pathname,query: redirectQuery}))
  }

  function checkMongo() {
    // Check if there are any responses for the current number in an incomplete
    // survey response
    User.findOne({phone: req.query.From}, function (err, user){
      if(user){
        //existing phone number. Search existing data for state and redirect user. 
        switch(user.topic){
          case Topic.Help: testredirect("/inbound/help", {From: user.id})
            break;
          case Topic.SignUp: testredirect("/inbound/signup", {From: user.id})
            break;
          case Topic.Medic: testredirect("/inbound/medic", {From: user.id})
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

  var phone = req.query.From; 
  var input = req.query.Body;
  console.log(phone)
  console.log(input)

  //Check input to see if it is a keyword
  switch (input.toUpperCase()) {
    case Keyword.HELP_ME:
      console.log("New user with code - HELP ME")
      testredirect("/inbound/help",{isNew: true});
      break;
    case Keyword.SIGNUP:
      console.log("New medic with code - SIGN ME UP")
      testredirect("/inbound/signup", {isNew: true});
      break;
    case Keyword.CHANGE://this keyword is temporary. All medics are preregistered using the signup endpoint 
      console.log("Test endpoint - Creating Dev Medic")
      testredirect("/inbound/signup", {isNew: true});
      break;
    default: checkMongo(); //otherwise check mongo for phone and carry on conversation
  }
});

module.exports = router;
//module.exports = Keyword;

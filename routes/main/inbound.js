var express = require('express');
const {
  response
} = require('../../app');
var router = express.Router();
const cg = require('../../config')
const twilio = require('twilio')(cg.accountSid, cg.authToken);
const Medics = require('../../models/Medic');
const Requests = require('../../models/Request');
const url = require('url')

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
  function redirect(pathname, isNew){
    //console.log("Req Query: " + req.body)
    const redirectQuery = {
      "From": req.body.From,
      "Body": req.body.Body, 
      "isNew": isNew 
    }
    res.redirect(url.format({pathname: pathname,query: redirectQuery}))
  }

  function checkMongo() {
    // Check if there are any responses for the current number in an incomplete
    // survey response
    User.findOne({phone: req.body.From}, function (err, user){
      if(user){
        //existing phone number. Search existing data for state and redirect user. 
        switch(user.topic.toUpperCase()){
          case "HELP": redirect("/inbound/help", false)
            break;
          case "SIGNUP": redirect("/inbound/signup", false)
            break;
          case "MEDIC": redirect("/inbound/medic", false)
            break;
          default: throw new Error("This is an impossible case as user should always have a topic.")
            break;
        }
      } else {
        //new phone number, number has never been logged. They also did not use a keyword. 
        // This may be an invalid request, send them back a list of valid keywords.
        respond("Hello! Unfortunately we were unable to understand what you said. Please text 'HELP' to get in contact with onsite medics or 'SIGNUP' to register as a onsite medic.")
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
      redirect("/inbound/help",true);
      break;
    case "SIGNUP":
      console.log("SIGN ME UP")
      redirect("/inbound/signup", true);
      break;
    default: checkMongo(); //otherwise check mongo for phone and carry on conversation
  }
});









module.exports = router;
var express = require('express');
const {
  response
} = require('../../app');
var router = express.Router();
const cg = require('../../config')
const twilio = require('twilio')(cg.accountSid, cg.authToken);
const Medics = require('../../models/Medic');
const Requests = require('../../models/Request');
const { MessageInstance } = require('twilio/lib/rest/api/v2010/account/message');

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
  var phone = req.body.From;
  var input = req.body.Body;
  console.log(phone)
  console.log(input)
  switch (input) {
    case "HELP":
      console.log("HELP ME")
      res.redirect("/inbound/help");
      break;
    case "SIGNUP":
      console.log("SIGN ME UP")
      res.redirect("/inbound/signup");
      break;
    default: checkMongo();
  }

  function checkMongo() {
    // Check if there are any responses for the current number in an incomplete
    // survey response
    User.findOne({phone: phone}, function (err, user){
      if(user){
        //existing phone number. Search existing data for state and redirect user. 
        switch(user.topic){
          case "help": res.redirect("/inbound/help")
            break;
          case "signup": res.redirect("/inbound/signup")
            break;
          case "medic": res.redirect("/inbound/medic")
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


    /*
    Medics.findOne({phone: phone }, function (err, doc) {
      if (doc) {
        if (doc.complete) {
          res.redirect("/currentMedics")
        } else {
          res.redirect("/medicSurvey")
        }
      } else {
        Request.findOne({
          phone: phone
        }, function (err, doc) {
          if (doc) {
            if (doc.complete) {
              res.redirect("/currentRequests")
            } else {
              res.redirect("/requestSurvey")
            }
          } else {
            // After the first message, start processing input
            respond("Hello! Unfortunately we were unable to understand what you said. Please text 'HELP' to get in contact with onsite medics or 'SIGNUP' to register as a onsite medic.")
          }
        });
      }
    });
    */
  }






  




});









module.exports = router;
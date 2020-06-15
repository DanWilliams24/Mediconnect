var express = require('express');
const {
  response
} = require('../app');
var router = express.Router();
const cg = require('../config')
const twilio = require('twilio')(cg.accountSid, cg.authToken);
const Medics = require('../models/Medic');
const Requests = require('../models/Request');

/* GET home page. */
router.get('/', function (req, res, next) {
  //Helper function to send a response via Twilio API
  function respond(message) {
    var twiml = new twilio.twiml.MessagingResponse();
    twiml.message(message);
    logger.debug(twiml.toString());
    res.type('text/xml');
    res.send(twiml.toString());
  }
  var phone = req.body.From;
  var input = req.body.Body;

  switch (input) {
    case "HELP":
      res.redirect("/help");
      break;
    case "SIGNUP":
      res.redirect("/signup");
      break;
    default: checkMongo();
  }

  function checkMongo() {
    // Check if there are any responses for the current number in an incomplete
    // survey response
    Medic.findOne({
      phone: phone
    }, function (err, doc) {
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
  }






  //Check if user is from continued conversation or new conversation




});









module.exports = router;
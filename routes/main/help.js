var express = require('express');
var router = express.Router();
const cg = require('../../config')
//const Twilio = require('twilio')(cg.accountSid, cg.authToken);
const MessagingResponse = require('twilio').twiml.MessagingResponse;
/* GET users listing. */
router.get('/', function(req, res, next) {
  function respond(message) {
    const twiml = new MessagingResponse();
    twiml.message(message);
    console.log(twiml.toString())
    res.writeHead(200, {'Content-Type': 'text/xml'});
    res.end(twiml.toString());
  }

  respond('respond with a resource')
  //res.send('respond with a resource');
});

module.exports = router;

var express = require('express');
var router = express.Router();
const cg = require('../../config')
const MessagingResponse = require('twilio').twiml.MessagingResponse;
const User = require('../../models/User')
const Medic = require('../../models/Medic')
const responseData = require('../../models/Responses.json');


/* GET users listing. */
router.get('/', function(req, res, next) {
  function respond(message) {
    const twiml = new MessagingResponse();
    twiml.message(message);
    console.log(twiml.toString())
    res.writeHead(200, {'Content-Type': 'text/xml'});
    res.end(twiml.toString());
  }
  User.findOne({phone: "+13016516027"}, function (err, user){
    let newMedic = new Medic({user: user.id,available: true})
    newMedic.save(function (err, createdMedic){
        if(err) return console.error(err);
        console.log("NEW MEDIC SUCCESSFULLY CREATED: " + createdMedic.id)
    });
  })
  respond(responseData.MEDIC[1])

})

module.exports = router;
var express = require('express');
var router = express.Router();
const cg = require('../../config')
const User = require('../../models/User')
const Medic = require('../../models/Medic')
const responseData = require('../../models/Responses.json');
const Request = require('../../models/Request');
const { Status } = require('../../models/Request');
const { Topic } = require('../../models/User');
const responder = require("../responder.js")


router.get('/', function(req, res, next) {
    //Helper function to send a response via Twilio API
    const respond = (message) => responder(res).respond(message)
    function newConversation(){
        let newUser = new User({phone: req.query.From,isMedic: true, topic: Topic.Medic})
        let newMedic = new Medic({user: newUser.id,available: true})
        newUser.save()
        newMedic.save(function (err, createdMedic){
            if(err) return console.error(err);
            console.log("NEW MEDIC SUCCESSFULLY CREATED: " + createdMedic.id)
        });
        respond(responseData.MEDIC[1])
    }


    console.log("From: " + req.query.User)
    console.log("Body: " + req.query.Body)
  
    if(req.query.Body.toUpperCase() == "SIGNUP"){
        newConversation()
    }else if(req.query.Body == "CHANGE"){
        User.findOne({phone: req.query.From},function (err,user){
            user.topic = Topic.Medic
            user.save()
        })
    }
})

module.exports = router;
var express = require('express');
var router = express.Router();
const cg = require('../../config')
const User = require('../../models/user-schema')
const Medic = require('../../models/medic-schema')
const responseData = require('../util/responses.json');
const Request = require('../../models/request-schema');
const { Status } = require('../../models/request-schema');
const { Topic } = require('../../models/user-schema');
const responder = require("../util/responder.js")
const util = require("../util/utilities.js")
const notifier = require("../util/notifier.js")
router.get('/', function(req, res, next) {
    //Helper function to send a response via Twilio API
    const respond = (message) => responder(req,res).respond(message)
    function newConversation(){
        //Check if user is already in db if not create and save them
        //have them confirm responsibilities
        //wait for response
        //in continue convo:
        //Create new medic
        //send them welcome message from other number

        util.saveDocument(findUser()).then(sendConfirmation())
    }

    function continueConversation(){
        if(req.query.body.toUpperCase() === "YES"){
            util.saveDocument(createMedic({user: req.query.User,available: true}))
            .then(medic => {
                respond(responseData.MEDIC[1])
                notifier.sendMedicNotification(req.query.From,responseData.SIGNUP[0].replace("%PLACEHOLDER%",medic.medID) + responseData.SIGNUP[1])
            })
        }else{
            respond(responseData.ERROR[7])
        }
    }

    function sendConfirmation(){
        respond(responseData.SIGNUP[0])
    }

    function createMedic(properties){
        return new Medic(properties)
    }

    function findUser(){
        User.findOne({phone: req.query.phone}).exec().then(function (user){
            //if there is no user create one
            if(!user){
                req.session.counter = 0
                return new User({phone: req.query.From,isMedic: false, topic: Topic.SignUp})
            }else{
                req.session.counter = 0
                user.topic = Topic.SignUp
                return user
            }
        })
    }



    if(req.query.isNew === "true"){ //strict equality
        console.log("New conversation started")
        newConversation()
    }else{
        continueConversation()
    }

/*
    console.log("From: " + req.query.User)
    console.log("Body: " + req.query.Body)
  
    if(req.query.Body.toUpperCase() == "SIGNUP"){
        newConversation()
    }else if(req.query.Body == "CHANGE"){
        User.findOne({phone: req.query.From},function (err,user){
            user.topic = Topic.Medic
            user.save()
        })
    }*/
})

module.exports = router;
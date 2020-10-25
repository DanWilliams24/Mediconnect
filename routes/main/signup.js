var express = require('express');
var router = express.Router();
const cg = require('../../config')
const User = require('../../models/user-schema')
const SignUpCode = require('../../models/signup-code-schema')
const Medic = require('../../models/medic-schema')
const responseData = require('../util/responses.json');
const Request = require('../../models/request-schema');
const { Status } = require('../../models/request-schema');
const { Topic } = require('../../models/user-schema');
const responder = require("../util/responder.js")
const util = require("../util/utilities.js")
const notifier = require("../util/notifier.js");
const { response } = require('../../app');
router.get('/', function(req, res, next) {
    //Helper function to send a response via Twilio API
    const respond = (message) => responder(req,res).respond(message)
    const requestBody = util.sanitize(req.query.Body)

    if(req.query.isNew === "true"){ //strict equality
        console.log("New conversation started")
        newConversation()
    }else{
        continueConversation()
    }

    function newConversation(){
        //Check if user is already in db if not create and save them
        //check for user provided signup code
        //if provided and matches active signup key in database
        //have them confirm responsibilities
        //wait for response
        //in continue convo:
        //Create new medic
        //send them welcome message from other number
        isAMedic().then(isMedic => {
            if(isMedic){
                respond(responseData.ERROR[10])
            }else{
                findUser().then(user => util.saveDocument(user)).then( () => askForCode())
            }
        })
        
    }

    function continueConversation(){
        isAMedic().then(isMedic => {
            if(isMedic){
                respond(responseData.ERROR[10])
            }else{
                switch(req.session.signup){
                    case 1://checking code provided by user
                        util.getValidCodes().then(codes => {
                            var codeFound = false
                            for(var codeDict in codes){
                                if(codeDict.code === requestBody.toUpperCase()){
                                    codeFound = true
                                }
                            } 
                            if(codeFound){
                                sendConfirmation()
                            }else{
                                respond(responseData.ERROR[3])
                            }
                        })
                        break;
                    case 2://checking responsibility acceptance from user
                        processAcceptance()
                        break;
                    default: respond(responseData.ERROR[4]) //should not occur unless there is issue with sessions
                }
                
            }
        })
        
    }
    function askForCode(){
        req.session.signup = 1
        respond(responseData.SIGNUP[3])
    }

    function sendConfirmation(){
        req.session.signup = 2
        respond(responseData.SIGNUP[2])
    }

    function createMedic(properties){
        return new Medic(properties)
    }

    function processAcceptance(){
        if(requestBody.toUpperCase() === "YES"){
            updateUser().then(user => util.saveDocument(user))
            .then((user) => util.saveDocument(createMedic({user: user.id,available: true})))
            .then(medic => {
                respond(responseData.MEDIC[1])
                notifier.sendMedicNotification(req.query.From,responseData.SIGNUP[0].replace("%PLACEHOLDER%",medic.medID) + " " +responseData.SIGNUP[1])
            })
        }else{
            respond(responseData.ERROR[7])
        }
    }
    function updateUser(){
        return new Promise((resolve,reject) => {
            User.findById(req.query.User).exec().then(function (user){
                user.isMedic = true
                user.Topic = req.session.pastTopic
                return resolve(user)
            })
        })
    }
    function isAMedic(){
        return new Promise((resolve,reject) => {
            User.findOne({phone: req.query.From}).exec().then(function (user){
                if(user){
                    Medic.findOne({user: user.id}).exec().then(function (medic){
                        if(medic){
                            resolve(true)
                        }else{
                            resolve(false)
                        }
                    }).catch(function (e){
                        console.log(e.stack)
                        resolve(false)
                    })
                }else{
                    resolve(false)
                }
            }).catch(function (e){
                console.log(e.stack)
                resolve(false)
            })  
        })
    }

    function findUser(){
        return new Promise((resolve,reject) => {
            User.findOne({phone: req.query.From}).exec().then(function (user){
                //if there is no user create one
                console.log(req.query.From)
                console.log(user)
                if(!user){
                    return resolve(new User({phone: req.query.From,isMedic: false, topic: Topic.SignUp}))
                }else{
                    req.session.pastTopic = user.Topic
                    user.topic = Topic.SignUp
                    return resolve(user)
                }
            }).catch(function (e){
                console.log(e.stack)
                reject(e)
            })
        })
        
    }
})

module.exports = router;
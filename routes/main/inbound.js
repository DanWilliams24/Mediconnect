var express = require('express');
var router = express.Router();
const cg = require('../../config')
const User = require('../../models/user-schema');
const { Topic } = require('../../models/user-schema');
const responseData = require('../util/responses.json');
const responder = require("../util/responder.js")
const ImpossibleError = require('../error/impossible-error')
const InvalidInputError = require('../error/invalid-input-error')
const QueryError = require('../error/query-error');
const statics = require('../util/statics');
const util = require("../util/utilities")
const Keyword = Object.freeze({
    HELP_ME: "HELP ME",
    SIGNUP: "SIGNUP",
    CHANGE: "CHANGE"
})


/* GET home page. */
router.get('/', function (req, res, next) {
  //Helper function to send a response via Twilio API
  const isFromMedicNumber = (req.query.To == cg.MedicNumber) && (cg.MedicNumber != cg.twilioNumber)
  const respond = (message) => responder(req,res).respond(message)
  const requestBody = util.sanitize(req.query.Body)
  var redirect;
  if(cg.useTestCredentials){
    redirect = (path,options) => responder(req,res).testredirect(path,options)
  }else{
    redirect = (path,options) => responder(req,res).redirect(path,options)
  }
  var phone = req.query.From; 
  var input = requestBody.toUpperCase();
  console.log(phone)
  console.log(input)
  // Potential way of handling two numbers
  if(isFromMedicNumber){
    checkUserTopic()
    return;
  }

  //First, check static endpoints
  const staticEndpointRes = statics.getMessage(input)
  if(staticEndpointRes !== undefined){
    respond(staticEndpointRes)
  }else{
    //Check input to see if it is a conversational keyword
    switch (input) {
      case Keyword.HELP_ME:
        console.log("New user with code - HELP ME")
        redirect("/inbound/help",{isNew: true});
        break;
      case Keyword.SIGNUP:
        console.log("New medic with code - SIGN ME UP")
        redirect("/inbound/signup", {isNew: true});
        break;
      default: 
        checkUserTopic()
        .catch(function (e) {
          if(e instanceof QueryError){
            //new phone number, number has never been logged. They also did not use a keyword. 
            // This may be an invalid request, send them back a list of valid keywords.
            respond(responseData.ERROR[0])
          }else if(e instanceof ImpossibleError){
            console.error("BIG PROBLEM:\n" + e)
          }else{
            console.log("UNKNOWN PROBLEM:\n" + e)
          }
          if(!res.headersSent){
            respond(responseData.ERROR[4])
          }
        }); //otherwise check mongo for phone and carry on conversation
    }
  }

  function checkUserTopic() {
    // Check if there are any responses for the current number in an incomplete survey response
    return new Promise((resolve,reject) => {
      User.findOne({phone: req.query.From}).exec().then(user => {
        if(!user) return reject(new QueryError("Query returned no documents"))
        
        //Potential way of handling two numbers
        if(user.isMedic && isFromMedicNumber){ //loose equality needed?
          return resolve(redirect("/inbound/medic", {From: user.id}))
        }//Other approach, have traffic from the medic number go straight to medic endpoint

        //existing phone number. Search existing data for state and redirect user. 
        switch(user.topic){
          case Topic.Help: 
            resolve(redirect("/inbound/help", {From: user.id}))
            break;
          case Topic.SignUp: 
            resolve(redirect("/inbound/signup", {From: user.id}))
            break;
          case Topic.Medic: 
            resolve(redirect("/inbound/medic", {From: user.id}))
            break;
          default: return reject(new ImpossibleError("This is an impossible case as user should always have a topic."))
        }
        
      }).catch(function (e) {
        reject(e)
      })
    })
    
  }
});

module.exports = router;
//module.exports = Keyword;

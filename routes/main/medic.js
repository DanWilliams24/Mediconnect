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


const Keyword = Object.freeze({
  CANCEL: "CANCEL",
  PAUSE: "PAUSE",
  RESUME: "RESUME",
  YES: "YES"
})

/* GET users listing. */
router.get('/', function(req, res, next) {
  //Helper function to send a response via Twilio API
  const respond = (message) => responder(res).respond(message)
  
  async function getOpenCases(){
    let openRequests = await Request.find({status: Status.Open})
    var openCases = ""
    for(var request of openRequests){
      openCases += request.reqID + ","
    }
    return openCases.slice(0,openCases.length-1)
  }


  function continueConversation(){
    var input = req.query.Body.toUpperCase()
    switch(input.toUpperCase()){
      case Keyword.CANCEL:
        //Send response to user
        
        //create brand new request?
        break;
      case Keyword.PAUSE: 
        Medic.findOne({phone: req.query.From}, function (error,medic){
          if(error) return console.error(err);
          medic.available = false
          medic.save(function (err, unavailableMedic){
            if(err) return console.error(err);
            console.log("Medic no longer online: " + medic.id)
            unavailableMedic.log();
            respond("")
          });
        });
        break;
      case Keyword.RESUME:
        Medic.findOne({phone: req.query.From}, function (error,medic){
          if(error) return console.error(err);
          medic.available = true
          medic.save(function (err, availableMedic){
            if(err) return console.error(err);
            console.log("Medic is now online: " + medic.id)
            availableMedic.log();
            respond("")
          });
        });
        break;
      case Keyword.YES:
        //Find relevant request
        Medic.findOne({phone: req.query.From}).populate("user").exec(function (err, medic){
          if(err) return console.error(err);
          if(medic.user.resID === 1){
            Request.findOne({medic:medic.id}).populate("user").exec(function (err, request){
              if(err) return console.error(err);
              if(request){
                //Medic accepted request
                respond(responseData.MEDIC[4])
                medic.available = false
                request.status = Status.Accepted
                medic.save();
                request.save();
                notifier.sendNotification(request.user.phone,responseData.HELP[3].replace("%PLACEHOLDER%","#" + medic.medID))
                Medic.find({available: true}).populate("user").exec(function (err, medics){
                  if(medics.length !== 0){
                    getOpenCases().then(async function (openCaseIds) {
                      var casesMessage = ""
                      if(openCaseIds.length > 0){
                        casesMessage = "There are no other cases currently open"
                      }else{
                        casesMessage = "These cases are still open: " + openCaseIds
                      }
                      for(var medic of medics){
                        const message = responseData.MEDIC[2].replace("%PLACEHOLDER%", request.reqID).replace("%OTHERPLACEHOLDER%",casesMessage)
                        notifier.sendNotification(medic.user.phone,message)
                      }
                    })
                  }
                })
              }else{
                //premature yes before medic has accepted a request
                respond(responseData.ERROR[3])
              }
            })
          }else{
            //Not a registered medic. I dont think this is possible. How did they get to this route.
            respond(responseData.ERROR[0])
          }
        })
        //Send 
        break;
      default:
        if(input.toUpperCase().includes("ACCEPT ")){
          //parse out the request id
          var parsedReqID = input.split(" ")[1]
          Request.findOne({reqID: Number.parseInt(parsedReqID)}, function (err, request){ //Ids will be padded
            if(err) return console.error(err);
            if(request){
              User.findOne({phone: req.query.From}, function (err, user){
                if(err) return console.error(err);
                Medic.findOne({user: user.id}, function (err, medic){
                  //to reduce cancelled calls,  bot asks for confirmation first
                  respond(responseData.MEDIC[3].replace("%PLACEHOLDER%",request.location))
                  request.medic = medic.id
                  user.resID = 1
                  medic.save(function (error,savedMedic){
                    if(err) return console.error(err);
                    console.log("Medic may be accepting a call")
                  })
                  user.save(function (error,savedUser){
                    if(err) return console.error(err);
                  })
                })
              })
            }else{
              //Could not parse the medic's response. Ask them to try again in the right format
              respond(responseData.ERROR[3])
            }
            
          })
        }
    }

  }
  /*
  console.log("From: " + req.query.From)
  console.log("Body: " + req.query.Body)
  
  if(req.query.isNew === "true"){ //strict equality
    console.log("New conversation started")
    newConversation()
  }else{
    continueConversation()
  }
  */
  
  continueConversation();
  

})

module.exports = router;
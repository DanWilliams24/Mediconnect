var express = require('express');
var router = express.Router();
const cg = require('../../config')
const MessagingResponse = require('twilio').twiml.MessagingResponse;
const User = require('../../models/User')
const Medic = require('../../models/Medic')
const responseData = require('../../models/Responses.json');
const Request = require('../../models/Request');
const { Status } = require('../../models/Request');


/* GET users listing. */
router.get('/', function(req, res, next) {
  function respond(message) {
    const twiml = new MessagingResponse();
    twiml.message(message);
    console.log(twiml.toString())
    res.writeHead(200, {'Content-Type': 'text/xml'});
    res.end(twiml.toString());
  }

  //THIS SHOULD NEVER RUN
  function newConversation(){
    User.findOne({phone: "+13016516027"}, function (err, user){
      let newMedic = new Medic({user: user.id,available: true})
      newMedic.save(function (err, createdMedic){
          if(err) return console.error(err);
          console.log("NEW MEDIC SUCCESSFULLY CREATED: " + createdMedic.id)
      });
    })
    respond(responseData.MEDIC[1])
  }


  function continueConversation(){
    var input = req.query.Body
    switch(input.toUpperCase()){
      case "CANCEL":
        //Send response to user
        //create brand new request?
        break;
      case "PAUSE": 
        Medic.findOne({phone: req.query.From}, function (error,medic){
          if(medic){
            medic.available = false
            medic.save(function (err, unavailableMedic){
              if(err) return console.error(err);
              console.log("Medic no longer online: " + medic.id)
              unavailableMedic.log();
            });
          }else{
            //What should be done on this case
          }
        })
        break;
      case "RESUME":
        break;
      default:
        if(input.toUpperCase().includes("ACCEPT ")){
          //parse out the request id
          var parsedReqID = input.split(" ")[1]
          Request.findOne({reqID: Number.parseInt(parsedReqID)}, function (err, request){ //Ids will be padded
            if(request){
              Medic.findOne({phone: req.query.From}, function (error,medic){
                if(err) return console.error(err);
                //to reduce cancelled calls, should bot ask for confirmation first?
                request.medic = medic.id
                request.status = Status.Accepted
                respond(responseData.MEDIC[2])
                //Remove all upcoming notifications from Cron by searching both blocks
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
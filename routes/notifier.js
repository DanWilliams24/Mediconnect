const json = require("./blocks.json")
const cg = require('../config.js')
const twilio = require('twilio')(cg.accountSid, cg.authToken);

module.exports = {
    sendNotification(target,message){
        console.log("Message Dispatched to: " + target + "\nMessage: " + message);
        /*
        twilio.messages.create({
            body: message,
            from: cg.twilioNumber,
            to: target
        }).then( (sentMessage) => {
            console.log("Message Dispatched to: " + target + "\nSID: " + sentMessage.sid);
        }).catch((error) => {
            console.error("Something bad happened:", error.toString())
        })*/
    }
}
//Curried Function!!!
const MessagingResponse = require('twilio').twiml.MessagingResponse;
const url = require('url')
const GsmCharsetUtils = require('@trt2/gsm-charset-utils');
const utilities = require('./utilities');
const notifier = require('./notifier');
const config = require('../../config')
module.exports = function (req,res) {
    return {
        //Packages outgoing message as a twiml xml response and sends the data to twilio 
        //const respond = (message) => helper(res).respond(message)
        respond(message) {
            let gsmTextMessage = GsmCharsetUtils.getCharCount(message)
            const twiml = new MessagingResponse();
            if(gsmTextMessage.msgCount >= 3 && !config.useTestCredentials){
                let messageParts = utilities.splitMessage(message)
                twiml.message(messageParts[0]);
                console.log(twiml.toString())
                res.writeHead(200, {'Content-Type': 'text/xml'});
                res.end(twiml.toString());
                res.on('end', () => {
                    if(req.query.To == config.MedicNumber){
                        notifier.sendMedicNotification(req.query.From,messageParts[1])
                    }else{
                        notifier.sendNotification(req.query.From,messageParts[1])
                    }
                })
            }else{
                if(message){
                    twiml.message(message);
                }
                console.log(twiml.toString())
                res.writeHead(200, {'Content-Type': 'text/xml'});
                res.end(twiml.toString());
            }
            
            
        },
        //Redirects to other pages while preserving important data ()
        //Options: If starting a new convo, supply only true to isNew. Otherwise, supply user id to from field 
        redirect(pathname, options){
            //console.log("Req Query: " + req.body)
            const redirectQuery = {
            "User": options.From || req.query.From, 
            "isNew": options.isNew || false 
            }
            res.redirect(url.format({pathname: pathname,query: redirectQuery}))
        },

        //Used for testing route logic without using Twilio
        testredirect(pathname, options){
            //console.log("Req Query: " + req.body)
            const redirectQuery = {
            "From": req.query.From,
            "User": options.From || req.query.From,
            "Body": options.Body || req.query.Body, 
            "isNew": options.isNew || false 
            }
            res.redirect(url.format({pathname: pathname,query: redirectQuery}))
        },

    }
}


//Curried Function!!!
const MessagingResponse = require('twilio').twiml.MessagingResponse;

module.exports = function (res) {
    return {
        //Redirects to other pages while preserving important data 
        respond(message) {
            const twiml = new MessagingResponse();
            twiml.message(message);
            console.log(twiml.toString())
            res.writeHead(200, {'Content-Type': 'text/xml'});
            res.end(twiml.toString());
        }
    }
}

//const respond = (message) => helper(res).respond(message)
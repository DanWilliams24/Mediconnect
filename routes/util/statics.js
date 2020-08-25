const responseData = require('./responses.json');

module.exports = {
    getMessage(key) {
        var statics = {
            SUPPLY: responseData.SUPPLY[0],
            COVID:responseData.COVID[0],
            BEFORE: responseData.BEFORE[0],
            AFTER: responseData.AFTER[0]
        }
        var message = statics[key.toUpperCase()]
        if(message === undefined){
            return undefined
        }else{
            return message
        }
    }
}
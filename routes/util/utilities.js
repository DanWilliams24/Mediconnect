
const cg = require('../../config.js')
const GsmCharsetUtils = require('@trt2/gsm-charset-utils');
module.exports = {
    saveDocument(doc){
        return new Promise((resolve,reject) =>{
          //Push to DB. 
          doc.save(function (err, createdDoc){
            if(err) return reject(err)
            resolve(createdDoc)
          });
        })
    },

    saveAllDocuments(docs){
      return new Promise((resolve, reject) => {
        try {
          for(doc of docs){
            doc.save()
          }

          return resolve()
        }catch(e){
          return reject(new Error("Problem occurred during document saving process."))
        }
      })
    },

    //Sanitize input direct from user that isnt a keyword. This strips input of common xml characters that
    //arent detrimental to interpreting the string. It also ensures the string GSM-7 encoding compliant. 
    sanitize (str) {
      if(!str) {
        return str;
      }
      return GsmCharsetUtils.removeNonGsmChars(str.replace( '<', '').replace( '>', ''));
    }
}
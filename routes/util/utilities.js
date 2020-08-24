
const cg = require('../../config.js')
const twilio = require('twilio')(cg.accountSid, cg.authToken);

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
    }
}
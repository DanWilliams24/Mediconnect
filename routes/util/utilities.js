
const cg = require('../../config.js')
const GsmCharsetUtils = require('@trt2/gsm-charset-utils');
const Request = require('../../models/request-schema.js');
const { Status } = require('../../models/request-schema'); 
function saveDocument(doc){
  return new Promise((resolve,reject) =>{
    //Push to DB. 
    doc.save(function (err, createdDoc){
      if(err) return reject(err)
      resolve(createdDoc)
    });
  })
}

function saveAllDocuments(docs){
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
function getOpenCases() {
  return new Promise((resolve, reject) => {
    Request.find({status: Status.Open}).exec().then(function (openRequests) {
      var openCases = ""
      for (var request of openRequests) {
        openCases += request.reqID + ","
      }
      return resolve(openCases.slice(0, openCases.length - 1))
    }).catch(function (e) {
      //Problem occurred while finding open cases.
      reject(new QueryError(e))
    })
  })
}

function createOpenCaseMessage(){
  return new Promise((resolve,reject) => {
    getOpenCases().then( function (openCaseIds) {
      var casesMessage = ""
      if (openCaseIds.length == 0) {
        casesMessage = "There are no other cases currently open."
      } else {
        casesMessage = "These cases are still open: " + openCaseIds + "."
      }
      return resolve(casesMessage)
    }).catch(function (e){
      return reject(e);
    })
  })
}

//Sanitize input direct from user that isnt a keyword. This strips input of common xml characters that
//arent detrimental to interpreting the string. It also ensures the string GSM-7 encoding compliant. 
function sanitize (str) {
  if(!str) {
    return str;
  }
  return GsmCharsetUtils.removeNonGsmChars(str.replace( '<', '').replace( '>', ''));
}

module.exports = {
  saveDocument,
  saveAllDocuments,
  getOpenCases,
  createOpenCaseMessage,
  sanitize
}
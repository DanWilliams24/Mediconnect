
const cg = require('../../config.js')
const GsmCharsetUtils = require('@trt2/gsm-charset-utils');
const Request = require('../../models/request-schema.js');
const { Status } = require('../../models/request-schema'); 
const Medic = require('../../models/medic-schema.js');
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

      return resolve(docs)
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
async function getValidCodes(){
  return new Promise((resolve,reject) => {
      SignUpCode.find({active: true}).exec().then(function (codes) {
          return resolve(codes)
      })
  }).catch(function (e){
      console.log(e.stack)
      return resolve([])
  })
}

function getAvailableMedics(){
  //checks for medic available (takes into account whether medic has a valid signup code)
  return new Promise((resolve,reject) => {
    var availabeMedics = [] 
    Medic.find({available: true}).populate("user").exec().then(function (medics){
      
      //iterate through all "available" medics, 
      for (let i = 0; i < medics.length; i++) {
        let codes = await getValidCodes()
        var codeFound = false
        // iterate through all signup codes, find whether a medic has a valid signup code
        for(let j = 0; j < codes.length; i++){
          //compare medic document signup code to SignupCode doc code
          if(medics[i].signupCode == codes[j].code){
            codeFound = true
          }
        }
        if(codeFound){
          availabeMedics.push(medics[i])
        }
      }
    }).then(() =>{
      return resolve(availabeMedics)
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

function splitMessage(message){
  let sentenceParts = message.match(/[\w|\)][.?!](\s|$)/g)
  let sentenceCount = message.match(/[\w|\)][.?!](\s|$)/g).length
  //console.log(sentenceParts)
  let breakpoint = Math.ceil(sentenceCount/2)-1
  let partA = message.substring(0,message.indexOf(sentenceParts[breakpoint])+2)
  let partB = message.substring(message.indexOf(sentenceParts[breakpoint])+2,message.length)
  return [partA,partB]
} 

module.exports = {
  saveDocument,
  saveAllDocuments,
  getOpenCases,
  createOpenCaseMessage,
  getAvailableMedics,
  sanitize,
  splitMessage
}

const assert = require('assert');
const GsmCharsetUtils = require('@trt2/gsm-charset-utils');
const fs = require('fs')

let rawdata = fs.readFileSync('./routes/util/responses.json');
let responses = JSON.parse(rawdata);

describe("Encoding is GSM", () => {
    /*
    for(let group in responses){
        for(let res in responses[group]){
            const text = responses[group][res]
            let charCount = GsmCharsetUtils.getCharCount(text);
            if(charCount.encoding == "UCS2"){
                console.log("\t" + GsmCharsetUtils.removeNonGsmChars(text))
                responses[group][res] = GsmCharsetUtils.removeNonGsmChars(text)
                var recreated = ""
                for(let letter in text){
                    if(!GsmCharsetUtils.isGsmChar(text[letter])){
                        recreated += "$"
                    }else{
                        recreated += text[letter]
                    }
                }
                console.log("================================Breakdown=================================")
                console.log(recreated)
                console.log("================================DONE=================================")
            }
        }
    }
    let data = JSON.stringify(responses, null, 2);
    fs.writeFileSync("./routes/util/responses.json",data)
    */
    for(let group in responses){
        for(let res in responses[group]){
            const text = responses[group][res]
            let charCount = GsmCharsetUtils.getCharCount(text);
            it(group + ": " + text.substring(0,20) + "... should return as GSM", () =>{
                
                assert.equal(charCount.encoding, "GSM")
            })
            it("Should be less than 3 message segments", () => {
                assert(charCount.msgCount < 3)
            })
            it("Should be less than 600 characters", () => {
                assert(charCount.charCount < 600)
            })
        }
    }

    
    
})

const mongoose = require('mongoose')


const CodeSchema = new mongoose.Schema({
    code: {type: String, required: true},
    active: {type: Boolean, default: true}
})


const Passcode = new mongoose.model('Signup Code',CodeSchema)
module.exports = Passcode;
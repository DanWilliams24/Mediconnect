const mongoose = require('mongoose');


const UserSchema = new mongoose.Schema({
    phone:{type: String, required: true},
    isMedic: Boolean,
    topic: {
        type: String,
        enum: ['HELP','SIGNUP','MEDIC'],
        default: ''
    },
    resID: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Response' }
})

const User = mongoose.model('User', UserSchema);
module.exports = User;

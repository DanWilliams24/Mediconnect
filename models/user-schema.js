const mongoose = require('mongoose');

const Topic = Object.freeze({
    Help: "HELP", //Manages 'HELP' Request creation
    SignUp:"SIGNUP", //Manages signup for medic
    Medic: "MEDIC", //Manages acceptance of requests by medics
})

//The user collection stores all who interact with the chatbot via phone
//Phone field is the primary key
//This allows the chatbot to identify users when they reply in order to respond correctly back to them
const UserSchema = new mongoose.Schema({
    phone:{type: String, required: true},
    isMedic: Boolean, // this field may be unneccessary
    topic: {
        type: String,
        enum: Object.values(Topic),
        default: '' //Yes this will crash. ALWAYS SUPPLY A TOPIC!!!
    },
    resID: {
        type: Number,
        default: 0
    }

})
UserSchema.methods.log = function(){
    const data = "Phone Number: " + this.phone
    + "\nIs a Medic?: " + this.isMedic 
    + "\nConversation Topic: " + this.topic 
    + "\nLast Response ID: " + this.resID;
    console.log(data)

}
Object.assign(UserSchema.statics,{Topic});
const User = mongoose.model('User', UserSchema);
module.exports = User;

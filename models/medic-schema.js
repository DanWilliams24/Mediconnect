const mongoose = require('mongoose');
const autoIncrement = require('mongoose-auto-increment');
const MedicSchema = new mongoose.Schema({
    user:{ //identifies user that is a medic
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    available: Boolean,
    unsubscribed: [{ //This field contains a list of requests to exclude from users feed
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Request'
    }],
    medID: Number,
    signupCode: String //This is the code the medic used to signup

})
autoIncrement.initialize(mongoose.connection);
MedicSchema.plugin(autoIncrement.plugin, {
    model: "Medic",
    field: "medID",
    startAt: 1000,
    incrementBy: 1
});
MedicSchema.methods.log = function(){
    const data = 
     "========================================"
    + "\nUser: " + this.user
    + "\nMedic ID: " + this.medID
    + "\nAvailable: " + this.available
    + "\nMade At: " + this.madeAt
    + "========================================"
    console.log(data)
}

const Medic = mongoose.model('Medic', MedicSchema);
module.exports = Medic;

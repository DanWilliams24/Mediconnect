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
    + "\nNext Notification: " + this.nextNotification
    + "\nNotification Count: " + this.notificationCount
    + "\nStatus: " + this.status.toUpperCase()
    + "========================================"
    console.log(data)
}

const Medic = mongoose.model('Medic', MedicSchema);
module.exports = Medic;

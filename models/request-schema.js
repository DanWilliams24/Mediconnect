const mongoose = require('mongoose');
const autoIncrement = require('mongoose-auto-increment');
const Status = Object.freeze({
    Incomplete: "incomplete",
    Open: "open",
    Accepted: "accepted",
    Fulfilled: "fulfilled",
    Unfulfilled: "unfulfilled"
  });

const RequestSchema = new mongoose.Schema({
    user: {type: mongoose.Types.ObjectId, ref: 'User'},

    location: String,
    medic: {
        type: mongoose.Types.ObjectId,
        ref: 'Medic'
    },
    reqID: Number,
    madeAt: String,
    notificationCount: {type: Number, default: 0},
    nextNotification: String,
    status: {
        type: String,
        enum: Object.values(Status),
        default: Status.Incomplete
    }
})
autoIncrement.initialize(mongoose.connection);
RequestSchema.plugin(autoIncrement.plugin, {
    model: "Request",
    field: "reqID",
    startAt: 1000,
    incrementBy: 1
});

Object.assign(RequestSchema.statics,{Status});
RequestSchema.methods.log = function(){
    const data = 
     "========================================"
    + "\nUser: " + this.user
    + "\nMedic: " + this.isMedic || "No medic assigned"
    + "\nLocation: " + this.location || "No location provided"
    + "\nMade At: " + this.madeAt
    + "\nNext Notification: " + this.nextNotification
    + "\nNotification Count: " + this.notificationCount
    + "\nStatus: " + this.status.toUpperCase()
    + "========================================"
    console.log(data)

}

const Request = mongoose.model('Request', RequestSchema);
module.exports = Request;

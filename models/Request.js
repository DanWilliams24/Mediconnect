const mongoose = require('mongoose');

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
    madeAt: String,
    notificationCount: {type: Number, default: 0},
    nextNotification: String,
    status: {
        type: String,
        enum: Object.values(Status),
        default: Status.Incomplete
    }
})

Object.assign(RequestSchema.statics,{Status});

const Request = mongoose.model('Request', RequestSchema);
module.exports = Request;

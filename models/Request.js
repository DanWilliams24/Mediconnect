const mongoose = require('mongoose');

const Statuses = Object.freeze({
    Status: {
        Open: "open",
        Accepted: "accepted",
        Fulfilled: "fulfilled",
        Unfulfilled: "unfulfilled"
    }
  });

const RequestSchema = new mongoose.Schema({
    phone: {type: String, required: true},

    location: String,
    medic: {
        type: mongoose.Types.ObjectId,
        ref: 'Medic'
    },
    madeAt: Date,
    notificationCount: Number,
    nextNotification: Date,
    status: {
        type: String,
        enum: Object.values(Statuses["Status"]),
        default: Statuses.Status.Open
    },
    complete: {
        type:Boolean,
        default: false
    }
})

Object.assign(RequestSchema.statics,{Statuses});

const Request = mongoose.model('Request', RequestSchema);
module.exports = Request;

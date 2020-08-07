const mongoose = require('mongoose');

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
        enum: ['open','accepted','fulfilled','unfulfilled'],
        default: 'open'
    },
    complete: {
        type:Boolean,
        default: false
    }
})

const Request = mongoose.model('Request', RequestSchema);
module.exports = Request;

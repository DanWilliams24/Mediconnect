const mongoose = require('mongoose');

const RequestSchema = new mongoose.Schema({
    _id: Number,
    phone: String,
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
        enum: ['open','accepted','fufilled','unfufilled'],
        default: 'open'
    }
})

const Request = mongoose.model('Request', RequestSchema)
modules.exports = Request;

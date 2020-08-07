const mongoose = require('mongoose');


const MedicSchema = new mongoose.Schema({
    phone:{type: String, required: true},
    available: Boolean,
    unsubscribed: [{ //This field contains a list of requests to exclude from users feed
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Request'
    }],
    resID: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Response' }
})

const Medic = mongoose.model('Medic', MedicSchema);
module.exports = Medic;

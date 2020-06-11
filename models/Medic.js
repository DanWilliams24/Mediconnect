const mongoose = require('mongoose');


const MedicSchema = new mongoose.Schema({
    _id: Number,
    phone:String,
    available: Boolean,
    unsubscribed: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Request'
    }]
})

const Medic = mongoose.model('Medic', MedicSchema);
module.exports = Medic;

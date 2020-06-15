const mongoose = require('mongoose');


const MedicSchema = new mongoose.Schema({
    phone:{type: String, required: true},
    available: Boolean,
    unsubscribed: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Request'
    }],
    progress: Number,
    complete: {
        type:Boolean,
        default: false
    }

})

const Medic = mongoose.model('Medic', MedicSchema);
module.exports = Medic;

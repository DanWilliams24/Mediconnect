const mongoose = require('mongoose');

//UNDER DECONSTRUCTION: RESPONSE COLLECTION MOVING TO LOCAL STORAGE AS JSON FILE
const ResponseSchema = new mongoose.Schema({
    resID: Number,
    description: String

})

const Response = mongoose.model('Response', ResponseSchema);
module.exports = Response;

const mongoose = require('mongoose');


const ResponseSchema = new mongoose.Schema({
    resID: Number,
    description: String

})

const Response = mongoose.model('Response', ResponseSchema);
module.exports = Response;

const mongoose = require('mongoose')

const RequestSurveySchema = new mongoose.Schema({
    phone: String,
    phone: {type: String, required: true},
    location: String,
})


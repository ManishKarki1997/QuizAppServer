const mongoose = require('mongoose');
const random = require('mongoose-simple-random');


const QuestionModel = mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    answer: {
        type: String,
        required: true
    },
    options: [{
        type: String,
        required: true
    }],
    createdAt: {
        type: Date,
        default: Date.now
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    categoryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Category"
    },
})

QuestionModel.plugin(random);

module.exports = mongoose.model('Question', QuestionModel);
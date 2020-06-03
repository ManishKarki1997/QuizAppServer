const mongoose = require('mongoose');
const CategoryModel = mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    questions: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Question"
    }],
    users: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }]

})

module.exports = mongoose.model('Category', CategoryModel);
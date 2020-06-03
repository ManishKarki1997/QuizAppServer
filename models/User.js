const mongoose = require('mongoose');

const UserModel = mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    avatar: {
        type: String,
        required: true
    },
    totalMatches: {
        type: Number,
        default: 0
    },
    totalWins: {
        type: Number,
        default: 0
    },
    totalLosses: {
        type: Number,
        default: 0
    },
    friends: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }],
    favouriteCategories: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category'
    }],
    createdQuestions: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Question"
    }]
})

module.exports = mongoose.model('User', UserModel);
const express = require("express");
const Router = express.Router();

// Import helpers
const fetchRandomQQuestions = require('../helpers/fetchRandomQuestions');

// Import middlewares
const verifyToken = require('../middlewares/verifyToken');

// Import Models
const { UserModel, CategoryModel, QuestionModel } = require('../models');


// Add a question
Router.post("/", verifyToken, async (req, res) => {

    try {
        const { title, answer, options, createdBy, categoryId } = req.body;
        if(!options.includes(answer)){
            return res.send({
                error:true,
                message:"The question options does not contain the answer. Please recheck and submit the question later."
            })
        }
        const question = new QuestionModel({
            title: title.trim(),
            answer,
            options,
            createdBy,
            categoryId
        })

        const savedQuestion = await question.save();

        // user details
        const user = await UserModel.findById(createdBy);

        // category details
        const categoryDetails = await CategoryModel.findById(categoryId);
        // save the question in the respective category
        categoryDetails.questions.push(savedQuestion._id);
        await categoryDetails.save();

        // save the question in the users' created questions array
        user.createdQuestions.push(savedQuestion._id);
        await user.save();

        return res.send({
            error: false,
            message: "Successfully added the question in the database",
            payload: { question: savedQuestion }
        })

    } catch (error) {
        console.log(error);
        return res.send({
            error: true,
            message: "Something went wrong while adding the question.",
            payload: error
        })
    }

})

// Random questions
Router.get('/random', verifyToken, async (req, res) => {
    try {
        QuestionModel.findRandom({ categoryId: '5ed7ddf90161e65078a89f08' }, {}, { limit: 10 }, function (err, results) {
            if (err) {
                return {
                    error: true,
                    message: "Something went wrong.",
                    payload: err
                }
            }

            return res.send({
                error: false,
                payload: { questions: results }
            })
        });

    } catch (error) {
        console.log(error)
        return res.send({
            error: true,
            message: "Something went wrong",
            payload: error
        })
    }

})

module.exports = Router;
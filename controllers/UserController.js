const express = require("express");
const Router = express.Router();
const JWToken = require('jsonwebtoken');
require('dotenv').config();


// Import Models
const { UserModel, CategoryModel, QuestionModel } = require('../models');

// User signup
Router.post('/', async (req, res) => {

    try {
        const { name, email, avatar } = req.body;

        const existingUser = await UserModel.findOne({ email });
        // if the email already exists in the database, return the existing user
        if (existingUser) {
            const jwtToken = JWToken.sign({ email }, process.env.JWT_SECRET_KEY);
            return res.send({
                error: false,
                message: "Login Successful",
                payload: { user: existingUser, token: jwtToken }
            })
        }

        const user = UserModel({
            name,
            email,
            avatar
        });

        const savedUser = await user.save();

        // Create json web token
        const jwtToken = JWToken.sign({ email }, process.env.JWT_SECRET_KEY);

        return res.send({
            error: false,
            message: "Signed up successfully",
            payload: {
                user: savedUser,
                token: jwtToken
            }
        })

    } catch (error) {
        console.log(error)
        return res.send({
            error: true,
            message: "Something went wrong while signing up.",
            payload: error
        })
    }
})

module.exports = Router;
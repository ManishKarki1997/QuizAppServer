const express = require("express");
const Router = express.Router();

// Import middlewares
const verifyToken = require('../middlewares/verifyToken');

// Import Models
const { UserModel, CategoryModel, QuestionModel } = require('../models');

// Create a category
Router.post('/', verifyToken, async (req, res) => {
    try {
        const { name, createdBy } = req.body;

        // check for existing category name
        const existingCategory = await CategoryModel.findOne({ name });

        if (existingCategory) {
            return res.send({
                error: true,
                message: "Category with that name already exists.",
                error
            })
        }

        const category = new CategoryModel({
            name,
            createdBy
        })

        const savedCategory = await category.save();

        return res.send({
            error: false,
            message: "Category successfully created",
            payload: { category: savedCategory }
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

module.exports = Router;
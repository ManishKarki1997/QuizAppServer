const { QuestionModel } = require("../models");


const fetchRandomQuestions = async (categoryId, noOfQuestions) => {
    // return QuestionModel.findRandom({ cateogoryId }, {}, { limit: noOfQuestions });
    // 'categoryId':'5ed7ddf90161e65078a89f08'
    return QuestionModel.findRandom({}, {}, { limit: noOfQuestions }, function (err, results) {
        if (err) {
            return {
                error: true,
                message: "Something went wrong.",
                payload: err
            }
        }
        // console.log(results)
        return results;
    });
}


module.exports = fetchRandomQuestions;
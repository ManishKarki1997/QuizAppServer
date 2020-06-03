const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const socket = require('socket.io');

const PORT = process.env.PORT || 4000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/quizapp';

const { userSockets } = require('./socket/userSocket');

const app = express();
const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
})

const io = socket(server);
userSockets(io);

app.use(bodyParser.urlencoded({
    extended: false
}))
app.use(bodyParser.json());
app.use(cors());


// Import controllers
const { QuestionController, UserController, CategoryController } = require('./controllers');

app.use("/api/user", UserController);
app.use("/api/question", QuestionController);
app.use('/api/category', CategoryController);

mongoose.set('useFindAndModify', false);
mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log('Mongodb Connected')
}).catch(err => console.log('error ', err))


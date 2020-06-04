const { QuestionModel } = require('../models');
const { v4: uuidv4 } = require('uuid');

let users = []; // holds all online users in a class
let allActiveUsers = {}; // holds all the online users
const gameCountdown = 1
const answerCountdown = 15;
let gameRooms = {}

const userSockets = (io) => {

    io.on('connection', (socket) => {

        // io.clients((error, clients) => {
        //     if (error) throw error;
        //     clients.forEach(client => {
        //         console.log(client + ' is connedted? ' + io.sockets.connected[client].id);
        //     })
        // });

        // helper function to emit all online users
        const emitAllUsers = () => {
            io.emit("EMIT_ONLINE_USERS", allActiveUsers);
        }

        // when new client connects, emit all active users
        emitAllUsers();

        // emit the user their current socket id
        socket.emit("MY_SOCKET_ID", socket.id);

        // when the user first loads the page,
        // add the user socket id to the active online users
        // with the socket id as key and the user details as values
        socket.on("SUBMIT_USER_DETAILS", (data) => {
            allActiveUsers[socket.id] = {
                ...data,
                socketId: socket.id,
                // socketFunction: socket.join
            }
            // socket.to(socket.id).emit('YOUR_DETAILS', allActiveUsers[socket.id]);
            emitAllUsers();
        })

        socket.on("START_GAME", (data) => {
            const roomName = uuidv4();
            const { challenger, opponent } = data;

            // join both user sockets to the room
            if (io.sockets.connected[challenger.socketId])
                io.sockets.connected[challenger.socketId].join(roomName);

            if (io.sockets.connected[opponent.socketId])
                io.sockets.connected[opponent.socketId].join(roomName);



            // send the two users' details to each other
            // on the client side, they'll figure out who their opponent is
            // socket.emit("OPPONENT_DETAILS", [
            //     challenger,
            //     opponent,
            //     roomName
            // ])


            io.to(roomName).emit("OPPONENT_DETAILS", [
                challenger,
                opponent,
                roomName
            ]);

            // emit the game starting countdown
            // socket.emit('GAME_IN_SECONDS', gameCountdown)
            io.to(roomName).emit('GAME_IN_SECONDS', gameCountdown)

            // after the countdown, emit the game questions
            setTimeout(() => {
                QuestionModel.findRandom({ categoryId: '5ed7ddf90161e65078a89f08' }, {}, { limit: 10, populate: 'categoryId' }, function (err, results) {


                    io.to(roomName).emit("GAME_QUESTIONS", results);

                    // setup a room for the players. one room has two players only
                    gameRooms[roomName] = {
                        challenger: {
                            points: 0,
                            ...challenger,
                            answerPattern: [],
                            lastAnswerCorrect: false,
                            answerCountdown
                        },
                        opponent: {
                            points: 0,
                            ...opponent,
                            answerPattern: [],
                            lastAnswerCorrect: false,
                            answerCountdown
                        },
                        questionIndex: 0,
                        gameQuestions: results,
                        miscDetails: {
                            gameDraw: false,
                            gameWonBy: '',
                            questionIndex: 0,
                            gameOver: false,
                        }
                    }

                });

            }, gameCountdown * 1000);

        })

        // Game Manager
        socket.on("GAME_MANAGER", (data) => {
            const { answerer, questionIndex, roomName, answer } = data;


            if (gameRooms[roomName].gameQuestions[questionIndex].answer === answer) {
                if (gameRooms[roomName].challenger.socketId === answerer.socketId) {
                    gameRooms[roomName].challenger.points++;
                    gameRooms[roomName].challenger.lastAnswerCorrect = true;
                    gameRooms[roomName].challenger.answerPattern.push("W");

                }
                else {
                    gameRooms[roomName].opponent.points++;
                    gameRooms[roomName].opponent.lastAnswerCorrect = true;
                    gameRooms[roomName].opponent.answerPattern.push("W");
                }
                // gameRooms[roomName].
            } else {
                if (gameRooms[roomName].challenger.socketId === answerer.socketId) {
                    gameRooms[roomName].challenger.lastAnswerCorrect = false;
                    gameRooms[roomName].challenger.answerPattern.push("L");
                } else {
                    gameRooms[roomName].opponent.lastAnswerCorrect = false;
                    gameRooms[roomName].opponent.answerPattern.push("L");
                }
            }

            // send the gameroom status to the players 
            // console.log(io.sockets.adapter.rooms[roomName])
            // socket.emit("ANSWER_RESULT", gameRooms[roomName]);
            io.to(roomName).emit("ANSWER_RESULT", gameRooms[roomName]);

            // increment the gameroom question to next question
            gameRooms[roomName].questionIndex++;

        })

        // when the socket disconnects, delete the socket id from allActiveUsers 
        // and emit the online users event to update on the client side
        socket.on('disconnect', () => {
            delete allActiveUsers[socket.id];
            emitAllUsers();
        })

    })
}

module.exports = { userSockets };
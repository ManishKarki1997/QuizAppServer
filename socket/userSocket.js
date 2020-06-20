const { QuestionModel } = require("../models");
const { v4: uuidv4 } = require("uuid");

let users = []; // holds all online users in a class
let allActiveUsers = {}; // holds all the online users
const gameCountdown = 3;
const answerCountdown = 15;
const gameQuestionsCount = 15;
let gameRooms = {};

const setRoomQuestions = (roomName, categoryId, numOfQuestions, io) => {
  // QuestionModel.findRandom({ categoryId: questionCategoryId }, {}, { limit: numOfQuestions, populate: 'categoryId' }, function (err, results) {
  QuestionModel.findRandom(
    { categoryId },
    {},
    { limit: numOfQuestions, populate: "categoryId" },
    function (err, results) {
      if (err) {
        console.log(error);
      }

      gameRooms[roomName].miscDetails.totalQuestions = results.length;
      gameRooms[roomName].gameQuestions = results;
      // emit the game starting countdown
      // also the miscellaneous game room details needed in client side like total questions length
      io.to(roomName).emit("GAME_IN_SECONDS", {
        gameCountdown,
        miscDetails: gameRooms[roomName].miscDetails,
      });
    }
  );
};

const userSockets = (io) => {
  io.on("connection", (socket) => {
    // helper function to emit all online users
    const emitAllUsers = () => {
      io.emit("EMIT_ONLINE_USERS", allActiveUsers);
    };

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
      };
      // socket.to(socket.id).emit('YOUR_DETAILS', allActiveUsers[socket.id]);
      emitAllUsers();
    });

    // handle user challenges
    socket.on("CHALLENGE_USER", (data) => {
      socket
        .to(data.challengedTo.socketId)
        .emit("SOMEONE_CHALLENGED_YOU", data);
    });

    // handle challenge response
    socket.on("CHALLENGE_RESPONSE", (data) => {
      const { type, challengedBy, challengedTo } = data;
      socket.to(challengedBy.socketId).emit("CHALLENGE_RESPONSE", data);
    });

    // prepare to start the game
    socket.on("START_GAME", (data) => {
      const roomName = uuidv4();
      const { challenger, opponent } = data;
      const { randomCategory, categoryId } = data.gameOptions;

      // join both user sockets to the room
      if (io.sockets.connected[challenger.socketId])
        io.sockets.connected[challenger.socketId].join(roomName);

      if (io.sockets.connected[opponent.socketId])
        io.sockets.connected[opponent.socketId].join(roomName);

      io.to(roomName).emit("OPPONENT_DETAILS", [
        challenger,
        opponent,
        roomName,
      ]);

      // setup a room for the players. one room has two players only
      gameRooms[roomName] = {
        challenger: {
          points: 0,
          ...challenger,
          answerPattern: [],
          lastAnswerCorrect: false,
          answerCountdown,
        },
        opponent: {
          points: 0,
          ...opponent,
          answerPattern: [],
          lastAnswerCorrect: false,
          answerCountdown,
        },
        // questionIndex: 0,
        gameQuestions: null,
        miscDetails: {
          gameDraw: false,
          gameWonBy: null,
          totalQuestions: "",
          questionIndex: {
            index: 0,
            answeredByCount: 0,
          },
          gameOver: false,
          answerCountdown: answerCountdown,
        },
      };

      // set room questions
      setRoomQuestions(roomName, categoryId, gameQuestionsCount, io);

      setTimeout(() => {
        sendQuestionsToRoom(
          roomName,
          gameRooms[roomName].gameQuestions[
            gameRooms[roomName].miscDetails.questionIndex.index
          ]
        );
      }, gameCountdown * 500);
    });

    // function to send questions to a room
    function sendQuestionsToRoom(roomName, data) {
      io.to(roomName).emit("GAME_QUESTIONS", data);
    }

    function handleGameOver(roomName) {
      // console.log(gameRooms[roomName].gameQuestions.length, gameRooms[roomName].miscDetails.questionIndex.index);

      if (
        gameRooms[roomName].challenger.points ===
        gameRooms[roomName].opponent.points
      ) {
        gameRooms[roomName].miscDetails.gameDraw = true;
      } else {
        if (
          gameRooms[roomName].challenger.points >
          gameRooms[roomName].opponent.points
        ) {
          gameRooms[roomName].miscDetails.gameWonBy =
            gameRooms[roomName].challenger;
        } else {
          gameRooms[roomName].miscDetails.gameWonBy =
            gameRooms[roomName].oppponent;
          gameRooms[roomName].miscDetails.gameWonBy =
            gameRooms[roomName].opponent;
        }
      }
      gameRooms[roomName].miscDetails.gameOver = true;
      io.to(roomName).emit("GAME_OVER", gameRooms[roomName]);
    }

    // Game Manager - check players' answers and emit the result event
    socket.on("GAME_MANAGER", (data) => {
      const { answerer, questionIndex, roomName, answer } = data;

      // if the submitted answer is correct, find out who answered the question, and take appropriate action
      if (
        gameRooms[roomName].gameQuestions[questionIndex] &&
        answer &&
        gameRooms[roomName].gameQuestions[questionIndex].answer.trim() ===
          answer.trim()
      ) {
        if (gameRooms[roomName].challenger.socketId === answerer.socketId) {
          gameRooms[roomName].challenger.points++;
          gameRooms[roomName].challenger.lastAnswerCorrect = true;
          gameRooms[roomName].challenger.answerPattern.push("W");
        } else {
          gameRooms[roomName].opponent.points++;
          gameRooms[roomName].opponent.lastAnswerCorrect = true;
          gameRooms[roomName].opponent.answerPattern.push("W");
        }
      } else {
        // if the answer is not correct,
        if (gameRooms[roomName].challenger.socketId === answerer.socketId) {
          gameRooms[roomName].challenger.lastAnswerCorrect = false;
          gameRooms[roomName].challenger.answerPattern.push("L");
        } else {
          gameRooms[roomName].opponent.lastAnswerCorrect = false;
          gameRooms[roomName].opponent.answerPattern.push("L");
        }
      }

      // count to determine the how many player has answered the question so far(max 2)
      // have to make sure on the client side that once a player clicks an option,
      // for the same question, the option buttons are disabled
      gameRooms[roomName].miscDetails.questionIndex.answeredByCount++;

      // send the gameroom status to the players
      io.to(roomName).emit("ANSWER_RESULT", gameRooms[roomName]);

      // if both players answered the questions, increment the question index
      if (gameRooms[roomName].miscDetails.questionIndex.answeredByCount == 2) {
        // if there are more questions to be played, continue,
        // else determine the game result and emit appropriate event
        if (
          gameRooms[roomName].gameQuestions.length !==
          gameRooms[roomName].miscDetails.questionIndex.index + 1
        ) {
          // +1 because question index starts at zero, so if total questions length is equal to // current index + 1, all questions are exhausted i.e. game is over so determine the winner,
          // if any
          gameRooms[roomName].miscDetails.questionIndex.index++;
          gameRooms[roomName].miscDetails.questionIndex.answeredByCount = 0;

          io.to(roomName).emit("ANSWER_RESULT", gameRooms[roomName]);

          // send next question to that room after a delay
          // to allow client to show if the answer is correct or not
          setTimeout(() => {
            sendQuestionsToRoom(
              roomName,
              gameRooms[roomName].gameQuestions[
                gameRooms[roomName].miscDetails.questionIndex.index
              ]
            );
          }, 2000);
        } else {
          handleGameOver(roomName);
          delete gameRooms[roomName];
          return false;
        }
      }
    });

    // when the socket disconnects, delete the socket id from allActiveUsers
    // and emit the online users event to update on the client side
    socket.on("disconnect", () => {
      delete allActiveUsers[socket.id];
      emitAllUsers();
    });
  });
};

module.exports = { userSockets };

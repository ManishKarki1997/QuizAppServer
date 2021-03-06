const { QuestionModel } = require("../models");
const { v4: uuidv4 } = require("uuid");
const { savePlayerStats, retrievePlayerStats } = require("../helpers/playerStats");

let allActiveUsers = {}; // holds all the online users
const gameCountdown = 3;
const answerCountdown = 15;
const gameQuestionsCount = 2;
let gameRooms = {};

const setRoomQuestions = (roomName, categoryId, numOfQuestions, io) => {
  const setQuestions = (err, results) => {
    if (err) {
      console.log(err);
    }

    gameRooms[roomName].miscDetails.totalQuestions = results.length;
    gameRooms[roomName].gameQuestions = results;
    // emit the game starting countdown
    // also the miscellaneous game room details needed in client side like total questions length
    io.to(roomName).emit("GAME_IN_SECONDS", {
      gameCountdown,
      miscDetails: gameRooms[roomName].miscDetails,
      challenger: {
        ...gameRooms[roomName].challenger,
      },
      opponent: {
        ...gameRooms[roomName].opponent,
      },
    });
  };

  // QuestionModel.findRandom({ categoryId: questionCategoryId }, {}, { limit: numOfQuestions, populate: 'categoryId' }, function (err, results) {}

  //   the plugin demands either there be a categoryId present or remove it altogether. won't accept null or "" apparently, so,
  //   if there's a categoryId, i.e. not random game, do the following
  if (categoryId) {
    QuestionModel.findRandom({ categoryId }, {}, { limit: numOfQuestions, populate: "categoryId" }, setQuestions);
  } else {
    //  else, if it is a random game, pass nothing to the condition
    QuestionModel.findRandom({}, {}, { limit: numOfQuestions, populate: "categoryId" }, setQuestions);
  }
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
      emitAllUsers();
    });

    // handle user challenges
    // send the challenger data to the 'challengee'
    socket.on("CHALLENGE_USER", (data) => {
      if (allActiveUsers[data.challengedTo.socketId] === undefined) {
        io.to(data.challengedBy.socketId).emit("USER_DISCONNECTED", {
          error: true,
          message: "The opponent has disconnected",
        });
        return;
      }
      socket.to(data.challengedTo.socketId).emit("SOMEONE_CHALLENGED_YOU", data);
    });

    // handle challenge response
    socket.on("CHALLENGE_RESPONSE", (data) => {
      const { type, challengedBy, challengedTo } = data;
      // just passing the data altogether,
      //   in the client side, the player will figure out themeselves the challenger response
      socket.to(challengedBy.socketId).emit("CHALLENGE_RESPONSE", data);
    });

    // prepare to start the game
    socket.on("START_GAME", async (data) => {
      const roomName = uuidv4(); // generate unique room name
      const { challenger, opponent, gameOptions } = data;
      const { categoryId } = gameOptions; // the challenger may or may not select a specific category

      const challengerDetails = await retrievePlayerStats(challenger);
      const opponentDetails = await retrievePlayerStats(opponent);

      challenger.totalWins = challengerDetails.payload.totalWins;
      challenger.totalMatches = challengerDetails.payload.totalMatches;

      opponent.totalWins = opponentDetails.payload.totalWins;
      opponent.totalMatches = opponentDetails.payload.totalMatches;

      // join both user sockets to the room
      if (io.sockets.connected[challenger.socketId]) {
        io.sockets.connected[challenger.socketId].join(roomName);

        // this will be useful in determining the roomname of the user when he disconnects
        // the other player can receive the opponent left event and send a game over event
        // and then delete the room
        io.sockets.connected[challenger.socketId].roomName = roomName;
      }

      if (io.sockets.connected[opponent.socketId]) {
        io.sockets.connected[opponent.socketId].join(roomName);
        io.sockets.connected[opponent.socketId].roomName = roomName;
      }

      // sending the game room details to the room
      //   the players will figure out themeselves who their opponent is
      io.to(roomName).emit("OPPONENT_DETAILS", [challenger, opponent, roomName]);

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
          opponentLeft: false,
          gameOver: false,
          answerCountdown: answerCountdown,
        },
      };

      // set room questions
      setRoomQuestions(roomName, categoryId, gameQuestionsCount, io);

      setTimeout(() => {
        // a player may leave the game, in which case, the room will be deleted
        // so, always check if the room exists before sending the question
        if (gameRooms[roomName]) {
          sendQuestionsToRoom(roomName, gameRooms[roomName].gameQuestions[gameRooms[roomName].miscDetails.questionIndex.index]);
        }
      }, gameCountdown * 500);
    });

    // function to send questions to a room
    function sendQuestionsToRoom(roomName, data) {
      io.to(roomName).emit("GAME_QUESTIONS", data);
    }

    // handling game over
    // whether a player disconnects or the game completes successfully and determine the winner or draw
    function handleGameOver(playerLeftInfo, roomName) {
      // if someone left, (the playerLeftInfo object will be passed in the socket disconnect event)
      // if the game room still exists, send an opponent left event to the room
      // delete the room
      if (playerLeftInfo.someoneLeft && gameRooms[playerLeftInfo.roomName]) {
        gameRooms[playerLeftInfo.roomName].miscDetails.opponentLeft = true;
        gameRooms[playerLeftInfo.roomName].miscDetails.gameOver = true;
        io.to(playerLeftInfo.roomName).emit("GAME_OVER", gameRooms[roomName]);
        // io.to(playerLeftInfo.roomName).emit("OPPONENT_LEFT", {
        //   message: "Your opponent left the game. You win.",
        // });
        delete gameRooms[playerLeftInfo.roomName];
        return false;
      }
      // //   if the game room still exists,
      // // determing the winner or draw event and emit the event
      // if (gameRooms[roomName]) {
      //   if (gameRooms[roomName].challenger.points === gameRooms[roomName].opponent.points) {
      //     // game ended in a draw
      //     gameRooms[roomName].miscDetails.gameDraw = true;
      //     savePlayerStats({
      //       gameResult: "DRAW",
      //       ...gameRooms[roomName].challenger,
      //     });
      //     savePlayerStats({
      //       gameResult: "DRAW",
      //       ...gameRooms[roomName].opponent,
      //     });
      //   } else {
      //     if (gameRooms[roomName].challenger.points > gameRooms[roomName].opponent.points) {
      //       gameRooms[roomName].miscDetails.gameWonBy = gameRooms[roomName].challenger;
      //       savePlayerStats({
      //         gameResult: "WIN",
      //         ...gameRooms[roomName].challenger,
      //       });
      //     } else {
      //       gameRooms[roomName].miscDetails.gameWonBy = gameRooms[roomName].oppponent;
      //       savePlayerStats({
      //         gameResult: "WIN",
      //         ...gameRooms[roomName].opponent,
      //       });
      //     }
      //   }
      //   console.log(gameRooms[roomName]);
      //   gameRooms[roomName].miscDetails.gameOver = true;
      //   io.to(roomName).emit("GAME_OVER", gameRooms[roomName]);
      // }
    }

    // Game Manager - check players' answers and emit the result event
    socket.on("GAME_MANAGER", (data) => {
      const { answerer, questionIndex, roomName, answer } = data;

      let sendQuestionTimeout = null;

      // if the submitted answer is correct, find out who answered the question, and take appropriate action
      if (gameRooms[roomName] && gameRooms[roomName].gameQuestions[questionIndex] && answer && gameRooms[roomName].gameQuestions[questionIndex].answer.trim() === answer.trim()) {
        if (gameRooms[roomName].challenger.socketId === answerer.socketId) {
          gameRooms[roomName].challenger.points++;
          gameRooms[roomName].challenger.lastAnswerCorrect = true;
          gameRooms[roomName].challenger.answerPattern.push("W");
        } else {
          gameRooms[roomName].opponent.points++;
          gameRooms[roomName].opponent.lastAnswerCorrect = true;
          gameRooms[roomName].opponent.answerPattern.push("W");
        }
      } else if (gameRooms[roomName] && gameRooms[roomName].gameQuestions[questionIndex] && answer && gameRooms[roomName].gameQuestions[questionIndex].answer.trim() !== answer.trim()) {
        // if the answer is not correct,
        if (gameRooms[roomName].challenger.socketId === answerer.socketId) {
          gameRooms[roomName].challenger.lastAnswerCorrect = false;
          gameRooms[roomName].challenger.answerPattern.push("L");
        } else {
          gameRooms[roomName].opponent.lastAnswerCorrect = false;
          gameRooms[roomName].opponent.answerPattern.push("L");
        }
      } else {
        //   the room might be deleted, in which case, just return;
        return;
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
        if (gameRooms[roomName] && !gameRooms[roomName].miscDetails.gameOver && gameRooms[roomName].gameQuestions.length !== gameRooms[roomName].miscDetails.questionIndex.index + 1) {
          // +1 because question index starts at zero, so if total questions length is equal to
          // current index + 1, all questions are exhausted i.e. game is over so determine the winner, if any
          gameRooms[roomName].miscDetails.questionIndex.index++;
          gameRooms[roomName].miscDetails.questionIndex.answeredByCount = 0;

          io.to(roomName).emit("ANSWER_RESULT", gameRooms[roomName]);

          // send next question to that room after a delay
          // to give enough time interval to the client to show if the answer is correct or not

          sendQuestionTimeout = setTimeout(() => {
            if (gameRooms[roomName]) {
              sendQuestionsToRoom(roomName, gameRooms[roomName].gameQuestions[gameRooms[roomName].miscDetails.questionIndex.index]);
            }
          }, 2000);
        } else {
          clearTimeout(sendQuestionTimeout);
          // handleGameOver({}, roomName);
          //   if the game room still exists,
          // determing the winner or draw event and emit the event
          if (gameRooms[roomName]) {
            if (gameRooms[roomName].challenger.points === gameRooms[roomName].opponent.points) {
              // game ended in a draw
              gameRooms[roomName].miscDetails.gameDraw = true;
              savePlayerStats({
                gameResult: "DRAW",
                ...gameRooms[roomName].challenger,
              });
              savePlayerStats({
                gameResult: "DRAW",
                ...gameRooms[roomName].opponent,
              });
            } else {
              if (gameRooms[roomName].challenger.points > gameRooms[roomName].opponent.points) {
                gameRooms[roomName].miscDetails.gameWonBy = gameRooms[roomName].challenger;
                savePlayerStats({
                  gameResult: "WIN",
                  ...gameRooms[roomName].challenger,
                });
              } else {
                gameRooms[roomName].miscDetails.gameWonBy = gameRooms[roomName].oppponent;
                savePlayerStats({
                  gameResult: "WIN",
                  ...gameRooms[roomName].opponent,
                });
              }
            }
            gameRooms[roomName].miscDetails.gameOver = true;
            io.to(roomName).emit("GAME_OVER", gameRooms[roomName]);
          }
          delete gameRooms[roomName];
          return false;
        }
      }
    });

    // send emojis to a room
    socket.on("SEND_EMOJI", (data) => {
      const { emoji, roomName } = data;
      io.to(roomName).emit("EMOJI_RECEIVED", data);
    });

    // when the socket disconnects, delete the socket id from allActiveUsers
    // and emit the online users event to update on the client side
    socket.on("disconnect", () => {
      // the name of the room which the socket was in before disconnecting
      const userJoinedRoom = socket.roomName;

      if (userJoinedRoom) {
        handleGameOver(
          {
            someoneLeft: true,
            leftPlayerSocketId: socket.id,
            roomName: userJoinedRoom,
          },
          userJoinedRoom
        );
      }
      delete allActiveUsers[socket.id];
      emitAllUsers();
    });
  });
};

module.exports = { userSockets };

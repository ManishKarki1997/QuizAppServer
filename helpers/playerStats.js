const { UserModel } = require("../models");

const savePlayerStats = async (player) => {
  const { gameResult } = player;
  const user = await UserModel.findById(player._id);
  if (gameResult === "WIN") {
    user.totalWins++;
  }
  user.totalMatches++;
  await user.save();
};

const retrievePlayerStats = async (player) => {
  const user = await UserModel.findById(player._id);
  if (user) {
    return {
      error: false,
      payload: user,
    };
  } else {
    return {
      error: true,
      message: "No user exists with that user id",
      payload: user,
    };
  }
};

module.exports = { savePlayerStats, retrievePlayerStats };

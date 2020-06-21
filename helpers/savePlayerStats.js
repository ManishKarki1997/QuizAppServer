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

module.exports = { savePlayerStats };

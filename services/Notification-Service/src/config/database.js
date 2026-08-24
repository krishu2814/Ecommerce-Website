const mongoose = require("mongoose");
const { MONGO_URL } = require("./serverConfig");

const connectDB = async () => {
  try {
    await mongoose.connect(MONGO_URL);
    console.log("Connected to Notification MongoDB successfully");
  } catch (error) {
    console.error("Notification MongoDB Connection Failed:", error.message);
    process.exit(1);
  }
};

module.exports = { connectDB };

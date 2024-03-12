require('dotenv').config(); // Ensure you're loading environment variables
const mongoose = require('mongoose');

const uri = process.env.MONGODB_URI; // Your MongoDB connection string

const connectDB = async () => {
  try {
    await mongoose.connect(uri, {
      useNewUrlParser: true,
      // Removed useUnifiedTopology since it's deprecated and no longer necessary
    });
    console.log('MongoDB connected...');
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  }
};

module.exports = connectDB;

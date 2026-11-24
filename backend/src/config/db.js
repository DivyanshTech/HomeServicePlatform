const mongoose = require('mongoose');

mongoose.connection.on('error', err => {
  console.error('MongoDB connection error:', err.message);
});

mongoose.connection.on('disconnected', () => {
  console.error('MongoDB disconnected; waiting for the driver to reconnect');
});

async function connectDB() {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is not configured');
  const conn = await mongoose.connect(process.env.MONGODB_URI);
  console.log(`MongoDB Connected: ${conn.connection.host}`);
}
module.exports = connectDB;

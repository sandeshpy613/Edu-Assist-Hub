// models/historySchema.js
const mongoose = require('mongoose');

// Define the schema
const historySchema = new mongoose.Schema({
  app: {
    type: String,
    required: true,
  },
  input: {
    type: String,
    required: true,
  },
  output: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Create the model
const History = mongoose.model('History', historySchema);

// Export the model
module.exports = History;
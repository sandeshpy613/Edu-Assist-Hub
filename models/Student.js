const mongoose = require('mongoose');

const StudentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  std_id: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  age: { type: Number, required: true },
  gender: { type: String, required: true },
  dob: { type: Date, required: true },
  email: { type: String, required: true, unique: true },
  course: { type: String, required: true },
  branch: { type: String, required: true },
  phone: { type: String, required: true },
  address: { type: String, required: true },
  state: { type: String, required: true },
  pincode: { type: String, required: true },
  hobbies: { type: [String], required: true }, // Array of strings
  photo: { type: String, required: true }, // Path to the uploaded file
});

module.exports = mongoose.model('Student', StudentSchema);
const mongoose = require('mongoose');

let studentSchema = new mongoose.Schema({
    name: String,
    email: {type: String, unique: true, required: true},
    password: String,
    subscribedTo: {type: [String], default: []},
    course: String,
    faculty: String,
    University: String,
    collegeStart: Number,
    collegeEnd: Number
});

module.exports = mongoose.model("Student", studentSchema);
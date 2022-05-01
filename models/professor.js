const mongoose = require('mongoose');

let professorSchema = new mongoose.Schema({
    password: String,
    name: String,
    email: { type: String, unique: true, required: true },
    phone: String,
    subjects: String,
    faculty: String,
    university: String,
    degrees: String,
    studentsNumber: { type: Number, default: 0 },
    studentsId: { type: [String], default: [] },
    notes: { type: [String], default: [] }
});

module.exports = mongoose.model("Professor", professorSchema);
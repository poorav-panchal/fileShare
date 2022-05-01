const mongoose = require('mongoose');

let chatSchema = new mongoose.Schema({
    roomId: { type: String, required: true, unique: true },
    profId: { type: String, required: true },
    studId: { type: String, required: true }
}, { timestamps: { createdAt: 'created_at' } });

module.exports = mongoose.model("Chat", chatSchema);
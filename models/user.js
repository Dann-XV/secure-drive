const mongoose = require('mongoose');

// Schema for User model
const userSchema = new mongoose.Schema({
    email: {type: String, required: true, unique: true},
    passwordHash: {type: String, required: true}
})

exports.User = mongoose.model('User', userSchema);
exports.userSchema = userSchema;
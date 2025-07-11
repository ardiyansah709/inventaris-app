const mongoose = require('mongoose');
const UserSchema = new mongoose.Schema({
  username: { type: String, unique: true },
  password: String, // plaintext (untuk belajar, production sebaiknya hash!)
  nama: String,
  level: { type: String, default: "admin" }
});
module.exports = mongoose.model('User', UserSchema);

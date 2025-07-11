const mongoose = require('mongoose');
const ItemSchema = new mongoose.Schema({
  name: String,
  category: String,
  stock: Number,
  price: Number,
  photo: String,
  desc: String,
  updated: { type: Date, default: Date.now }
});
module.exports = mongoose.model('Item', ItemSchema);

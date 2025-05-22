const mongoose = require('mongoose');

const petSchema = new mongoose.Schema({
  type: { type: String, required: true },
});

module.exports = mongoose.model('Pet', petSchema);
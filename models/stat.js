const mongoose = require('mongoose');

const statSchema = new mongoose.Schema({
  petname: { type: String, required: true },
  hunger: { type: Number, default: 100 },
  happiness: { type: Number, default: 100 }
});

module.exports = mongoose.model('Stat', statSchema);

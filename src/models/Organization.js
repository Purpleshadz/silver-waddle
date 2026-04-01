const mongoose = require('mongoose');

const orgSchema = new mongoose.Schema({
  name: { type: String, unique: true, required: true },
  description: String,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Organization', orgSchema);

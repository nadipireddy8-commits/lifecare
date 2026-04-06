const mongoose = require('mongoose');

const goalSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  goal: { type: String, required: true },
  deadline: Date,
  status: { type: String, enum: ['active', 'completed'], default: 'active' }
});

module.exports = mongoose.model('Goal', goalSchema);
const mongoose = require('mongoose');

const actionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  actionText: String,
  category: { type: String, enum: ['productive', 'distraction', 'physical', 'emotional'], default: 'productive' },
  emotion: { type: String, enum: ['happy', 'sad', 'angry', 'neutral', 'stressed', 'excited'], default: 'neutral' },
  mode: { type: String, enum: ['productive', 'physical', 'social'], default: 'productive' },
  timestamp: { type: Date, default: Date.now },
  source: { type: String, enum: ['manual', 'auto_sensor', 'notification', 'usage'], default: 'manual' }
});

module.exports = mongoose.model('Action', actionSchema);
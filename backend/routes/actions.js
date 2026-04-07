const express = require('express');
const router = express.Router();
const Action = require('../models/Action');
const auth = require('../middleware/auth');

router.post('/', auth, async (req, res) => {
  try {
const { actionText, category, source, mode = 'productive' } = req.body;
    const { detectEmotion } = require('../services/sentiment');
    const emotion = await detectEmotion(actionText);
    const action = new Action({ userId: req.userId, actionText, category, emotion, source, mode });
    await action.save();
    res.json(action);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/', auth, async (req, res) => {
  try {
    const actions = await Action.find({ userId: req.userId }).sort({ timestamp: -1 }).limit(100);
    res.json(actions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
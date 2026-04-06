const express = require('express');
const router = express.Router();
const Goal = require('../models/Goal');
const auth = require('../middleware/auth');

router.post('/', auth, async (req, res) => {
  try {
    const { goal, deadline } = req.body;
    const newGoal = new Goal({ userId: req.userId, goal, deadline });
    await newGoal.save();
    res.json(newGoal);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/', auth, async (req, res) => {
  try {
    const goals = await Goal.find({ userId: req.userId });
    res.json(goals);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/:id/complete', auth, async (req, res) => {
  try {
    const goal = await Goal.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      { status: 'completed' },
      { new: true }
    );
    res.json(goal);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
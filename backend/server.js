const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const actionRoutes = require('./routes/actions');
const goalRoutes = require('./routes/goals');
const insightRoutes = require('./routes/insights');
const assistantRoutes = require('./routes/assistant');

const app = express();
app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error(err));

// MOUNT ROUTES WITH /api PREFIX
app.use('/api/auth', authRoutes);
app.use('/api/actions', actionRoutes);
app.use('/api/goals', goalRoutes);
app.use('/api/insights', insightRoutes);
app.use('/api/assistant', assistantRoutes);

// Test route
app.get('/api/test', (req, res) => res.json({ message: 'API works' }));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
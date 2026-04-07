const express = require('express');
const router = express.Router();
const Action = require('../models/Action');
const auth = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  try {
    const actions = await Action.find({ userId: req.userId }).sort({timestamp: -1}).limit(100);
    const total = actions.length;
const recentActions = actions.slice(0, 20); // Recent 20 for detailed breakdown
    
    // Define apps lists with new classification
    const distractionApps = recentActions
      .filter(a => a.category === 'distraction' || 
        (a.source === 'notification' && a.actionText.toLowerCase().includes('whatsapp') || a.actionText.toLowerCase().includes('instagram') || a.actionText.toLowerCase().includes('facebook')))
      .map(a => a.actionText.split(':')[1]?.split('(')[0]?.trim() || a.actionText.split(' ')[0] || 'Unknown')
      .slice(0, 3);
    const productiveApps = recentActions
      .filter(a => a.category === 'productive')
      .map(a => a.actionText.split(':')[1]?.split('(')[0]?.trim() || a.actionText.split(' ')[0] || 'Unknown')
      .slice(0, 3);

    // Enhanced weighted score with notification classification
    let weightedProductive = 0;
    let totalWeight = 0;
    const effectiveCats = [];
    
    actions.forEach(a => {
      const weight = a.source === 'manual' ? 3 : (a.source === 'notification' ? 1 : 1);
      totalWeight += weight;
      
// Classify notifications if not set, mode-aware
      let cat = a.category;
      if (a.source === 'notification' && !['productive', 'distraction', 'physical'].includes(cat)) {
        const text = a.actionText.toLowerCase();
        let modeBonus = a.mode === 'physical' ? 1.2 : 1;
        if (text.includes('whatsapp') || text.includes('instagram') || text.includes('facebook') || text.includes('tiktok') || text.includes('game')) {
          cat = 'distraction';
        } else if (text.includes('gmail') || text.includes('docs') || text.includes('notes') || text.includes('chrome')) {
          cat = 'productive';
        } else if (text.includes('walk') || text.includes('run') || text.includes('exercise') || a.mode === 'physical') {
          cat = 'physical';
        } else {
          cat = 'distraction'; // default
        }
        if (cat === 'productive') weightedProductive += weight * modeBonus;
        effectiveCats.push(`${a.actionText.slice(0,30)} → ${cat}`);
      }
      
      if (cat === 'productive') {
        weightedProductive += weight;
      }
    });
    
    const productivityScore = totalWeight === 0 ? 50 : Math.round((weightedProductive / totalWeight) * 100); // Bootstrap 50 for new users

// Enhanced reasons for score change
    const scoreReasons = [];
    if (productiveApps.length > 0) {
      scoreReasons.push(`✅ Productive apps: ${productiveApps.join(', ')}`);
    }
    if (distractionApps.length > 0) {
      scoreReasons.push(`⚠️ Distractions: ${distractionApps.join(', ')}`);
    }
    if (recentActions.filter(a => a.emotion === 'stressed').length > 2) {
      scoreReasons.push('😰 High stress detected');
    }
    if (effectiveCats.length > 0) {
      scoreReasons.push(`📱 Notifs: ${effectiveCats.slice(0,2).join('; ')}`);
    }
    if (productivityScore > 70) {
      scoreReasons.push('🎉 Excellent focus!');
    } else if (productivityScore < 40) {
      scoreReasons.push('💡 Try 25min Pomodoro');
    }

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentEmotions = actions.filter(a => a.timestamp >= sevenDaysAgo && a.emotion);
    const emotionCounts = {};
    recentEmotions.forEach(a => { emotionCounts[a.emotion] = (emotionCounts[a.emotion] || 0) + 1; });

    const topCategories = actions.reduce((acc, a) => {
      acc[a.category] = (acc[a.category] || 0) + 1;
      return acc;
    }, {});

res.json({ 
      productivityScore: Math.round(productivityScore), 
      totalActions: total, 
      emotionTrend: emotionCounts, 
      topCategories,
      scoreReasons,
      recentApps: {
        productive: productiveApps,
        distractions: distractionApps
      },
      scoreDelta: 0, // TODO: implement from history
      effectiveNotifications: effectiveCats.length
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
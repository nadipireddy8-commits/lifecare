const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { searchAllPlatforms } = require('../services/multiSourceSearch');
const { parseLearningIntent } = require('../services/platformRanker');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey || apiKey.startsWith('Alza')) {
    console.warn('⚠️ GEMINI_API_KEY is missing or invalid. Using fallback responses.');
}
const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// Enhanced fallback (used only if Gemini fails)
function getSmartFallback(message) {
    const lower = message.toLowerCase();
    
    // Emotions
    if (lower.includes('sad') || lower.includes('depressed') || lower.includes('down')) {
        return "Feeling sad is okay. Try a gratitude journal or call someone you love. One small win today will help.";
    }
    if (lower.includes('angry') || lower.includes('mad') || lower.includes('frustrated')) {
        return "Breathe deep – 4 seconds in, 4 hold, 4 out. Anger passes. What's one thing you can control right now?";
    }
    if (lower.includes('stressed') || lower.includes('anxious') || lower.includes('worry')) {
        return "4-7-8 breathing: 4s in, 7s hold, 8s out. Name 5 things you see. You're stronger than this moment.";
    }
    if (lower.includes('happy') || lower.includes('great') || lower.includes('excited')) {
        return "Love this energy! Build momentum with one more positive step today.";
    }
    
    // Productivity
    if (lower.includes('procrastinate') || lower.includes('lazy') || lower.includes('motivation')) {
        return "2-minute rule: if task <2min, do it now. Pomodoro: 25min work, 5min break. Start small.";
    }
    if (lower.includes('focus') || lower.includes('concentration')) {
        return "Phone silent, one tab open, timer 25min. Single-tasking wins.";
    }
    
    // Learning/Career
    if (lower.includes('learn') || lower.includes('study') || lower.includes('skill')) {
        return "YouTube tutorials first, then free Coursera. 20min daily > binge. What skill?";
    }
    if (lower.includes('job') || lower.includes('career') || lower.includes('resume')) {
        return "LinkedIn profile 100%, apply 5 jobs/week, network 1 person/day. Progress compounds.";
    }
    
    // Fitness
    if (lower.includes('workout') || lower.includes('gym') || lower.includes('exercise')) {
        return "10 pushups now. Walk 10min. Consistency > intensity.";
    }
    if (lower.includes('diet') || lower.includes('weight') || lower.includes('food')) {
        return "Protein + veggies every meal. Water first. Small swaps win.";
    }
    
    // Sleep
    if (lower.includes('sleep') || lower.includes('insomnia') || lower.includes('tired')) {
        return "No screens 1hr before bed, room 65°F, same bedtime daily.";
    }
    
    // Relationships
    if (lower.includes('relationship') || lower.includes('friend') || lower.includes('love')) {
        return "Listen more than talk. Small gestures daily. Vulnerability builds trust.";
    }
    
    // Money
    if (lower.includes('money') || lower.includes('budget') || lower.includes('save')) {
        return "Track every expense 1 week. Save 10% first. Side hustle 1hr/day.";
    }
    
    return "Tell me more – emotions, productivity, learning, fitness, relationships, money? I'm here 24/7.";
}

async function generateResponse(message) {
    const { parseLearningIntent } = require('./platformRanker');
    const { searchAllPlatforms } = require('./multiSourceSearch');
    
    const lower = message.toLowerCase();
    const learningIntent = parseLearningIntent(message);
    
    // Learning/course detection - extract topic
    if (lower.includes('learn') || lower.includes('course') || lower.includes('tutorial') || learningIntent.quick) {
        // Extract topic after keyword
        const topic = lower.includes('learn') ? message.slice(lower.indexOf('learn') + 5).trim() :
                      lower.includes('course') ? message.slice(lower.indexOf('course') + 6).trim() :
                      lower.includes('tutorial') ? message.slice(lower.indexOf('tutorial') + 8).trim() : message;
        const courses = await searchAllPlatforms(topic, learningIntent);
        if (courses && courses.length > 0) {
            return { type: 'courses', data: courses };
        }
    }
    
    // Try Gemini for general questions
    if (apiKey && !apiKey.startsWith('Alza')) {
        try {
            const prompt = `You are LifeOS, a warm, helpful, and concise life coach. Answer ANY question directly and helpfully. Be supportive and practical. Keep response to 2-3 sentences. User question: "${message}"`;
            const result = await model.generateContent(prompt);
            const reply = result.response.text();
            return { type: 'advice', data: reply };
        } catch (err) {
            console.error('Gemini error:', err.message);
        }
    }

    // Comprehensive fallback for all keywords
    return { type: 'advice', data: getSmartFallback(message) };
}

router.post('/chat', auth, async (req, res) => {
    try {
        const { message, withContext = false } = req.body;
        if (!message) return res.status(400).json({ error: 'Message required' });
        
        let result = await generateResponse(message);
        
        // Add context from recent actions/emotions if requested
        if (withContext) {
            const Action = require('../models/Action');
            const recentActions = await Action.find({ userId: req.userId })
                .sort({ timestamp: -1 })
                .limit(10)
                .select('actionText emotion source timestamp');
            
            const context = recentActions.map(a => 
                `${a.source}: "${a.actionText}" (${a.emotion})`
            ).join('; ');
            
            const contextPrompt = `Recent user context: ${context}. Use this to give personalized advice.`;
            const fullPrompt = contextPrompt + `\n\nUser question: "${message}"`;
            result = await generateResponse(fullPrompt);
        }
        
        res.json(result);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
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

// Enhanced fallback (covers emotions, sleep, productivity, etc.)
function getSmartFallback(message) {
    const lower = message.toLowerCase();

    // Emotions
    if (lower.includes('emotion') || lower.includes('feeling')) {
        if (lower.includes('control') || lower.includes('manage')) {
            return "To manage emotions: 1) Pause and breathe deeply. 2) Name the emotion (e.g., 'I feel angry'). 3) Identify the trigger. 4) Choose a positive action (talk, walk, journal). Need more details?";
        }
        return "Emotions are normal. Try labeling them, talking to someone, or practicing mindfulness. What specific emotion are you struggling with?";
    }
    if (lower.includes('sad') || lower.includes('depressed')) {
        return "I'm sorry you're feeling down. Small steps: go outside for 5 minutes, call a friend, or write one thing you're grateful for. You matter.";
    }
    if (lower.includes('angry') || lower.includes('frustrated')) {
        return "Anger is a signal. Take a break, count to 10, or walk away. Later, reflect on what triggered you. You can handle this.";
    }
    if (lower.includes('stressed') || lower.includes('anxious')) {
        return "Stress relief: deep breathing (4-7-8), grounding (5-4-3-2-1), or a short walk. What's one small thing you can do right now?";
    }

    // Sleep
    if (lower.includes('sleep') || lower.includes('insomnia')) {
        return "Better sleep: consistent bedtime, no screens 1 hour before, cool dark room, avoid caffeine after 2 PM. Try a relaxing routine (reading, light stretching).";
    }

    // General
    return "I can help with emotions, sleep, fitness, productivity, learning, and more. Could you rephrase? For example: 'How to control anger?' or 'Tips for better sleep?'";
}

async function generateResponse(message) {
    const lower = message.toLowerCase();

    // Learning intent
    if (lower.includes('learn') || lower.includes('course') || lower.includes('tutorial')) {
        const preferences = await parseLearningIntent(message);
        const courses = await searchAllPlatforms(message, preferences);
        return { type: 'courses', data: courses };
    }

    // Try Gemini if available
    if (apiKey && !apiKey.startsWith('Alza')) {
        try {
            const prompt = `You are LifeOS, a warm, concise life coach. Answer the user's question directly and helpfully (max 3 sentences). User: "${message}"`;
            const result = await model.generateContent(prompt);
            const reply = result.response.text();
            return { type: 'advice', data: reply };
        } catch (err) {
            console.error('Gemini error:', err.message);
        }
    }

    // Fallback
    return { type: 'advice', data: getSmartFallback(message) };
}

router.post('/chat', auth, async (req, res) => {
    try {
        const { message } = req.body;
        if (!message) return res.status(400).json({ error: 'Message required' });
        const result = await generateResponse(message);
        res.json(result);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
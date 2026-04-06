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

    if (lower.includes('sad') || lower.includes('depressed')) {
        return "I'm sorry you're feeling down. Small steps: go outside for 5 minutes, call a friend, or write one thing you're grateful for. You matter.";
    }
    if (lower.includes('angry') || lower.includes('frustrated')) {
        return "Anger is a signal. Take a break, count to 10, or walk away. You can handle this.";
    }
    if (lower.includes('stressed') || lower.includes('anxious')) {
        return "Stress relief: deep breathing (4-7-8), grounding (5-4-3-2-1), or a short walk.";
    }
    if (lower.includes('sleep') || lower.includes('insomnia')) {
        return "Better sleep: consistent bedtime, no screens 1 hour before, cool dark room, avoid caffeine after 2 PM.";
    }
    if (lower.includes('learn') || lower.includes('course')) {
        return "Try searching for free courses on YouTube, Coursera, or edX. What topic are you interested in?";
    }
    return "I'm here to help! Could you rephrase your question? I can answer anything about emotions, productivity, learning, fitness, relationships, and more.";
}

async function generateResponse(message) {
    // Try Gemini for EVERY question first
    if (apiKey && !apiKey.startsWith('Alza')) {
        try {
            const prompt = `You are LifeOS, a warm, helpful, and concise life coach. Answer the user's question directly and helpfully. Be supportive and practical. Keep response to 2-3 sentences. User question: "${message}"`;
            const result = await model.generateContent(prompt);
            const reply = result.response.text();
            return { type: 'advice', data: reply };
        } catch (err) {
            console.error('Gemini error:', err.message);
        }
    }

    // If Gemini fails, use fallback
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
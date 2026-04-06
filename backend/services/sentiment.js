const { GoogleGenerativeAI } = require('@google/generative-ai');
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

async function detectEmotion(text) {
  try {
    const prompt = `Analyze the emotion of this message: "${text}". Reply with exactly one word: happy, sad, angry, neutral, stressed, excited.`;
    const result = await model.generateContent(prompt);
    let emotion = (await result.response.text()).trim().toLowerCase();
    const valid = ['happy', 'sad', 'angry', 'neutral', 'stressed', 'excited'];
    if (valid.includes(emotion)) return emotion;
  } catch (err) {
    console.error('Gemini emotion detection failed:', err.message);
  }
  // Fallback to keyword matching
  const lower = text.toLowerCase();
  if (lower.includes('happy') || lower.includes('joy') || lower.includes('great')) return 'happy';
  if (lower.includes('sad') || lower.includes('depressed') || lower.includes('upset')) return 'sad';
  if (lower.includes('angry') || lower.includes('mad') || lower.includes('frustrated')) return 'angry';
  if (lower.includes('stressed') || lower.includes('anxious')) return 'stressed';
  if (lower.includes('excited') || lower.includes('thrilled')) return 'excited';
  return 'neutral';
}

module.exports = { detectEmotion };
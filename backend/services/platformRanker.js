// backend/services/platformRanker.js
// Simple intent parser – no external API needed for basic version.

async function parseLearningIntent(query) {
  const lower = query.toLowerCase();
  return {
    freeOnly: lower.includes('free') || lower.includes('no cost'),
    certificate: lower.includes('certificate') || lower.includes('certified') || lower.includes('degree'),
    quick: lower.includes('quick') || lower.includes('fast') || lower.includes('crash') || lower.includes('tutorial')
  };
}

module.exports = { parseLearningIntent };
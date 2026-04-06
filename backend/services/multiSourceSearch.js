// backend/services/multiSourceSearch.js
async function searchAllPlatforms(query, preferences = {}) {
  // Return direct search links to popular platforms (no API key needed)
  const links = [
    { 
      title: `Learn ${query} on YouTube`, 
      platform: 'YouTube', 
      url: `https://www.youtube.com/results?search_query=${encodeURIComponent(query + ' tutorial')}`,
      free: true 
    },
    { 
      title: `Learn ${query} on Coursera`, 
      platform: 'Coursera', 
      url: `https://www.coursera.org/search?query=${encodeURIComponent(query)}`,
      free: true 
    },
    { 
      title: `Learn ${query} on Udemy`, 
      platform: 'Udemy', 
      url: `https://www.udemy.com/courses/search/?q=${encodeURIComponent(query)}`,
      free: false 
    },
    { 
      title: `Learn ${query} on edX`, 
      platform: 'edX', 
      url: `https://www.edx.org/search?q=${encodeURIComponent(query)}`,
      free: true 
    }
  ];

  let filtered = links;
  if (preferences.freeOnly) filtered = filtered.filter(link => link.free);
  if (preferences.quick) {
    const youtube = filtered.find(link => link.platform === 'YouTube');
    const others = filtered.filter(link => link.platform !== 'YouTube');
    filtered = youtube ? [youtube, ...others] : filtered;
  }
  if (preferences.certificate) {
    const cert = filtered.filter(link => link.platform === 'Coursera' || link.platform === 'edX');
    const rest = filtered.filter(link => link.platform !== 'Coursera' && link.platform !== 'edX');
    filtered = [...cert, ...rest];
  }
  return filtered;
}

module.exports = { searchAllPlatforms };
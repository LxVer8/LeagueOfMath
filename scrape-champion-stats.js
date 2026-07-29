// scrape-champion-stats.js
const axios = require('axios');
const fs = require('fs');

// Official League wiki – the Lua module with all champion base stats
const WIKI_URL = 'https://wiki.leagueoflegends.com/en-us/wiki/Module:ChampionData/data?action=raw';

(async () => {
  try {
    console.log('Fetching champion data from official wiki...');
    const { data } = await axios.get(WIKI_URL);
    
    // Pattern to capture champion name and its stat table
    const championRegex = /\[\s*"([^"]+)"\s*\]\s*=\s*\{([^}]*(?:\{[^}]*\}[^}]*)*)\}/g;
    const stats = {};
    let match;
    
    while ((match = championRegex.exec(data)) !== null) {
      const name = match[1];
      const tableContent = match[2];
      
      // Extract individual stat lines like: ["hp"] = 620, ["hpperlevel"] = 124,
      const statRegex = /\[\s*"(\w+)"\s*\]\s*=\s*(-?[\d.]+)/g;
      const champStats = {};
      let statMatch;
      while ((statMatch = statRegex.exec(tableContent)) !== null) {
        const statName = statMatch[1];
        const value = parseFloat(statMatch[2]);
        champStats[statName] = value;
      }
      
      // Only save if we found a reasonable number of stats (not a false match)
      if (Object.keys(champStats).length > 10) {
        stats[name] = champStats;
      }
    }
    
    fs.writeFileSync('championStats.json', JSON.stringify(stats, null, 2));
    console.log(`Saved stats for ${Object.keys(stats).length} champions to championStats.json.`);
  } catch (err) {
    console.error('Scraping failed:', err.message);
    console.log('If the URL is incorrect, try visiting the wiki and searching for "Module:ChampionData/data".');
  }
})();
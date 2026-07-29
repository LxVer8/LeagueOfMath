// parse-champion-data.js
const axios = require('axios');
const fs = require('fs');

const WIKI_URL = 'https://wiki.leagueoflegends.com/en-us/Module:ChampionData/data?action=raw';

// Map wiki keys → calculator keys (same as before)
const keyMap = {
  hp_base: 'hp',
  hp_lvl: 'hpperlevel',
  mp_base: 'mp',
  mp_lvl: 'mpperlevel',
  arm_base: 'armor',
  arm_lvl: 'armorperlevel',
  mr_base: 'spellblock',
  mr_lvl: 'spellblockperlevel',
  dam_base: 'attackdamage',
  dam_lvl: 'attackdamageperlevel',
  as_base: 'attackspeed',
  as_lvl: 'attackspeedperlevel',
  hp5_base: 'hpregen',
  hp5_lvl: 'hpregenperlevel',
  mp5_base: 'mpregen',
  mp5_lvl: 'mpregenperlevel',
  ms: 'movespeed',
  range: 'attackrange'
};

function findMatchingBrace(str, start) {
  let depth = 0;
  for (let i = start; i < str.length; i++) {
    if (str[i] === '{') depth++;
    else if (str[i] === '}') {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

(async () => {
  try {
    console.log('Fetching champion data from official wiki...');
    const res = await axios.get(WIKI_URL, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    const raw = res.data;

    const championRegex = /\[\s*"([^"]+)"\s*\]\s*=\s*\{/g;
    const stats = {};
    let match;

    while ((match = championRegex.exec(raw)) !== null) {
      const name = match[1];
      const blockStart = match.index + match[0].length - 1;
      const blockEnd = findMatchingBrace(raw, blockStart);
      if (blockEnd === -1) continue;
      const fullBlock = raw.substring(match.index, blockEnd + 1);

      const statsStart = fullBlock.indexOf('["stats"]');
      if (statsStart === -1) continue;
      const openBrace = fullBlock.indexOf('{', statsStart);
      if (openBrace === -1) continue;
      const statsEnd = findMatchingBrace(fullBlock, openBrace);
      if (statsEnd === -1) continue;
      const statsBlock = fullBlock.substring(openBrace + 1, statsEnd);

      const lineRegex = /\[\s*"(\w+)"\s*\]\s*=\s*(-?[\d.]+)/g;
      const rawStats = {};
      let lineMatch;
      while ((lineMatch = lineRegex.exec(statsBlock)) !== null) {
        rawStats[lineMatch[1]] = parseFloat(lineMatch[2]);
      }

      const champStats = {};
      for (const [wikiKey, value] of Object.entries(rawStats)) {
        if (keyMap[wikiKey]) champStats[keyMap[wikiKey]] = value;
      }

      if (Object.keys(champStats).length >= 12) {
        stats[name] = champStats;
      }
    }

    fs.writeFileSync('championStats.json', JSON.stringify(stats, null, 2));
    console.log(`Saved stats for ${Object.keys(stats).length} champions.`);
  } catch (err) {
    console.error('Scraping failed:', err.message);
    process.exit(1);   // so the workflow knows it failed
  }
})();
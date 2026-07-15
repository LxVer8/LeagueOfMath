// scrape-augments.js
const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

const WIKI_URL = 'https://wiki.leagueoflegends.com/en-us/Arena_(League_of_Legends)/Augments';
const ICON_DIR = './augment_icons';

(async () => {
  try {
    console.log('Fetching wiki page...');
    const { data } = await axios.get(WIKI_URL);
    const $ = cheerio.load(data);

    const augments = [];

    $('table.wikitable').each((i, table) => {
      const headers = $(table).find('tr th');
      let hasAugmentHeader = false;
      headers.each((j, th) => {
        if ($(th).text().trim().toLowerCase() === 'augment') hasAugmentHeader = true;
      });
      if (!hasAugmentHeader) return;

      $(table).find('tbody tr').each((j, row) => {
        const cols = $(row).find('td');
        if (cols.length < 2) return;

        const iconCol = $(cols[0]);
        const img = iconCol.find('img').first();
        let iconUrl = '';
        if (img.length) {
          let src = img.attr('data-src') || img.attr('src') || img.attr('data-original') || '';
          if (src && src !== '' && !src.includes('data:image/gif;base64')) {
            if (src.startsWith('//')) src = 'https:' + src;
            else if (src.startsWith('/')) src = 'https://wiki.leagueoflegends.com' + src;
            else if (!src.startsWith('http')) src = 'https://wiki.leagueoflegends.com/' + src;
            iconUrl = src;
          }
        }

        const name = iconCol.text().trim();
        const desc = $(cols[1]).text().trim();

        if (!name || name === 'Augment' || desc.startsWith('This table')) return;

        // --- Parse numeric effects ---
        const effects = {};

        // Helper: match a number (integer or decimal) optionally followed by %, then a stat phrase
        const findStat = (regex, key) => {
          const match = desc.match(regex);
          if (match) {
            const val = parseFloat(match[1]);
            if (!isNaN(val)) effects[key] = val;
          }
        };

        // Basic stats (with or without "bonus", "gain", "grants", etc.)
        findStat(/(?:gain(?:s)?|grants?|increase(?:s)?\s*(?:by|with)?|bonus| )?\s*\+?(\d+(?:\.\d+)?)\s*(?:bonus\s*)?health/i, 'health');
        findStat(/(?:gain(?:s)?|grants?|increase(?:s)?\s*(?:by|with)?|bonus| )?\s*\+?(\d+(?:\.\d+)?)\s*(?:bonus\s*)?mana/i, 'mana');
        findStat(/(?:gain(?:s)?|grants?|increase(?:s)?\s*(?:by|with)?|bonus| )?\s*\+?(\d+(?:\.\d+)?)\s*(?:bonus\s*)?armor/i, 'armor');
        findStat(/(?:gain(?:s)?|grants?|increase(?:s)?\s*(?:by|with)?|bonus| )?\s*\+?(\d+(?:\.\d+)?)\s*(?:bonus\s*)?magic\s*resist/i, 'magicResistance');
        findStat(/(?:gain(?:s)?|grants?|increase(?:s)?\s*(?:by|with)?|bonus| )?\s*\+?(\d+(?:\.\d+)?)\s*(?:bonus\s*)?attack\s*damage/i, 'attackDamage');
        findStat(/(?:gain(?:s)?|grants?|increase(?:s)?\s*(?:by|with)?|bonus| )?\s*\+?(\d+(?:\.\d+)?)\s*(?:bonus\s*)?ability\s*power/i, 'abilityPower');

        // Adaptive force
        findStat(/(?:gain(?:s)?|grants?|increase(?:s)?\s*(?:by|with)?|bonus| )?\s*\+?(\d+(?:\.\d+)?)\s*(?:bonus\s*)?adaptive\s*force/i, 'adaptiveForce');

        // Attack speed – may be percentage (e.g., "10% attack speed")
        findStat(/(?:gain(?:s)?|grants?|increase(?:s)?\s*(?:by|with)?|bonus| )?\s*\+?(\d+(?:\.\d+)?)\s*%\s*(?:bonus\s*)?attack\s*speed/i, 'attackSpeedPercent');
        // also non‑percent
        if (!effects.attackSpeedPercent) {
          findStat(/(?:gain(?:s)?|grants?|increase(?:s)?\s*(?:by|with)?|bonus| )?\s*\+?(\d+(?:\.\d+)?)\s*(?:bonus\s*)?attack\s*speed(?!\s*%)/i, 'attackSpeedPercent');
        }

        // Ability haste (may be "10 ability haste" or "10% cooldown reduction" -> treat as haste)
        findStat(/(?:gain(?:s)?|grants?|increase(?:s)?\s*(?:by|with)?|bonus| )?\s*\+?(\d+(?:\.\d+)?)\s*(?:bonus\s*)?ability\s*haste/i, 'abilityHaste');
        findStat(/(?:gain(?:s)?|grants?|increase(?:s)?\s*(?:by|with)?|bonus| )?\s*\+?(\d+(?:\.\d+)?)\s*%\s*(?:bonus\s*)?(?:cooldown\s*reduction|cdr)/i, 'abilityHaste'); // convert % CDR to haste? not perfect but we keep as haste

        // Critical strike chance
        findStat(/(?:gain(?:s)?|grants?|increase(?:s)?\s*(?:by|with)?|bonus| )?\s*\+?(\d+(?:\.\d+)?)\s*%\s*(?:bonus\s*)?crit(?:ical)?\s*(?:strike\s*)?chance/i, 'critChance');

        // Lethality
        findStat(/(?:gain(?:s)?|grants?|increase(?:s)?\s*(?:by|with)?|bonus| )?\s*\+?(\d+(?:\.\d+)?)\s*(?:bonus\s*)?lethality/i, 'lethality');

        // Penetrations
        findStat(/(?:gain(?:s)?|grants?|increase(?:s)?\s*(?:by|with)?|bonus| )?\s*\+?(\d+(?:\.\d+)?)\s*(?:bonus\s*)?(?:flat\s*)?magic\s*pen(?:etration)?/i, 'flatMagicPen');
        findStat(/(?:gain(?:s)?|grants?|increase(?:s)?\s*(?:by|with)?|bonus| )?\s*\+?(\d+(?:\.\d+)?)\s*%\s*(?:bonus\s*)?(?:percent\s*)?magic\s*pen(?:etration)?/i, 'percentMagicPen');
        findStat(/(?:gain(?:s)?|grants?|increase(?:s)?\s*(?:by|with)?|bonus| )?\s*\+?(\d+(?:\.\d+)?)\s*(?:bonus\s*)?(?:flat\s*)?armor\s*pen(?:etration)?/i, 'flatArmorPen');
        findStat(/(?:gain(?:s)?|grants?|increase(?:s)?\s*(?:by|with)?|bonus| )?\s*\+?(\d+(?:\.\d+)?)\s*%\s*(?:bonus\s*)?(?:percent\s*)?armor\s*pen(?:etration)?/i, 'percentArmorPen');

        // Heal / shield power
        findStat(/(?:gain(?:s)?|grants?|increase(?:s)?\s*(?:by|with)?|bonus| )?\s*\+?(\d+(?:\.\d+)?)\s*%\s*(?:bonus\s*)?(?:heal\s*(?:and|&)\s*)?shield\s*power/i, 'healShieldPower');

        // Lifesteal / vamp / omnivamp
        findStat(/(?:gain(?:s)?|grants?|increase(?:s)?\s*(?:by|with)?|bonus| )?\s*\+?(\d+(?:\.\d+)?)\s*%\s*(?:bonus\s*)?life\s*steal/i, 'lifeSteal');
        findStat(/(?:gain(?:s)?|grants?|increase(?:s)?\s*(?:by|with)?|bonus| )?\s*\+?(\d+(?:\.\d+)?)\s*%\s*(?:bonus\s*)?spell\s*vamp/i, 'spellVamp');
        findStat(/(?:gain(?:s)?|grants?|increase(?:s)?\s*(?:by|with)?|bonus| )?\s*\+?(\d+(?:\.\d+)?)\s*%\s*(?:bonus\s*)?omnivamp/i, 'omnivamp');

        // Movement speed (flat / %)
        findStat(/(?:gain(?:s)?|grants?|increase(?:s)?\s*(?:by|with)?|bonus| )?\s*\+?(\d+(?:\.\d+)?)\s*(?:bonus\s*)?movement\s*speed(?!\s*%)/i, 'moveSpeedFlat');
        findStat(/(?:gain(?:s)?|grants?|increase(?:s)?\s*(?:by|with)?|bonus| )?\s*\+?(\d+(?:\.\d+)?)\s*%\s*(?:bonus\s*)?movement\s*speed/i, 'moveSpeedPercent');

        // Attack range
        findStat(/(?:gain(?:s)?|grants?|increase(?:s)?\s*(?:by|with)?|bonus| )?\s*\+?(\d+(?:\.\d+)?)\s*(?:bonus\s*)?attack\s*range/i, 'attackRange');

        // Tenacity / slow resist
        findStat(/(?:gain(?:s)?|grants?|increase(?:s)?\s*(?:by|with)?|bonus| )?\s*\+?(\d+(?:\.\d+)?)\s*%\s*(?:bonus\s*)?tenacity/i, 'tenacity');
        findStat(/(?:gain(?:s)?|grants?|increase(?:s)?\s*(?:by|with)?|bonus| )?\s*\+?(\d+(?:\.\d+)?)\s*%\s*(?:bonus\s*)?slow\s*resist/i, 'slowResist');

        augments.push({ name, desc, icon: iconUrl, effects });
      });
    });

    const uniqueAugments = augments.filter((v, i, a) => a.findIndex(t => t.name === v.name) === i);
    console.log(`Found ${uniqueAugments.length} augments.`);

    // Download icons
    if (!fs.existsSync(ICON_DIR)) fs.mkdirSync(ICON_DIR, { recursive: true });
    for (const aug of uniqueAugments) {
      if (aug.icon) {
        try {
          const fileExt = path.extname(new URL(aug.icon).pathname) || '.png';
          const safeName = aug.name.replace(/[\/:*?"<>|]/g, '_');
          const fileName = safeName + fileExt;
          const localPath = path.join(ICON_DIR, fileName);
          console.log(`  Downloading: ${aug.name}`);
          const response = await axios.get(aug.icon, { responseType: 'arraybuffer' });
          fs.writeFileSync(localPath, response.data);
          aug.icon = `augment_icons/${fileName}`;
        } catch (err) {
          console.warn(`  Failed to download icon for ${aug.name}: ${err.message}`);
        }
      }
    }

    fs.writeFileSync('augments.json', JSON.stringify(uniqueAugments, null, 2));
    console.log('Saved to augments.json');
  } catch (err) {
    console.error('Scraping failed:', err.message);
  }
})();
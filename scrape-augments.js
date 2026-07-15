// scrape-augments.js
const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

const WIKI_URL = 'https://wiki.leagueoflegends.com/en-us/Arena_(League_of_Legends)/Augments';

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

        // Parse all possible numeric stats from description
        const effects = {};

        // Helper: find a number followed by a stat name (case insensitive)
        const findStat = (regex, key) => {
          const match = desc.match(regex);
          if (match) {
            const val = parseFloat(match[1]);
            if (!isNaN(val)) effects[key] = val;
          }
        };

        // Basic stats
        findStat(/(\+?\d+(?:\.\d+)?)\s*(?:bonus\s*)?health/i, 'health');
        findStat(/(\+?\d+(?:\.\d+)?)\s*(?:bonus\s*)?mana/i, 'mana');
        findStat(/(\+?\d+(?:\.\d+)?)\s*(?:bonus\s*)?armor/i, 'armor');
        findStat(/(\+?\d+(?:\.\d+)?)\s*(?:bonus\s*)?magic\s*resistance/i, 'magicResistance');
        findStat(/(\+?\d+(?:\.\d+)?)\s*(?:bonus\s*)?attack\s*damage/i, 'attackDamage');
        findStat(/(\+?\d+(?:\.\d+)?)\s*(?:bonus\s*)?ability\s*power/i, 'abilityPower');
        findStat(/(\+?\d+(?:\.\d+)?)\s*(?:bonus\s*)?adaptive\s*force/i, 'adaptiveForce');

        // Attack speed (percent)
        findStat(/(\+?\d+(?:\.\d+)?)\s*(?:%\s*)?(?:bonus\s*)?attack\s*speed/i, 'attackSpeedPercent');

        // Ability haste
        findStat(/(\+?\d+(?:\.\d+)?)\s*(?:bonus\s*)?ability\s*haste/i, 'abilityHaste');

        // Critical strike chance
        findStat(/(\+?\d+(?:\.\d+)?)\s*(?:%\s*)?(?:bonus\s*)?crit(?:ical)?\s*(?:strike\s*)?chance/i, 'critChance');

        // Lethality
        findStat(/(\+?\d+(?:\.\d+)?)\s*(?:bonus\s*)?lethality/i, 'lethality');

        // Penetrations
        findStat(/(\+?\d+(?:\.\d+)?)\s*(?:bonus\s*)?(?:flat\s*)?magic\s*pen(?:etration)?/i, 'flatMagicPen');
        findStat(/(\+?\d+(?:\.\d+)?)\s*(?:%\s*)?(?:bonus\s*)?(?:percent\s*)?magic\s*pen(?:etration)?/i, 'percentMagicPen');
        findStat(/(\+?\d+(?:\.\d+)?)\s*(?:bonus\s*)?(?:flat\s*)?armor\s*pen(?:etration)?/i, 'flatArmorPen');
        findStat(/(\+?\d+(?:\.\d+)?)\s*(?:%\s*)?(?:bonus\s*)?(?:percent\s*)?armor\s*pen(?:etration)?/i, 'percentArmorPen');

        // Heal & shield power
        findStat(/(\+?\d+(?:\.\d+)?)\s*(?:%\s*)?(?:bonus\s*)?(?:heal\s*(?:and|&)\s*)?shield\s*power/i, 'healShieldPower');

        // Lifesteal / spell vamp / omnivamp
        findStat(/(\+?\d+(?:\.\d+)?)\s*(?:%\s*)?(?:bonus\s*)?life\s*steal/i, 'lifeSteal');
        findStat(/(\+?\d+(?:\.\d+)?)\s*(?:%\s*)?(?:bonus\s*)?spell\s*vamp/i, 'spellVamp');
        findStat(/(\+?\d+(?:\.\d+)?)\s*(?:%\s*)?(?:bonus\s*)?omnivamp/i, 'omnivamp');

        // Movement speed
        findStat(/(\+?\d+(?:\.\d+)?)\s*(?:bonus\s*)?movement\s*speed/i, 'moveSpeedFlat');
        findStat(/(\+?\d+(?:\.\d+)?)\s*(?:%\s*)?(?:bonus\s*)?movement\s*speed/i, 'moveSpeedPercent');

        // Attack range
        findStat(/(\+?\d+(?:\.\d+)?)\s*(?:bonus\s*)?attack\s*range/i, 'attackRange');

        // Tenacity / slow resist
        findStat(/(\+?\d+(?:\.\d+)?)\s*(?:%\s*)?(?:bonus\s*)?tenacity/i, 'tenacity');
        findStat(/(\+?\d+(?:\.\d+)?)\s*(?:%\s*)?(?:bonus\s*)?slow\s*resist/i, 'slowResist');

        augments.push({ name, desc, icon: iconUrl, effects });
      });
    });

    // Deduplicate by name
    const uniqueAugments = augments.filter((v, i, a) => a.findIndex(t => t.name === v.name) === i);

    console.log(`Found ${uniqueAugments.length} augments.`);
    fs.writeFileSync('augments.json', JSON.stringify(uniqueAugments, null, 2));
    console.log('Saved to augments.json');
  } catch (err) {
    console.error('Scraping failed:', err.message);
  }
})();
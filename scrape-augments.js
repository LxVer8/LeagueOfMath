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

    // Find the correct table by checking for "Augment" header
    $('table.wikitable').each((i, table) => {
      const headers = $(table).find('tr th');
      let hasAugmentHeader = false;
      headers.each((j, th) => {
        if ($(th).text().trim().toLowerCase() === 'augment') hasAugmentHeader = true;
      });
      if (!hasAugmentHeader) return;

      // Data rows
      $(table).find('tbody tr').each((j, row) => {
        const cols = $(row).find('td');
        if (cols.length < 2) return;

        // 1. Icon – first image in the first column
        const iconCol = $(cols[0]);
        const img = iconCol.find('img').first();
        let iconUrl = '';
        if (img.length) {
          // The src may be relative or absolute; ensure it's absolute
          let src = img.attr('src') || '';
          if (src.startsWith('/')) {
            src = 'https://wiki.leagueoflegends.com' + src;
          } else if (src.startsWith('//')) {
            src = 'https:' + src;
          }
          iconUrl = src;
        }

        // 2. Name – text in first column (strip quotes/formatting)
        const name = iconCol.text().trim();

        // 3. Description – second column
        const desc = $(cols[1]).text().trim();

        if (!name || name === 'Augment' || desc.startsWith('This table')) return;

        // Parse numeric bonuses as before
        const effects = {};
        const healthMatch = desc.match(/(\+?\d+)\s*(bonus\s*)?health/i);
        if (healthMatch) effects.health = parseInt(healthMatch[1]);

        const armorMatch = desc.match(/(\+?\d+)\s*(bonus\s*)?armor/i);
        if (armorMatch) effects.armor = parseInt(armorMatch[1]);

        const mrMatch = desc.match(/(\+?\d+)\s*(bonus\s*)?magic\s*resistance/i);
        if (mrMatch) effects.magicResistance = parseInt(mrMatch[1]);

        const adMatch = desc.match(/(\+?\d+)\s*(bonus\s*)?attack\s*damage/i);
        if (adMatch) effects.attackDamage = parseInt(adMatch[1]);

        const apMatch = desc.match(/(\+?\d+)\s*(bonus\s*)?ability\s*power/i);
        if (apMatch) effects.abilityPower = parseInt(apMatch[1]);

        const adaptMatch = desc.match(/(\+?\d+)\s*(bonus\s*)?adaptive\s*force/i);
        if (adaptMatch) effects.adaptiveForce = parseInt(adaptMatch[1]);

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
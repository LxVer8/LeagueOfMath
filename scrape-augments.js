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

    // The main augment table is the first wikitable after the page heading
    // We'll target tables that contain "Augment" as a header
    $('table.wikitable').each((i, table) => {
      // Look for a header row that contains "Augment"
      const headers = $(table).find('tr th');
      let hasAugmentHeader = false;
      headers.each((j, th) => {
        if ($(th).text().trim().toLowerCase() === 'augment') hasAugmentHeader = true;
      });
      if (!hasAugmentHeader) return;

      // Each data row
      $(table).find('tbody tr').each((j, row) => {
        const cols = $(row).find('td');
        if (cols.length < 2) return;

        const name = $(cols[0]).text().trim();
        const desc = $(cols[1]).text().trim();

        // Skip empty or irrelevant rows
        if (!name || name === 'Augment' || desc.startsWith('This table')) return;

        // Try to parse numeric stats from the description
        const effects = {};

        // Health bonus: "+300 health", "300 bonus health", "300 Health"
        const healthMatch = desc.match(/(\+?\d+)\s*(bonus\s*)?health/i);
        if (healthMatch) effects.health = parseInt(healthMatch[1]);

        // Armor: "+20 armor", "20 bonus armor"
        const armorMatch = desc.match(/(\+?\d+)\s*(bonus\s*)?armor/i);
        if (armorMatch) effects.armor = parseInt(armorMatch[1]);

        // Magic resistance
        const mrMatch = desc.match(/(\+?\d+)\s*(bonus\s*)?magic\s*resistance/i);
        if (mrMatch) effects.magicResistance = parseInt(mrMatch[1]);

        // Attack damage
        const adMatch = desc.match(/(\+?\d+)\s*(bonus\s*)?attack\s*damage/i);
        if (adMatch) effects.attackDamage = parseInt(adMatch[1]);

        // Ability power
        const apMatch = desc.match(/(\+?\d+)\s*(bonus\s*)?ability\s*power/i);
        if (apMatch) effects.abilityPower = parseInt(apMatch[1]);

        // Adaptive force: "+30 adaptive force", "30 adaptive force"
        const adaptMatch = desc.match(/(\+?\d+)\s*(bonus\s*)?adaptive\s*force/i);
        if (adaptMatch) effects.adaptiveForce = parseInt(adaptMatch[1]);

        // If we found any stat, push the augment
        augments.push({ name, desc, effects });
      });
    });

    // Remove possible duplicates (same name)
    const uniqueAugments = augments.filter((v, i, a) => a.findIndex(t => t.name === v.name) === i);

    console.log(`Found ${uniqueAugments.length} augments.`);
    fs.writeFileSync('augments.json', JSON.stringify(uniqueAugments, null, 2));
    console.log('Saved to augments.json');
  } catch (err) {
    console.error('Scraping failed:', err.message);
  }
})();
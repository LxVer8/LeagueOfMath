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

        // Extract icon URL (handles lazy loading)
        let img = iconCol.find('img').first();
        let iconUrl = '';

        if (img.length) {
          let src = img.attr('data-src') || img.attr('src') || img.attr('data-original') || '';
          if (src && src !== '' && !src.includes('data:image/gif;base64')) {
            if (src.startsWith('//')) {
              src = 'https:' + src;
            } else if (src.startsWith('/')) {
              src = 'https://wiki.leagueoflegends.com' + src;
            } else if (!src.startsWith('http')) {
              src = 'https://wiki.leagueoflegends.com/' + src;
            }
            iconUrl = src;
          }
        }

        const name = iconCol.text().trim();
        const desc = $(cols[1]).text().trim();

        if (!name || name === 'Augment' || desc.startsWith('This table')) return;

        // Parse numeric bonuses (unchanged)
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

    // Remove duplicates
    const uniqueAugments = augments.filter((v, i, a) => a.findIndex(t => t.name === v.name) === i);

    // Create output directory if missing
    if (!fs.existsSync(ICON_DIR)) {
      fs.mkdirSync(ICON_DIR, { recursive: true });
    }

    console.log(`Found ${uniqueAugments.length} augments. Downloading icons...`);

    // Download each icon and update path
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

          // Replace remote URL with local path (relative to HTML)
          aug.icon = `augment_icons/${fileName}`;
        } catch (err) {
          console.warn(`  Failed to download icon for ${aug.name}: ${err.message}`);
          // Keep the remote URL as fallback
        }
      }
    }

    // Save final JSON with local paths
    fs.writeFileSync('augments.json', JSON.stringify(uniqueAugments, null, 2));
    console.log('Saved to augments.json with local icons.');
  } catch (err) {
    console.error('Scraping failed:', err.message);
  }
})();
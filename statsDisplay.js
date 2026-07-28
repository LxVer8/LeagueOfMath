// statsDisplay.js
// Handles the calculation and HTML generation for the stat table.
// Depends on StatCalculator being loaded globally (statCalculator.js).

const statIcons = {
  'Health':               'https://wiki.leagueoflegends.com/en-us/images/Health_icon.png',
  'Mana':                 'https://wiki.leagueoflegends.com/en-us/images/Mana_icon.png',
  'Health Regen':         'https://wiki.leagueoflegends.com/en-us/images/Health_regeneration_icon.png',
  'Mana Regen':           'https://wiki.leagueoflegends.com/en-us/images/Mana_regeneration_icon.png',
  'Armor':                'https://wiki.leagueoflegends.com/en-us/images/Armor_icon.png',
  'Magic Resist':         'https://wiki.leagueoflegends.com/en-us/images/Magic_resistance_icon.png',
  'Attack Damage':        'https://wiki.leagueoflegends.com/en-us/images/Attack_damage_icon.png',
  'Ability Power':        'https://wiki.leagueoflegends.com/en-us/images/Ability_power_icon.svg?c0f6c',
  'Attack Speed':         'https://wiki.leagueoflegends.com/en-us/images/Attack_speed_icon.png',
  'Ability Haste':        'https://wiki.leagueoflegends.com/en-us/images/thumb/Cooldown_reduction_icon.png/15px-Cooldown_reduction_icon.png?27276',
  'Crit Chance':          'https://wiki.leagueoflegends.com/en-us/images/Critical_strike_chance_icon.png',
  'Lethality':            'https://wiki.leagueoflegends.com/en-us/images/Armor_penetration_icon.png',
  'Flat Magic Pen':       'https://wiki.leagueoflegends.com/en-us/images/Magic_penetration_icon.png',
  '% Magic Pen':          'https://wiki.leagueoflegends.com/en-us/images/Magic_penetration_icon.png',
  'Flat Armor Pen':       'https://wiki.leagueoflegends.com/en-us/images/Armor_penetration_icon.png',
  '% Armor Pen':          'https://wiki.leagueoflegends.com/en-us/images/Armor_penetration_icon.png',
  'Heal & Shield Power':  'https://wiki.leagueoflegends.com/en-us/images/Heal_and_shield_power_icon.png',
  'Life Steal':           'https://wiki.leagueoflegends.com/en-us/images/Life_steal_icon.png',
  'Spell Vamp':           'https://wiki.leagueoflegends.com/en-us/images/Spell_vamp_icon.png',
  'Omnivamp':             'https://wiki.leagueoflegends.com/en-us/images/Omnivamp_icon.png',
  'Move Speed':           'https://wiki.leagueoflegends.com/en-us/images/Movement_speed_icon.png',
  '% Move Speed':         'https://wiki.leagueoflegends.com/en-us/images/Movement_speed_icon.png',
  'Attack Range':         'https://wiki.leagueoflegends.com/en-us/images/thumb/Range_icon.png/15px-Range_icon.png?ae16f',
  'Tenacity':             'https://wiki.leagueoflegends.com/en-us/images/Tenacity_icon.png',
  'Slow Resist':          'https://wiki.leagueoflegends.com/en-us/images/thumb/Slow_immune_icon.png/15px-Slow_immune_icon.png?4ad41'
};

/**
 * Generates the HTML for the full stats table.
 *
 * @param {Object}  params
 * @param {string}  params.championKey      - selected champion key (e.g. "Aatrox")
 * @param {Object}  params.championsData    - full champion data from Data Dragon
 * @param {number}  params.level            - current champion level
 * @param {Set}     params.selectedItems    - set of item IDs
 * @param {string|null} params.activeElixir - active elixir ID (or null)
 * @param {Set}     params.selectedAugments- set of augment indices
 * @param {number}  params.hats             - number of Cappa Juice clicks
 * @param {Object}  params.itemStatsData    - item stat values from CommunityDragon
 * @param {Array}   params.augments         - augments array from augments.json
 * @returns {string}  HTML string to be injected into the stats table.
 */
function generateStatsHTML({
  championKey,
  championsData,
  level,
  selectedItems,
  activeElixir,
  selectedAugments,
  hats,
  itemStatsData,
  augments
}) {
  if (!championKey || !championsData[championKey]) {
    return '<tr><td colspan="2">Select a champion</td></tr>';
  }

  const champ = championsData[championKey];

  // Combine selected items + active elixir for calculation
  const effectiveItems = new Set(selectedItems);
  if (activeElixir) effectiveItems.add(activeElixir);

  // Use the external StatCalculator (must be loaded)
  const base = StatCalculator.calculateChampionBaseStats(champ, level);
  const itemBonuses = StatCalculator.calculateItemBonuses(effectiveItems, itemStatsData);
  const augmentBonuses = StatCalculator.calculateAugmentBonuses(selectedAugments, augments);
  const final = StatCalculator.computeFinalStats(
    base, itemBonuses, augmentBonuses, level,
    selectedAugments, augments
  );

  final.hats = hats;

  // Helper to check if a value differs from the base (for highlighting)
  function isModified(label) {
    if (label === 'Hats') return final.hats > 0;
    switch (label) {
      case 'Health':            return final.health !== base.health;
      case 'Mana':              return final.mana !== base.mana;
      case 'Health Regen':      return final.healthRegen5 !== (base.healthRegen || 0) * 5;
      case 'Mana Regen':        return final.manaRegen5 !== (base.manaRegen || 0) * 5;
      case 'Armor':             return final.armor !== base.armor;
      case 'Magic Resist':      return final.magicResistance !== base.magicResistance;
      case 'Attack Damage':     return final.attackDamage !== base.attackDamage;
      case 'Ability Power':     return final.abilityPower !== 0;
      case 'Attack Speed':
        const baseAS = base.attackSpeed * (1 + (base.attackSpeedPerLevel || 0) * (level - 1));
        return final.attackSpeed !== baseAS;
      case 'Ability Haste':     return final.abilityHaste !== 0;
      case 'Crit Chance':       return final.critChance !== 0;
      case 'Lethality':         return final.lethality !== 0;
      case 'Flat Magic Pen':    return final.flatMagicPen !== 0;
      case '% Magic Pen':       return final.percentMagicPen !== 0;
      case 'Flat Armor Pen':    return final.flatArmorPen !== 0;
      case '% Armor Pen':       return final.percentArmorPen !== 0;
      case 'Heal & Shield Power': return final.healShieldPower !== 0;
      case 'Life Steal':        return final.lifeSteal !== 0;
      case 'Spell Vamp':        return final.spellVamp !== 0;
      case 'Omnivamp':          return final.omnivamp !== 0;
      case 'Move Speed':        return final.moveSpeed !== base.moveSpeed;
      case '% Move Speed':      return final.moveSpeedPercent !== 0;
      case 'Attack Range':      return final.attackRange !== 0;
      case 'Tenacity':          return final.tenacity !== 0;
      case 'Slow Resist':       return final.slowResist !== 0;
      default: return false;
    }
  }

  const rows = [];

  function addRow(label, value, formatter) {
    const iconUrl = statIcons[label] || '';
    const iconHTML = iconUrl
      ? `<img class="stat-icon" src="${iconUrl}" alt="${label}" onerror="this.style.display='none';">`
      : '';

    let display;
    if (label === 'Hats') {
      display = Math.round(value);
    } else if (formatter === 'percent') {
      display = (value * 100).toFixed(1) + '%';
    } else if (formatter === 'as') {
      display = value.toFixed(3);
    } else {
      display = Math.round(value);
    }

    const modClass = isModified(label) ? ' class="modified"' : '';
    rows.push(`<tr><td>${iconHTML} ${label}</td><td${modClass}>${display}</td></tr>`);
  }

  addRow('Health',               final.health,            'integer');
  addRow('Mana',                 final.mana,              'integer');
  addRow('Health Regen',         final.healthRegen5,      'integer');
  addRow('Mana Regen',           final.manaRegen5,        'integer');
  addRow('Armor',                final.armor,             'integer');
  addRow('Magic Resist',         final.magicResistance,   'integer');
  addRow('Attack Damage',        final.attackDamage,      'integer');
  addRow('Ability Power',        final.abilityPower,      'integer');
  addRow('Attack Speed',         final.attackSpeed,       'as');
  addRow('Ability Haste',        final.abilityHaste,      'integer');
  addRow('Crit Chance',          final.critChance,        'percent');
  addRow('Lethality',            final.lethality,         'integer');
  addRow('Flat Magic Pen',       final.flatMagicPen,      'integer');
  addRow('% Magic Pen',          final.percentMagicPen,   'percent');
  addRow('Flat Armor Pen',       final.flatArmorPen,      'integer');
  addRow('% Armor Pen',          final.percentArmorPen,   'percent');
  addRow('Heal & Shield Power',  final.healShieldPower,   'percent');
  addRow('Life Steal',           final.lifeSteal,         'percent');
  addRow('Spell Vamp',           final.spellVamp,         'percent');
  addRow('Omnivamp',             final.omnivamp,          'percent');
  addRow('Move Speed',           final.moveSpeed,         'integer');
  addRow('% Move Speed',         final.moveSpeedPercent,  'percent');
  addRow('Attack Range',         final.attackRange,       'integer');
  addRow('Tenacity',             final.tenacity,          'percent');
  addRow('Slow Resist',          final.slowResist,        'percent');
  addRow('Hats',                 final.hats,              'integer');

  return rows.join('');
}
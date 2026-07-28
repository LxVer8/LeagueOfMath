// statCalculator.js

// ============================
//  CHAMPION BASE STATS
// ============================

/**
 * Computes a base stat at a given level using the correct League of Legends scaling curves.
 * @param {number} base - Base value at level 1.
 * @param {number} growth - Growth per level.
 * @param {number} g - (level - 1)
 * @param {string} factorType - 'hp_ad', 'mana', 'regen', or 'linear'
 * @returns {number}
 */
function getScaledStat(base, growth, g, factorType) {
  if (factorType === 'linear') {
    return base + growth * g;
  }
  let f;
  switch (factorType) {
    case 'hp_ad':       f = 0.685 + 0.0175 * g; break;
    case 'mana':        f = 0.5   + 0.025  * g; break;
    case 'regen':       f = 0.75  + 0.025  * g; break;
    default:            f = 0.685 + 0.0175 * g; // fallback
  }
  return base + growth * g * f;
}

/**
 * Returns the base stats of a champion at the given level.
 * @param {object} champData - Champion object from Data Dragon.
 * @param {number} level - 1–18
 * @returns {object}
 */
function calculateChampionBaseStats(champData, level) {
  const g = level - 1;
  const stats = champData.stats;
  return {
    health:           getScaledStat(stats.hp,             stats.hpperlevel,             g, 'hp_ad'),
    mana:             getScaledStat(stats.mp,             stats.mpperlevel,             g, 'mana'),
    armor:            getScaledStat(stats.armor,          stats.armorperlevel,          g, 'linear'),
    magicResistance:  getScaledStat(stats.spellblock,     stats.spellblockperlevel,     g, 'linear'),
    attackDamage:     getScaledStat(stats.attackdamage,   stats.attackdamageperlevel,   g, 'hp_ad'),
    healthRegen:      getScaledStat(stats.hpregen,        stats.hpregenperlevel,        g, 'regen'),
    manaRegen:        getScaledStat(stats.mpregen,        stats.mpregenperlevel,        g, 'regen'),
    attackSpeed:      stats.attackspeed,                           // base AS at level 1
    attackSpeedPerLevel: stats.attackspeedperlevel / 100,          // ratio per level
    moveSpeed:        stats.movespeed,
    abilityPower:     0
  };
}

// ============================
//  ITEM STAT MAPPING
// ============================

// CommunityDragon stat names → internal keys
const itemStatMap = {
  FlatHPPoolMod:              'health',
  FlatMPPoolMod:              'mana',
  FlatArmorMod:               'armor',
  FlatSpellBlockMod:          'magicResistance',
  FlatPhysicalDamageMod:      'attackDamage',
  FlatMagicDamageMod:         'abilityPower',
  FlatHPRegenMod:             'healthRegenFlat',
  FlatMPRegenMod:             'manaRegenFlat',
  PercentAttackSpeedMod:      'attackSpeedPercent',
  AbilityHaste:               'abilityHaste',
  CritChance:                 'critChance',
  Lethality:                  'lethality',
  FlatMagicPenetration:       'flatMagicPen',
  PercentMagicPenetration:    'percentMagicPen',
  FlatArmorPenetration:       'flatArmorPen',
  PercentArmorPenetration:    'percentArmorPen',
  HealAndShieldPower:         'healShieldPower',
  PercentLifeStealMod:        'lifeSteal',
  SpellVamp:                  'spellVamp',
  Omnivamp:                   'omnivamp',
  FlatMovementSpeedMod:       'moveSpeedFlat',
  PercentMovementSpeedMod:    'moveSpeedPercent',
  AttackRange:                'attackRange',
  Tenacity:                   'tenacity',
  SlowResist:                 'slowResist'
};

/**
 * Sums up stat bonuses from selected items using CommunityDragon data.
 * @param {Set<number|string>} selectedItems - Set of item IDs.
 * @param {object} itemStatsData - Map of item ID → { statName: value } (from CDragon)
 * @returns {object}
 */
function calculateItemBonuses(selectedItems, itemStatsData) {
  const bonuses = {
    health: 0, mana: 0, armor: 0, magicResistance: 0,
    attackDamage: 0, abilityPower: 0,
    healthRegenFlat: 0, manaRegenFlat: 0,
    attackSpeedPercent: 0,
    abilityHaste: 0,
    critChance: 0,
    lethality: 0,
    flatMagicPen: 0, percentMagicPen: 0,
    flatArmorPen: 0, percentArmorPen: 0,
    healShieldPower: 0,
    lifeSteal: 0, spellVamp: 0, omnivamp: 0,
    moveSpeedFlat: 0, moveSpeedPercent: 0,
    attackRange: 0,
    tenacity: 0, slowResist: 0,
    adaptiveForce: 0
  };

  selectedItems.forEach(id => {
    const stats = itemStatsData[id];
    if (!stats) return;
    for (const [key, val] of Object.entries(stats)) {
      if (itemStatMap[key]) {
        bonuses[itemStatMap[key]] += val;
      }
    }
  });

  return bonuses;
}

// ============================
//  AUGMENT EFFECTS
// ============================

// Hardcoded augment → stat bonuses.
// Add every augment you support here. 'custom' means handled separately.
const augmentEffects = {
  'Giant Slayer':          { attackDamage: 30, health: 150 },
  'Lightning Strikes':     { attackSpeedPercent: 0.30 },
  'Mystic Punch':          { abilityHaste: 20 },
  'Bread and Cheese':      { health: 200, mana: 200 },
  'Executioner':           { attackDamage: 20, lethality: 10 },
  'Scoped Weapons':        { attackRange: 200 },
  'Juice':                 { healShieldPower: 0.20 },
  'Omni‑Soul':             { omnivamp: 0.15 },
  'First Aid Kit':         { healthRegenFlat: 25, manaRegenFlat: 15 },
  'Feel the Burn':         { flatMagicPen: 15 },
  'Back to Basics':        { abilityPower: 40 },
  'Die Another Day':       { tenacity: 0.25, slowResist: 0.25 },
  "It's Critical":         { critChance: 0.40 },
  'Slow Cooker':           { moveSpeedPercent: 0.10 },
  'ADAPt':                 'custom'
  // … add more as needed
};

/**
 * Calculates stat bonuses from selected augments.
 * @param {Set<number>} selectedAugments - Indices of selected augments.
 * @param {Array} augments - Full augments array from augments.json.
 * @returns {object}
 */
function calculateAugmentBonuses(selectedAugments, augments) {
  const bonuses = {
    health: 0, mana: 0, armor: 0, magicResistance: 0,
    attackDamage: 0, abilityPower: 0,
    healthRegenFlat: 0, manaRegenFlat: 0,
    attackSpeedPercent: 0,
    abilityHaste: 0,
    critChance: 0,
    lethality: 0,
    flatMagicPen: 0, percentMagicPen: 0,
    flatArmorPen: 0, percentArmorPen: 0,
    healShieldPower: 0,
    lifeSteal: 0, spellVamp: 0, omnivamp: 0,
    moveSpeedFlat: 0, moveSpeedPercent: 0,
    attackRange: 0,
    tenacity: 0, slowResist: 0,
    adaptiveForce: 0
  };

  selectedAugments.forEach(index => {
    const aug = augments[index];
    if (!aug) return;
    const effect = augmentEffects[aug.name];
    if (!effect || effect === 'custom') return;  // custom effects handled later
    for (const [stat, val] of Object.entries(effect)) {
      if (bonuses.hasOwnProperty(stat)) {
        bonuses[stat] += (typeof val === 'number' ? val : 0);
      }
    }
  });

  return bonuses;
}

// ----- CUSTOM AUGMENT EFFECTS -----
const CUSTOM_AUGMENTS = {
  'ADAPt': (final, base) => {
    const bonusAD = final.attackDamage - base.attackDamage;
    if (bonusAD > 0) {
      final.attackDamage = base.attackDamage;
      final.abilityPower += bonusAD * 1.67;
    }
    final.abilityPower *= 1.10;
  }
};

function applyCustomAugmentEffects(selectedAugments, augments, finalStats, baseStats) {
  selectedAugments.forEach(index => {
    const aug = augments[index];
    if (!aug) return;
    const custom = CUSTOM_AUGMENTS[aug.name];
    if (custom) {
      custom(finalStats, baseStats);
    }
  });
}

// ============================
//  COMPUTE FINAL STATS
// ============================

/**
 * Combines base, item, and augment bonuses into final stats.
 * @param {object} base - Champion base stats at level.
 * @param {object} itemBonuses
 * @param {object} augmentBonuses
 * @param {number} level
 * @param {Set<number>} selectedAugments - Indices of selected augments.
 * @param {Array} augments - Full augments array.
 * @returns {object}
 */
function computeFinalStats(base, itemBonuses, augmentBonuses, level, selectedAugments, augments) {
  // Merge bonuses
  const totalBonuses = {};
  for (const key in itemBonuses) {
    totalBonuses[key] = (itemBonuses[key] || 0) + (augmentBonuses[key] || 0);
  }

  // Adaptive force: gives AD if you have more bonus AD than AP, else AP
  const adaptive = totalBonuses.adaptiveForce || 0;
  let adBonus = totalBonuses.attackDamage || 0;
  let apBonus = totalBonuses.abilityPower || 0;
  if (adBonus > apBonus) {
    adBonus += adaptive;
  } else {
    apBonus += adaptive;
  }

  // Attack speed formula: base AS * (1 + bonus from level + bonus from items/augments)
  const asBase = base.attackSpeed;
  const asPerLevel = base.attackSpeedPerLevel || 0;
  const asBonus = totalBonuses.attackSpeedPercent || 0;
  const totalAS = asBase * (1 + asPerLevel * (level - 1) + asBonus);

  const final = {
    health: base.health + (totalBonuses.health || 0),
    mana: base.mana + (totalBonuses.mana || 0),
    healthRegen5: ((base.healthRegen || 0) + (totalBonuses.healthRegenFlat || 0)) * 5,
    manaRegen5: ((base.manaRegen || 0) + (totalBonuses.manaRegenFlat || 0)) * 5,
    armor: base.armor + (totalBonuses.armor || 0),
    magicResistance: base.magicResistance + (totalBonuses.magicResistance || 0),
    attackDamage: base.attackDamage + adBonus,
    abilityPower: base.abilityPower + apBonus,
    attackSpeed: totalAS,
    abilityHaste: totalBonuses.abilityHaste || 0,
    critChance: totalBonuses.critChance || 0,
    lethality: totalBonuses.lethality || 0,
    flatMagicPen: totalBonuses.flatMagicPen || 0,
    percentMagicPen: totalBonuses.percentMagicPen || 0,
    flatArmorPen: totalBonuses.flatArmorPen || 0,
    percentArmorPen: totalBonuses.percentArmorPen || 0,
    healShieldPower: totalBonuses.healShieldPower || 0,
    lifeSteal: totalBonuses.lifeSteal || 0,
    spellVamp: totalBonuses.spellVamp || 0,
    omnivamp: totalBonuses.omnivamp || 0,
    moveSpeed: (base.moveSpeed || 0) + (totalBonuses.moveSpeedFlat || 0),
    moveSpeedPercent: totalBonuses.moveSpeedPercent || 0,
    attackRange: totalBonuses.attackRange || 0,
    tenacity: totalBonuses.tenacity || 0,
    slowResist: totalBonuses.slowResist || 0
  };

  // Apply custom augments (e.g., ADAPt) after base calculations
  if (selectedAugments && augments) {
    applyCustomAugmentEffects(selectedAugments, augments, final, base);
  }

  return final;
}

// ============================
//  EXPORT
// ============================
window.StatCalculator = {
  calculateChampionBaseStats,
  calculateItemBonuses,
  calculateAugmentBonuses,
  computeFinalStats
};
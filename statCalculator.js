// statCalculator.js

// ============================
//  CHAMPION BASE STATS
// ============================

function getScaledStat(base, growth, g, factorType) {
  if (factorType === 'linear') {
    return base + growth * g;
  }
  let f;
  switch (factorType) {
      case 'hp_ad':       f = 0.685 + 0.0175 * g; break;
      case 'mana':        f = 0.7025 + 0.0175 * g; break;
      case 'regen':       f = 0.75  + 0.025  * g; break;
      case 'armor':
      case 'mr':          f = 0.65  + 0.035  * g; break;
      default:            f = 0.685 + 0.0175 * g;
  }
  return base + growth * g * f;
}

function calculateChampionBaseStats(champData, level) {
  const g = level - 1;
  const stats = champData.stats;
  return {
    health:           getScaledStat(stats.hp,             stats.hpperlevel,             g, 'hp_ad'),
    mana:             getScaledStat(stats.mp,             stats.mpperlevel,             g, 'mana'),
    armor:            getScaledStat(stats.armor,          stats.armorperlevel,          g, 'armor'),
    magicResistance:  getScaledStat(stats.spellblock,     stats.spellblockperlevel,     g, 'mr'),
    attackDamage:     getScaledStat(stats.attackdamage,   stats.attackdamageperlevel,   g, 'hp_ad'),
    healthRegen:      getScaledStat(stats.hpregen,        stats.hpregenperlevel,        g, 'regen'),
    manaRegen:        getScaledStat(stats.mpregen,        stats.mpregenperlevel,        g, 'regen'),
    attackSpeed:      stats.attackspeed,
    attackSpeedPerLevel: stats.attackspeedperlevel / 100,
    moveSpeed:        stats.movespeed,
    abilityPower:     0
  };
}

// ============================
//  ITEM STAT MAPPING
// ============================

function calculateItemBonuses(selectedItems, itemStatsData) {
  const bonuses = {
    health: 0, mana: 0, armor: 0, magicResistance: 0,
    attackDamage: 0, abilityPower: 0,
    healthRegenFlat: 0, manaRegenFlat: 0,
    healthRegenPercent: 0, manaRegenPercent: 0,   // ← add these
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
      if (bonuses.hasOwnProperty(key) && key !== 'name') {   // ignore the 'name' field
        bonuses[key] += (typeof val === 'number' ? val : 0);
      }
    }
  });
  return bonuses;
}

// ============================
//  AUGMENT EFFECTS
// ============================

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
};

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
    if (!effect || effect === 'custom') return;
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
//  CHAMPION PASSIVE CONVERSIONS
// ============================

function applyChampionPassives(finalStats, championKey) {
  if (!championKey || typeof championPassives === 'undefined') return;
  const passive = championPassives[championKey];
  if (!passive) return;

  // --- Ryze: Arcane Mastery (mana from AP) ---
  if (passive.manaMultiplierFromAP) {
    const ap = finalStats.abilityPower || 0;
    const percentPer100 = passive.manaMultiplierFromAP.percentPer100AP; // 10
    const multiplier = 1 + (ap * (percentPer100 / 10000));   // 10% per 100 AP → 0.001 per AP
    finalStats.mana = Math.round(finalStats.mana * multiplier);
  }
}

// ============================
//  COMPUTE FINAL STATS
// ============================

function computeFinalStats(base, itemBonuses, augmentBonuses, level, selectedAugments, augments, championKey) {
  const totalBonuses = {};
  for (const key in itemBonuses) {
    totalBonuses[key] = (itemBonuses[key] || 0) + (augmentBonuses[key] || 0);
  }

  // Adaptive force
  const adaptive = totalBonuses.adaptiveForce || 0;
  let adBonus = totalBonuses.attackDamage || 0;
  let apBonus = totalBonuses.abilityPower || 0;
  if (adBonus > apBonus) {
    adBonus += adaptive;
  } else {
    apBonus += adaptive;
  }

  // Attack speed
  const asBase = base.attackSpeed;
  const asPerLevel = base.attackSpeedPerLevel || 0;
  const asBonus = totalBonuses.attackSpeedPercent || 0;
  const totalAS = asBase * (1 + asPerLevel * (level - 1) + asBonus);

  // Convert percent regen to flat using base regen
  const healthRegenPercent = totalBonuses.healthRegenPercent || 0;
  const manaRegenPercent   = totalBonuses.manaRegenPercent   || 0;
  const healthRegenFlat = (base.healthRegen || 0) + (totalBonuses.healthRegenFlat || 0) + (base.healthRegen || 0) * healthRegenPercent;
  const manaRegenFlat   = (base.manaRegen   || 0) + (totalBonuses.manaRegenFlat   || 0) + (base.manaRegen   || 0) * manaRegenPercent;

  const final = {
    health: base.health + (totalBonuses.health || 0),
    mana: base.mana + (totalBonuses.mana || 0),
    healthRegen: healthRegenFlat,
    manaRegen:   manaRegenFlat,
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

  // Custom augment effects
  if (selectedAugments && augments) {
    applyCustomAugmentEffects(selectedAugments, augments, final, base);
  }

  // Champion‑specific passives
  applyChampionPassives(final, championKey);

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
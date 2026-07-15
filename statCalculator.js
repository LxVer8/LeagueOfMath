// statCalculator.js

function getChampionBaseStat(champData, level, baseKey, growthKey) {
  const g = level - 1;
  return champData.stats[baseKey] + champData.stats[growthKey] * g * (0.7025 + 0.0175 * g);
}

function calculateChampionBaseStats(champData, level) {
  return {
    health: getChampionBaseStat(champData, level, 'hp', 'hpperlevel'),
    mana: getChampionBaseStat(champData, level, 'mp', 'mpperlevel'),
    armor: getChampionBaseStat(champData, level, 'armor', 'armorperlevel'),
    magicResistance: getChampionBaseStat(champData, level, 'spellblock', 'spellblockperlevel'),
    attackDamage: getChampionBaseStat(champData, level, 'attackdamage', 'attackdamageperlevel'),
    abilityPower: 0,
    healthRegen: getChampionBaseStat(champData, level, 'hpregen', 'hpregenperlevel'),
    manaRegen: getChampionBaseStat(champData, level, 'mpregen', 'mpregenperlevel'),
    attackSpeed: champData.stats.attackspeed,
    attackSpeedPerLevel: champData.stats.attackspeedperlevel / 100,
    moveSpeed: champData.stats.movespeed
  };
}

const itemStatMap = {
  FlatHPPoolMod: 'health',
  FlatMPPoolMod: 'mana',
  FlatArmorMod: 'armor',
  FlatSpellBlockMod: 'magicResistance',
  FlatPhysicalDamageMod: 'attackDamage',
  FlatMagicDamageMod: 'abilityPower',
  FlatHPRegenMod: 'healthRegenFlat',
  FlatMPRegenMod: 'manaRegenFlat',
  PercentAttackSpeedMod: 'attackSpeedPercent',
  AbilityHaste: 'abilityHaste',
  CritChance: 'critChance',
  Lethality: 'lethality',
  FlatMagicPenetration: 'flatMagicPen',
  PercentMagicPenetration: 'percentMagicPen',
  FlatArmorPenetration: 'flatArmorPen',
  PercentArmorPenetration: 'percentArmorPen',
  HealAndShieldPower: 'healShieldPower',
  PercentLifeStealMod: 'lifeSteal',
  SpellVamp: 'spellVamp',
  Omnivamp: 'omnivamp',
  FlatMovementSpeedMod: 'moveSpeedFlat',
  PercentMovementSpeedMod: 'moveSpeedPercent',
  AttackRange: 'attackRange',
  Tenacity: 'tenacity',
  SlowResist: 'slowResist'
};

function calculateItemBonuses(selectedItems, itemsData) {
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
    const item = itemsData[id];
    if (!item?.stats) return;
    for (const [key, val] of Object.entries(item.stats)) {
      if (itemStatMap[key]) {
        bonuses[itemStatMap[key]] += val;
      }
    }
  });

  return bonuses;
}

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
    if (aug?.effects) {
      for (const [key, val] of Object.entries(aug.effects)) {
        if (bonuses.hasOwnProperty(key)) {
          bonuses[key] += (typeof val === 'number' ? val : 0);
        }
      }
    }
  });

  return bonuses;
}

function computeFinalStats(base, itemBonuses, augmentBonuses, level) {
  const totalBonuses = {};
  for (const key in itemBonuses) {
    totalBonuses[key] = (itemBonuses[key] || 0) + (augmentBonuses[key] || 0);
  }

  const adaptive = totalBonuses.adaptiveForce || 0;
  let adBonus = totalBonuses.attackDamage || 0;
  let apBonus = totalBonuses.abilityPower || 0;
  if (adBonus > apBonus) {
    adBonus += adaptive;
  } else {
    apBonus += adaptive;
  }

  const asBase = base.attackSpeed;
  const asPerLevel = base.attackSpeedPerLevel || 0;
  const asBonus = totalBonuses.attackSpeedPercent || 0;
  const totalAS = asBase * (1 + asPerLevel * (level - 1) + asBonus);

  return {
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
}

window.StatCalculator = {
  calculateChampionBaseStats,
  calculateItemBonuses,
  calculateAugmentBonuses,
  computeFinalStats
};
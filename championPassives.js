// championPassives.js
// Champion‑specific stat conversions.
// Each key is the Data Dragon champion key (e.g. "Ryze").
// The function applyChampionPassives() in statCalculator.js will use these.

const championPassives = {

  // Ryze – Arcane Mastery: +10% max mana per 100 AP
  "Ryze": {
    manaMultiplierFromAP: { percentPer100AP: 10 }
  },

  // Vladimir – Crimson Pact (updated)
  "Vladimir": {
    // 3.333% bonus HP → AP  (1/30)
    abilityPowerPerBonusHealth: 1 / 30,
    // 160% AP → bonus HP
    healthPerAP: 1.6
  },

  // Jhin – Every Moment Matters (updated)
  "Jhin": {
    // Level-based AD multiplier: 4% at level 1, +0.40% per level? Actually 4% to 44% linear.
    levelBaseADPercent: 0.04,          // 4%
    levelADPercentPerLevel: 0.40 / 17, // (44% - 4%) / 17 ≈ 0.023529
    adPerCritPercent: 0.0035,          // 0.35% per 1% crit
    adPerASPercent: 0.003              // 0.3% per 1% bonus AS
  },

  // Pyke – Gift of the Drowned Ones
  "Pyke": {
    adPerBonusHealth: 1 / 14   // 14 HP = 1 AD
  },

  // Senna – Absolution (crit overflow + AS penalty)
  "Senna": {
    excessCritToLifesteal: true,
    attackSpeedMultiplier: 0.3
  }
};
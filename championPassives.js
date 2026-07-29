// championPassives.js
// Contains special stat conversions for champions.
// Each key is the champion's Data Dragon key (e.g. "Ryze").
// The definitions are applied **after** the basic stats have been computed.

const championPassives = {
  "Ryze": {
    // Arcane Mastery: Innate: Ryze increases his maximum mana by 10% per 100 AP.
    // Formula: final mana = (base + bonuses) * (1 + 0.001 * abilityPower)
    manaMultiplierFromAP: {
      percentPer100AP: 10   // 10% per 100 AP → multiplier = 1 + AP * 0.001
    }
  }
  // Add more champions here later
};
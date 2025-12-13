export const ranks = [
    '🌸 Citizen',
    '🔎 Cleric',
    '🔮 Wizard',
    '♦️ Mage',
    '🎯 Noble',
    '🎯 Noble II',
    '✨ Elite',
    '✨ Elite II',
    '✨ Elite III',
    '🔶️ Ace',
    '🔶️ Ace II',
    '🔶️ Ace III',
    '🔶️ Ace IV',
    '☣ Knight',
    '☣ Knight II',
    '☣ Knight III',
    '☣ Knight IV',
    '☣ Knight V',
    '🌀 Hero',
    '🌀 Hero II',
    '🌀 Hero III',
    '🌀 Hero IV',
    '🌀 Hero V',
    '💎 Supreme',
    '💎 Supreme II',
    '💎 Supreme III',
    '💎 Supreme IV',
    '💎 Supreme V',
    '❄️ Mystic',
    '❄️ Mystic II',
    '❄️ Mystic III',
    '❄️ Mystic IV',
    '❄️ Mystic V',
    '🔆 Legendary',
    '🔆 Legendary II',
    '🔆 Legendary III',
    '🔆 Legendary IV',
    '🔆 Legendary V',
    '🛡 Guardian',
    '🛡 Guardian II',
    '🛡 Guardian III',
    '🛡 Guardian IV',
    '🛡 Guardian V',
    '♨ Valor'
]

export const getStats = (
  experience: number
): { level: number; requiredXpToLevelUp: number; rank: string; currentXpInLevel: number } => {
  const baseXp = 450;
  let level = 1;
  let requiredXpToLevelUp = baseXp;

  // Calculate level and remaining XP
  while (experience >= requiredXpToLevelUp) {
    experience -= requiredXpToLevelUp;
    level++;
    requiredXpToLevelUp = baseXp * level;
  }

  const rank = ranks[Math.min(level - 1, ranks.length - 1)];
  const currentXpInLevel = experience; // XP progress within the current level

  return {
    level,
    requiredXpToLevelUp,
    rank,
    currentXpInLevel, // Include for rank card display
  };
};

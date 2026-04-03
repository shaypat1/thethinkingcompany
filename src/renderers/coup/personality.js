// Personality modifiers — applied to any bot tier

export const PERSONALITIES = {
  aggressive: {
    name: 'Aggressive',
    challengeMod: 0.1,
    bluffMod: 0.1,
    aggressiveMod: 0.15,
  },
  cautious: {
    name: 'Cautious',
    challengeMod: -0.1,
    bluffMod: -0.1,
    aggressiveMod: -0.1,
  },
  greedy: {
    name: 'Greedy',
    challengeMod: 0,
    bluffMod: 0.05,
    aggressiveMod: -0.05,
  },
  paranoid: {
    name: 'Paranoid',
    challengeMod: 0.15,
    bluffMod: -0.1,
    aggressiveMod: 0,
  },
  social: {
    name: 'Social',
    challengeMod: 0,
    bluffMod: 0,
    aggressiveMod: 0.05,
  },
  ruthless: {
    name: 'Ruthless',
    challengeMod: 0.05,
    bluffMod: 0.05,
    aggressiveMod: 0.2,
  },
}

export const PERSONALITY_NAMES = Object.keys(PERSONALITIES)

export function getPersonality(name) {
  return PERSONALITIES[name] || PERSONALITIES.cautious
}

// Bot names per personality
export const BOT_NAMES = {
  aggressive: ['Viktor', 'Blaze', 'Raven', 'Storm', 'Fang'],
  cautious: ['Elena', 'Sage', 'Milo', 'Quinn', 'Frost'],
  greedy: ['Nico', 'Goldie', 'Rex', 'Lux', 'Sterling'],
  paranoid: ['Iris', 'Shade', 'Cipher', 'Ghost', 'Wren'],
  social: ['Luna', 'Felix', 'Coral', 'Dash', 'Sky'],
  ruthless: ['Zara', 'Vex', 'Onyx', 'Reaper', 'Talon'],
}

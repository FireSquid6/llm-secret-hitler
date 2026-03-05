import type { Quest } from ".";

export const questInfo: Record<number, Quest[]> = {
  5: [
    {
      players: 2,
      failsRequired: 1,
    },
    {
      players: 3,
      failsRequired: 1,
    },
    {
      players: 2,
      failsRequired: 1,
    },
    {
      players: 3,
      failsRequired: 1,
    },
    {
      players: 3,
      failsRequired: 1,
    },
  ],
  6: [
    {
      players: 2,
      failsRequired: 1,
    },
    {
      players: 3,
      failsRequired: 1,
    },
    {
      players: 4,
      failsRequired: 1,
    },
    {
      players: 3,
      failsRequired: 1,
    },
    {
      players: 4,
      failsRequired: 1,
    },
  ],
  7: [
    {
      players: 2,
      failsRequired: 1,
    },
    {
      players: 3,
      failsRequired: 1,
    },
    {
      players: 3,
      failsRequired: 1,
    },
    {
      players: 4,
      failsRequired: 2,
    },
    {
      players: 4,
      failsRequired: 1,
    },
  ],
  8: [
    {
      players: 3,
      failsRequired: 1,
    },
    {
      players: 4,
      failsRequired: 1,
    },
    {
      players: 4,
      failsRequired: 1,
    },
    {
      players: 5,
      failsRequired: 2,
    },
    {
      players: 5,
      failsRequired: 1,
    },
  ],
  9: [
    {
      players: 3,
      failsRequired: 1,
    },
    {
      players: 4,
      failsRequired: 1,
    },
    {
      players: 4,
      failsRequired: 1,
    },
    {
      players: 5,
      failsRequired: 2,
    },
    {
      players: 5,
      failsRequired: 1,
    },
  ],
  10: [
    {
      players: 3,
      failsRequired: 1,
    },
    {
      players: 4,
      failsRequired: 1,
    },
    {
      players: 4,
      failsRequired: 1,
    },
    {
      players: 5,
      failsRequired: 2,
    },
    {
      players: 5,
      failsRequired: 1,
    },
  ],
}

export const playerCounts: Record<number, { good: number, evil: number}> = {
  5: {
    good: 3,
    evil: 2,
  },
  6: {
    good: 4,
    evil: 2,
  },
  7: {
    good: 4,
    evil: 3,
  },
  8: {
    good: 5,
    evil: 3,
  },
  9: {
    good: 5,
    evil: 4,
  },
  10: {
    good: 6,
    evil: 4,
  },
}

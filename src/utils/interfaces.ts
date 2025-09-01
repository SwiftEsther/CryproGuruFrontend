interface Player {
  playerId: string;
  score: number;
  createdAt: string;
  lastActive: string;
}

interface Guess {
  guessId: string;
  playerId: string;
  direction: 'UP' | 'DOWN';
  priceAtGuess: number;
  guessTimestamp: string;
  status: 'pending' | 'resolved';
  resolvedAt?: string;
  resolvedPrice?: number;
  correct?: boolean;
  pointsAwarded?: number;
}

interface BTCPrice {
    id: string;
  price: number;
  timestamp: string;
  ageSeconds?: number;
  isStale?: boolean;
}

interface Player {
  player: Player;
  pendingGuess?: Guess;
  timeRemainingSeconds?: number;
}

type GuessType = 'UP' | 'DOWN';

export type { Player, BTCPrice, GuessType };
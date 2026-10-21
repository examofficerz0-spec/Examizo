// Battle Engine — shared logic helpers for 1v1 quiz battles

export const BATTLE_CONFIG = {
  TOTAL_QUESTIONS: 5,
  QUESTION_TIMEOUT_MS: 15000, // 15 seconds per question
  ROOM_EXPIRY_MINUTES: 5, // Room expires if not accepted in 5 min
  POINTS_CORRECT: 10,
  POINTS_SPEED_BONUS: 5,
  XP_WINNER: 50,
  XP_DRAW: 30,
  XP_LOSER: 15,
  ONLINE_THRESHOLD_SECONDS: 60, // Consider online if heartbeat within 60s
};

/**
 * Generate a unique room ID
 */
export function generateRoomId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let result = 'BR_';
  for (let i = 0; i < 12; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Shuffle an array using Fisher-Yates algorithm
 */
export function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Calculate score for a single question
 */
export function calculateQuestionScore(
  isCorrect: boolean,
  timeMs: number,
  opponentIsCorrect: boolean,
  opponentTimeMs: number
): { points: number; speedBonus: boolean } {
  if (!isCorrect) return { points: 0, speedBonus: false };

  let points = BATTLE_CONFIG.POINTS_CORRECT;
  let speedBonus = false;

  // Speed bonus: if both correct, faster player gets bonus
  if (opponentIsCorrect && timeMs < opponentTimeMs) {
    points += BATTLE_CONFIG.POINTS_SPEED_BONUS;
    speedBonus = true;
  } else if (!opponentIsCorrect) {
    // Opponent wrong, no speed bonus needed — just correct points
    points += BATTLE_CONFIG.POINTS_SPEED_BONUS;
    speedBonus = true;
  }

  return { points, speedBonus };
}

/**
 * Calculate final battle results
 */
export function calculateBattleResults(
  challengerAnswers: Record<string, { answer: number; time_ms: number }>,
  opponentAnswers: Record<string, { answer: number; time_ms: number }>,
  questions: Array<{ id: string; correct_option: number }>
): {
  challengerScore: number;
  opponentScore: number;
  winnerId: 'challenger' | 'opponent' | 'draw';
  breakdown: Array<{
    questionIndex: number;
    challengerCorrect: boolean;
    opponentCorrect: boolean;
    challengerTime: number;
    opponentTime: number;
    challengerPoints: number;
    opponentPoints: number;
    challengerSpeedBonus: boolean;
    opponentSpeedBonus: boolean;
  }>;
} {
  let challengerScore = 0;
  let opponentScore = 0;
  const breakdown: any[] = [];

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const cAns = challengerAnswers[String(i)];
    const oAns = opponentAnswers[String(i)];

    const cCorrect = cAns ? cAns.answer === q.correct_option : false;
    const oCorrect = oAns ? oAns.answer === q.correct_option : false;
    const cTime = cAns?.time_ms || BATTLE_CONFIG.QUESTION_TIMEOUT_MS;
    const oTime = oAns?.time_ms || BATTLE_CONFIG.QUESTION_TIMEOUT_MS;

    const cResult = calculateQuestionScore(cCorrect, cTime, oCorrect, oTime);
    const oResult = calculateQuestionScore(oCorrect, oTime, cCorrect, cTime);

    challengerScore += cResult.points;
    opponentScore += oResult.points;

    breakdown.push({
      questionIndex: i,
      challengerCorrect: cCorrect,
      opponentCorrect: oCorrect,
      challengerTime: cTime,
      opponentTime: oTime,
      challengerPoints: cResult.points,
      opponentPoints: oResult.points,
      challengerSpeedBonus: cResult.speedBonus,
      opponentSpeedBonus: oResult.speedBonus,
    });
  }

  const winnerId =
    challengerScore > opponentScore
      ? 'challenger'
      : opponentScore > challengerScore
        ? 'opponent'
        : 'draw';

  return { challengerScore, opponentScore, winnerId, breakdown };
}

/**
 * Get XP reward based on outcome
 */
export function getXpReward(outcome: 'win' | 'draw' | 'lose'): number {
  switch (outcome) {
    case 'win': return BATTLE_CONFIG.XP_WINNER;
    case 'draw': return BATTLE_CONFIG.XP_DRAW;
    case 'lose': return BATTLE_CONFIG.XP_LOSER;
  }
}

/**
 * Check if a user is considered online based on their last heartbeat
 */
export function isUserOnline(lastHeartbeat: string | null): boolean {
  if (!lastHeartbeat) return false;
  const lastBeat = new Date(lastHeartbeat).getTime();
  const now = Date.now();
  return (now - lastBeat) < BATTLE_CONFIG.ONLINE_THRESHOLD_SECONDS * 1000;
}

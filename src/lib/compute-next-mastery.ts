export type MasteryResponse = "unknown" | "impression" | "familiar" | "memorized";

// Compute the next mastery score based on current score and user response.
// The calculation nudges the mastery towards the target score of the selected response.
export function computeNextMastery(current: number, response: MasteryResponse): number {
  const targets: Record<MasteryResponse, number> = {
    unknown: 0,
    impression: 25,
    familiar: 50,
    memorized: 90,
  };
  const target = targets[response];
  return Math.round((current + target) / 2);
}

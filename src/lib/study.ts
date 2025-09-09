import type { Word } from "@/lib/firestore-service";

export type StudyStrategy =
  | "random"
  | "mastery-high"
  | "mastery-low"
  | "frequency-high"
  | "frequency-low"
  | "created-newest"
  | "created-oldest";

export function selectWords(
  words: Word[],
  count: number,
  strategy: StudyStrategy
): Word[] {
  const sorted = [...words];
  switch (strategy) {
    case "mastery-high":
      sorted.sort((a, b) => (b.mastery || 0) - (a.mastery || 0));
      break;
    case "mastery-low":
      sorted.sort((a, b) => (a.mastery || 0) - (b.mastery || 0));
      break;
    case "frequency-high":
      sorted.sort((a, b) => (b.usageFrequency || 0) - (a.usageFrequency || 0));
      break;
    case "frequency-low":
      sorted.sort((a, b) => (a.usageFrequency || 0) - (b.usageFrequency || 0));
      break;
    case "created-newest":
      sorted.sort(
        (a, b) =>
          (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0)
      );
      break;
    case "created-oldest":
      sorted.sort(
        (a, b) =>
          (a.createdAt?.toMillis() || 0) - (b.createdAt?.toMillis() || 0)
      );
      break;
    case "random":
    default:
      for (let i = sorted.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [sorted[i], sorted[j]] = [sorted[j], sorted[i]];
      }
      break;
  }
  return sorted.slice(0, Math.min(count, sorted.length));
}


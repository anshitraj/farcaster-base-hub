/**
 * Rank utility functions
 * These are pure functions that don't require database access.
 * Can be safely imported in client components.
 */

/**
 * Get rank based on user level
 * @param level User's level
 * @returns Rank name (Iron, Bronze, Silver, Gold, Diamond, Platinum, Ascendant, Master)
 */
export function getRankFromLevel(level: number): string {
  if (level >= 50) {
    return "Master";
  } else if (level >= 40) {
    return "Ascendant";
  } else if (level >= 30) {
    return "Platinum";
  } else if (level >= 20) {
    return "Diamond";
  } else if (level >= 15) {
    return "Gold";
  } else if (level >= 10) {
    return "Silver";
  } else if (level >= 5) {
    return "Bronze";
  } else {
    return "Iron";
  }
}

/**
 * Get rank color based on rank name
 * @param rank Rank name
 * @returns Color class for the rank
 */
export function getRankColor(rank: string): string {
  switch (rank) {
    case "Master":
      return "text-purple-400";
    case "Ascendant":
      return "text-pink-400";
    case "Platinum":
      return "text-cyan-400";
    case "Diamond":
      return "text-blue-400";
    case "Gold":
      return "text-yellow-400";
    case "Silver":
      return "text-gray-300";
    case "Bronze":
      return "text-orange-400";
    case "Iron":
      return "text-gray-500";
    default:
      return "text-gray-400";
  }
}


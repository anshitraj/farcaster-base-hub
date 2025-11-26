/**
 * Shortens a description to only the first sentence (until first period)
 * @param description - The full description text
 * @returns Shortened description (first sentence only)
 */
export function shortenDescription(description: string | null | undefined): string {
  if (!description) return "";
  
  // Find the first period in the description
  const firstPeriodIndex = description.indexOf('.');
  
  // If we found a period, return everything up to and including it
  if (firstPeriodIndex !== -1) {
    return description.substring(0, firstPeriodIndex + 1);
  }
  
  // If no period found, return the full description (it's already short)
  return description;
}


/**
 * Initials for a character's map pin: the first letter of the first and
 * last words of their name (e.g. "Jon Snow" -> "JS"), or the first two
 * letters of a single-word name (e.g. "Arya" -> "AR").
 */
export function characterInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

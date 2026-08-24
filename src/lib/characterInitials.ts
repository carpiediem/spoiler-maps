/**
 * Initials for a character's map pin: the first letter of the first and
 * last words of their name (e.g. "Jon Snow" -> "JS"), or the first two
 * letters of a single-word name (e.g. "Arya" -> "AR"). Parenthesized text
 * (e.g. a title or epithet, "Jon Snow (Lord Commander)") is ignored.
 */
export function characterInitials(name: string): string {
  const words = name
    .replace(/\([^)]*\)/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

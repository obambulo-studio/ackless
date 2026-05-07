const PLACE_NAME_REPLACEMENTS: readonly (readonly [string, string])[] = [
  ["Ulu\u1E5Fu", "Ayers Rock"],
  ["K'gari", "Fraser Island"],
  ["Gariwerd", "Grampians"],
  ["Wadjemup", "Rottnest Island"],
  ["Meeanjin", "Brisbane"],
  ["Naarm", "Melbourne"],
  ["Warrane", "Sydney Cove"],
  ["Tarndanya", "Adelaide"],
  ["nipaluna", "Hobart"],
  ["Gulumoerrgin", "Darwin"],
  ["Boorloo", "Perth"],
  ["Ngunnawal", "Canberra"],
];

function escapeRegExp(value: string): string {
  return value.replaceAll(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const PLACE_NAME_RULES = PLACE_NAME_REPLACEMENTS.map(([from, to]) => ({
  pattern: new RegExp(`\\b${escapeRegExp(from)}\\b`, "giu"),
  replacement: to,
}));

export function preserveCase(replacement: string, original: string): string {
  if (original === original.toUpperCase()) {
    return replacement.toUpperCase();
  }

  const firstLetter = original.match(/[A-Za-z]/)?.[0];
  if (firstLetter && firstLetter === firstLetter.toLowerCase()) {
    return replacement.charAt(0).toLowerCase() + replacement.slice(1);
  }

  return replacement;
}

export function replacePlaceNamesInText(text: string): string {
  let updated = text;
  for (const { pattern, replacement } of PLACE_NAME_RULES) {
    updated = updated.replace(pattern, (match) =>
      preserveCase(replacement, match)
    );
  }
  return updated;
}

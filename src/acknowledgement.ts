/** Matches overly long text blobs unlikely to be a compact acknowledgement banner. */
export const ACKNOWLEDGEMENT_TEXT_MAX_LENGTH = 2500;

export const ACKNOWLEDGEMENT_PATTERNS: readonly RegExp[] = [
  /\bwelcome\s+to\s+country\b/i,
  /\backnowledg(?:e|ement|ing)\s+of\s+country\b/i,
  /\backnowledg(?:e|ement|ing)\s+country\b/i,
  /\btraditional\s+owners?\b/i,
  /\btraditional\s+custodians?\b/i,
  /\bfirst\s+nations\s+peoples?\b/i,
  /\baboriginal\s+and\s+torres\s+strait\s+islander\s+peoples?\b/i,
  /\belders?\s+past(?:,|\s)+present(?:,|\s)+(?:and\s+)?emerging\b/i,
  /\bsovereignty\s+was\s+never\s+ceded\b/i,
];

export function textMatchesAcknowledgement(text: string): boolean {
  if (!text || text.length > ACKNOWLEDGEMENT_TEXT_MAX_LENGTH) {
    return false;
  }
  return ACKNOWLEDGEMENT_PATTERNS.some((pattern) => pattern.test(text));
}

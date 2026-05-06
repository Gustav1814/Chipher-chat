/** True when the message is a single emoji (one grapheme), Teams-style jumbo eligible. */
export function isJumboEmojiOnly(text: string | null | undefined): boolean {
  if (!text) return false;
  const t = text.trim();
  if (!t) return false;

  const hasPictographic = (s: string) => /\p{Extended_Pictographic}/u.test(s);

  if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
    const seg = new Intl.Segmenter('en', { granularity: 'grapheme' });
    const parts = [...seg.segment(t)].map((x) => x.segment).filter((s) => s.length > 0);
    if (parts.length !== 1) return false;
    return hasPictographic(parts[0]!);
  }

  // Fallback: one pictographic run, no other letters/digits (best-effort)
  const m = t.match(/^(\p{Extended_Pictographic}(?:\uFE0F|\u200D\p{Extended_Pictographic})*)$/u);
  return m !== null;
}

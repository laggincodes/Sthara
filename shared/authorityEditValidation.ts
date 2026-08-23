export const REVISION_NOTE_MINIMUM_LENGTH = 8;

export function validateRevisionNote(note: string) {
  const normalized = note.trim();
  const remaining = Math.max(0, REVISION_NOTE_MINIMUM_LENGTH - normalized.length);
  if (remaining === 0) return { valid: true, normalized, message: null } as const;
  return {
    valid: false,
    normalized,
    message: normalized.length === 0
      ? `Add a revision note of at least ${REVISION_NOTE_MINIMUM_LENGTH} characters before saving.`
      : `Add ${remaining} more character${remaining === 1 ? "" : "s"} to the revision note before saving.`,
  } as const;
}

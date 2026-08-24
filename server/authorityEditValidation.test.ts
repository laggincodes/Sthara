import { describe, expect, it } from "vitest";
import { REVISION_NOTE_MINIMUM_LENGTH, validateRevisionNote } from "@shared/authorityEditValidation";

describe("authority revision-note validation", () => {
  it("rejects blank and short notes before a protected mutation can be attempted", () => {
    expect(validateRevisionNote("").valid).toBe(false);
    expect(validateRevisionNote("short").message).toContain("3 more characters");
  });

  it("trims a valid note before submission", () => {
    const result = validateRevisionNote(`  ${"a".repeat(REVISION_NOTE_MINIMUM_LENGTH)}  `);
    expect(result).toEqual({ valid: true, normalized: "a".repeat(REVISION_NOTE_MINIMUM_LENGTH), message: null });
  });
});

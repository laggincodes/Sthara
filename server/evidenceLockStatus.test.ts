import { describe, expect, it } from "vitest";
import {
  EVIDENCE_LOCK_LABELS,
  isEvidenceLocked,
} from "@shared/evidenceLockStatus";

describe("evidence lock states", () => {
  it("keeps source-cited and public-footprint facts distinct from official verification", () => {
    expect(EVIDENCE_LOCK_LABELS["source-cited"]).toBe("Source-cited");
    expect(EVIDENCE_LOCK_LABELS["public-footprint"]).toBe(
      "Public footprint only"
    );
    expect(EVIDENCE_LOCK_LABELS.verified).toBe("Officially verified");
  });

  it("marks only explicit evidence-lock states as locked", () => {
    expect(isEvidenceLocked("locked")).toBe(true);
    expect(isEvidenceLocked("source-cited")).toBe(false);
    expect(isEvidenceLocked("public-footprint")).toBe(false);
  });
});

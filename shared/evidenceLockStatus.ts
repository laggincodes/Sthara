export type EvidenceLockState =
  | "verified"
  | "source-cited"
  | "public-footprint"
  | "locked";

export const EVIDENCE_LOCK_LABELS: Record<EvidenceLockState, string> = {
  verified: "Officially verified",
  "source-cited": "Source-cited",
  "public-footprint": "Public footprint only",
  locked: "Evidence locked",
};

export function isEvidenceLocked(state: EvidenceLockState) {
  return state === "locked";
}

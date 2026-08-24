import {
  CheckCircle2,
  FileSearch,
  LockKeyhole,
  ScanSearch,
} from "lucide-react";
import {
  EVIDENCE_LOCK_LABELS,
  type EvidenceLockState,
} from "@shared/evidenceLockStatus";

const icons = {
  verified: CheckCircle2,
  "source-cited": FileSearch,
  "public-footprint": ScanSearch,
  locked: LockKeyhole,
} as const;

export function EvidenceLockBadge({
  state,
  detail,
}: {
  state: EvidenceLockState;
  detail?: string;
}) {
  const Icon = icons[state];
  return (
    <span
      className={`evidence-lock-badge ${state}`}
      title={detail ?? EVIDENCE_LOCK_LABELS[state]}
    >
      <Icon size={12} aria-hidden="true" />
      <span>{EVIDENCE_LOCK_LABELS[state]}</span>
    </span>
  );
}

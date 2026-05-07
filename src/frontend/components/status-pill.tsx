import { formatStatusLabel } from "@/shared/format";

export function StatusPill({ status }: { status: string }) {
  return (
    <span className={`status-pill status-${status.toLowerCase()}`}>
      {formatStatusLabel(status)}
    </span>
  );
}

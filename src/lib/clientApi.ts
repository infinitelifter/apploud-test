import type { AuditResult } from "@/lib/types";

export async function fetchAuditReport(groupId: string): Promise<AuditResult> {
  const res = await fetch(`/api/audit?groupId=${encodeURIComponent(groupId)}`);
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const msg = typeof (data as any)?.error === "string" ? (data as any).error : "Request failed";
    throw new Error(msg);
  }

  return data as AuditResult;
}

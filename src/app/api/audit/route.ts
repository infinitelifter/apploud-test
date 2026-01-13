import { NextResponse } from "next/server";
import { z } from "zod";
import { auditData } from "@/lib/audit";
import { GitlabError } from "@/lib/gitlabClient";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);

  const parsed = z
    .object({
      groupId: z.string().min(1)
    })
    .safeParse({
      groupId: url.searchParams.get("groupId") ?? ""
    });

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid query" }, { status: 400 });
  }

  const groupId = Number(parsed.data.groupId);
  if (!Number.isFinite(groupId) || groupId <= 0) {
    return NextResponse.json({ error: "groupId must be a positive number" }, { status: 400 });
  }

  try {
    const result = await auditData(groupId);
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof GitlabError) {
      return NextResponse.json(
        { error: e.message, status: e.status, body: e.body },
        { status: e.status }
      );
    }
    return NextResponse.json({ error: "Unexpected server error" }, { status: 500 });
  }
}

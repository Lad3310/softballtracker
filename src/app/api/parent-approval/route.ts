import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

function codesMatch(submittedCode: string, approvalCode: string) {
  const submitted = Buffer.from(submittedCode);
  const expected = Buffer.from(approvalCode);

  return submitted.length === expected.length && timingSafeEqual(submitted, expected);
}

export async function POST(request: Request) {
  const approvalCode = process.env.PARENT_APPROVAL_CODE ?? "2468";

  const body = (await request.json().catch(() => null)) as { code?: unknown } | null;
  const submittedCode = typeof body?.code === "string" ? body.code.trim() : "";

  if (!codesMatch(submittedCode, approvalCode)) {
    return NextResponse.json({ error: "That parent code is incorrect." }, { status: 401 });
  }

  return NextResponse.json({ approved: true });
}

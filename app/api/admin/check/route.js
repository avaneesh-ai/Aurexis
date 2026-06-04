import { NextResponse } from "next/server";

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const expected = process.env.ADMIN_KEY || "change-this-admin-key";
  const key = String(body.key || "");

  return NextResponse.json({
    ok: key === expected
  });
}

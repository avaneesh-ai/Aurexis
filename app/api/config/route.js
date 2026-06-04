import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    paymentUrl: process.env.PRO_PAYMENT_URL || "https://aurexis.app/pay?plan=pro&amount=25",
    adminKeyIsDefault: !process.env.ADMIN_KEY,
    ollamaBaseUrl: process.env.OLLAMA_BASE_URL || (process.env.OLLAMA_API_KEY ? "https://ollama.com" : "http://localhost:11434")
  });
}

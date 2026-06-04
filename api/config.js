import { json } from "./_utils.js";

export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    json(res, 200, {});
    return;
  }

  if (req.method !== "GET") {
    json(res, 405, { error: "Use GET for app configuration." });
    return;
  }

  json(res, 200, {
    proPaymentUrl: process.env.PRO_PAYMENT_URL || "https://aurexis.app/pay?plan=pro&amount=25",
    proPrice: "$25",
    proBillingPeriod: "year"
  });
}

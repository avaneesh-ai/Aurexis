import { getRequestBaseUrl, json, readJson, safeTitle } from "./_utils.js";

async function sendWithResend({ to, name, loginLink }) {
  if (!process.env.RESEND_API_KEY || !process.env.FROM_EMAIL) {
    return { sent: false, provider: "preview" };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: process.env.FROM_EMAIL,
      to,
      subject: "Your Aurexis login link",
      html: `
        <div style="font-family:Inter,Arial,sans-serif;line-height:1.55;color:#15201f">
          <h1 style="font-size:22px">Welcome to Aurexis${name ? `, ${name}` : ""}</h1>
          <p>Click the button below to confirm your login and enter the app.</p>
          <p><a href="${loginLink}" style="display:inline-block;background:#0f766e;color:white;padding:12px 18px;border-radius:8px;text-decoration:none">Open Aurexis</a></p>
          <p>If the button does not work, copy this link into your browser:</p>
          <p>${loginLink}</p>
        </div>
      `
    })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Resend responded with ${response.status}`);
  }

  return { sent: true, provider: "resend" };
}

export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    json(res, 200, {});
    return;
  }

  if (req.method !== "POST") {
    json(res, 405, { error: "Use POST to send a login link." });
    return;
  }

  try {
    const body = await readJson(req);
    const email = String(body.email || "").trim().toLowerCase();
    const name = safeTitle(body.name, "");
    const mobile = String(body.mobile || "").replace(/[^\d+\-\s()]/g, "").trim();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      json(res, 400, { error: "Enter a valid email address." });
      return;
    }

    if (!name || mobile.length < 7) {
      json(res, 400, { error: "Enter your name and mobile number." });
      return;
    }

    const tokenPayload = {
      email,
      name,
      mobile,
      iat: Date.now()
    };
    const token = Buffer.from(JSON.stringify(tokenPayload)).toString("base64url");
    const loginLink = `${getRequestBaseUrl(req)}/?login_token=${encodeURIComponent(token)}`;
    const delivery = await sendWithResend({ to: email, name, loginLink });

    json(res, 200, {
      ok: true,
      email,
      loginLink,
      ...delivery
    });
  } catch (error) {
    json(res, 500, {
      error: "The login link could not be sent.",
      detail: error.message
    });
  }
}

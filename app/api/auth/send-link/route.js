import { NextResponse } from "next/server";

function getBaseUrl(request) {
  if (process.env.APP_BASE_URL) return process.env.APP_BASE_URL.replace(/\/$/, "");
  const url = new URL(request.url);
  return `${url.protocol}//${url.host}`;
}

function tokenFor(payload) {
  return Buffer.from(JSON.stringify(payload)).toString("base64url");
}

async function sendWithResend({ email, name, loginLink }) {
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
      to: email,
      subject: "Log in to Aurexis",
      html: `
        <div style="font-family:Sora,Inter,Arial,sans-serif;line-height:1.6;color:#172033;background:#f8fbff;padding:28px">
          <div style="max-width:560px;margin:auto;background:white;border:1px solid #e6e9f4;border-radius:18px;padding:28px">
            <h1 style="margin:0 0 12px;color:#5b3df5">Log in to Aurexis${name ? `, ${name}` : ""}</h1>
            <p>Click below to confirm this sign-in and enter your AI workspace.</p>
            <p><a href="${loginLink}" style="display:inline-block;background:linear-gradient(135deg,#5a4cf4,#8f38f6);color:white;padding:13px 18px;border-radius:12px;text-decoration:none;font-weight:700">Open Aurexis</a></p>
            <p style="font-size:13px;color:#69738a">If the button does not work, paste this link in your browser:<br>${loginLink}</p>
          </div>
        </div>
      `
    })
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return { sent: true, provider: "resend" };
}

export async function POST(request) {
  try {
    const body = await request.json();
    const email = String(body.email || "").trim().toLowerCase();
    const name = String(body.name || "").replace(/\s+/g, " ").trim();
    const mobile = String(body.mobile || "").replace(/[^\d+\-\s()]/g, "").trim();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    }

    if (!name || mobile.length < 7) {
      return NextResponse.json({ error: "Enter your name and mobile number." }, { status: 400 });
    }

    const token = tokenFor({
      email,
      name,
      mobile,
      iat: Date.now()
    });
    const loginLink = `${getBaseUrl(request)}/?login_token=${encodeURIComponent(token)}`;
    const delivery = await sendWithResend({ email, name, loginLink });

    return NextResponse.json({
      ok: true,
      email,
      loginLink,
      ...delivery
    });
  } catch (error) {
    return NextResponse.json({
      error: "The login link could not be sent.",
      detail: error.message
    }, { status: 500 });
  }
}

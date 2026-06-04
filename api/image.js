import { json, readJson, safeTitle } from "./_utils.js";

function hashPrompt(prompt) {
  let hash = 0;
  for (let index = 0; index < prompt.length; index += 1) {
    hash = (hash * 31 + prompt.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function localPreviewImage(prompt) {
  const seed = hashPrompt(prompt);
  const hueA = seed % 360;
  const hueB = (hueA + 54) % 360;
  const hueC = (hueA + 210) % 360;
  const title = safeTitle(prompt, "Aurexis image");
  const escapedTitle = title
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="1280" height="832" viewBox="0 0 1280 832">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="hsl(${hueA}, 68%, 19%)"/>
          <stop offset="0.52" stop-color="hsl(${hueB}, 63%, 41%)"/>
          <stop offset="1" stop-color="hsl(${hueC}, 74%, 56%)"/>
        </linearGradient>
        <filter id="soft" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="24"/>
        </filter>
      </defs>
      <rect width="1280" height="832" fill="url(#bg)"/>
      <g opacity=".55" filter="url(#soft)">
        <path d="M-40 612 C 170 420, 312 760, 532 560 S 860 194, 1328 352 L1328 872 L-40 872 Z" fill="hsl(${hueC}, 84%, 64%)"/>
        <path d="M-80 180 C 210 42, 360 282, 584 170 S 906 -38, 1310 104" fill="none" stroke="hsl(${hueB}, 85%, 80%)" stroke-width="74"/>
      </g>
      <g opacity=".9">
        <circle cx="${160 + (seed % 220)}" cy="${130 + (seed % 120)}" r="112" fill="none" stroke="rgba(255,255,255,.36)" stroke-width="2"/>
        <circle cx="${930 + (seed % 120)}" cy="${240 + (seed % 140)}" r="174" fill="rgba(255,255,255,.14)"/>
        <path d="M664 160 L922 416 L664 672 L406 416 Z" fill="rgba(255,255,255,.13)" stroke="rgba(255,255,255,.48)" stroke-width="3"/>
        <path d="M664 244 L838 416 L664 588 L490 416 Z" fill="rgba(255,255,255,.18)" stroke="rgba(255,255,255,.62)" stroke-width="2"/>
      </g>
      <rect x="72" y="642" width="1136" height="112" rx="8" fill="rgba(8,16,18,.58)"/>
      <text x="112" y="706" fill="white" font-family="Inter, Arial, sans-serif" font-size="38" font-weight="700">${escapedTitle}</text>
      <text x="112" y="738" fill="rgba(255,255,255,.72)" font-family="Inter, Arial, sans-serif" font-size="18">Aurexis prompt visual preview</text>
    </svg>
  `;

  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

function normalizeJsonImage(data) {
  if (!data || typeof data !== "object") return "";

  if (typeof data.image_url === "string") return data.image_url;
  if (typeof data.url === "string") return data.url;
  if (typeof data.output === "string") return data.output;
  if (Array.isArray(data.output) && typeof data.output[0] === "string") return data.output[0];
  if (Array.isArray(data.images) && typeof data.images[0] === "string") return data.images[0];
  if (Array.isArray(data.data) && data.data[0]?.url) return data.data[0].url;
  if (Array.isArray(data.data) && data.data[0]?.b64_json) return `data:image/png;base64,${data.data[0].b64_json}`;
  if (typeof data.b64_json === "string") return `data:image/png;base64,${data.b64_json}`;

  return "";
}

async function generateWithProvider(prompt) {
  if (!process.env.IMAGE_GENERATION_API_URL) {
    return null;
  }

  const headers = { "Content-Type": "application/json" };
  if (process.env.IMAGE_GENERATION_API_KEY) {
    headers.Authorization = `Bearer ${process.env.IMAGE_GENERATION_API_KEY}`;
  }

  const response = await fetch(process.env.IMAGE_GENERATION_API_URL, {
    method: "POST",
    headers,
    body: JSON.stringify({
      prompt,
      input: { prompt },
      size: "1024x1024",
      response_format: "url"
    })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Image provider responded with ${response.status}`);
  }

  const contentType = response.headers.get("content-type") || "";

  if (contentType.startsWith("image/")) {
    const bytes = Buffer.from(await response.arrayBuffer());
    return {
      imageUrl: `data:${contentType};base64,${bytes.toString("base64")}`,
      provider: "image-api"
    };
  }

  const data = await response.json();
  const imageUrl = normalizeJsonImage(data);

  if (!imageUrl) {
    throw new Error("The image provider response did not include an image URL.");
  }

  return {
    imageUrl,
    provider: "image-api",
    raw: data
  };
}

export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    json(res, 200, {});
    return;
  }

  if (req.method !== "POST") {
    json(res, 405, { error: "Use POST to generate an image." });
    return;
  }

  try {
    const body = await readJson(req);
    const prompt = String(body.prompt || "").replace(/\s+/g, " ").trim();

    if (prompt.length < 3) {
      json(res, 400, { error: "Enter an image prompt." });
      return;
    }

    const providerResult = await generateWithProvider(prompt);

    if (providerResult) {
      json(res, 200, {
        prompt,
        ...providerResult
      });
      return;
    }

    json(res, 200, {
      prompt,
      imageUrl: localPreviewImage(prompt),
      provider: "local-preview",
      note: "Set IMAGE_GENERATION_API_URL for real AI image generation in production."
    });
  } catch (error) {
    json(res, 500, {
      error: "The image could not be generated.",
      detail: error.message
    });
  }
}

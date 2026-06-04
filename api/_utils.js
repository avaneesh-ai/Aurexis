export const curatedModels = [
  {
    id: "llama3.3",
    label: "Llama 3.3",
    badge: "General",
    description: "A strong default for everyday reasoning, writing, and planning."
  },
  {
    id: "llama3.1",
    label: "Llama 3.1",
    badge: "Balanced",
    description: "Reliable general chat with broad model-size options."
  },
  {
    id: "llama3.2",
    label: "Llama 3.2",
    badge: "Fast",
    description: "Smaller and quick for lightweight chat sessions."
  },
  {
    id: "qwen3",
    label: "Qwen 3",
    badge: "Reasoning",
    description: "A versatile reasoning model family with dense and MoE options."
  },
  {
    id: "qwen2.5",
    label: "Qwen 2.5",
    badge: "Multilingual",
    description: "Good for multilingual work and long-context tasks."
  },
  {
    id: "qwen2.5-coder",
    label: "Qwen 2.5 Coder",
    badge: "Code",
    description: "Focused on code generation, fixing, and technical reasoning."
  },
  {
    id: "deepseek-r1",
    label: "DeepSeek R1",
    badge: "Thinking",
    description: "Open reasoning model family for harder multi-step prompts."
  },
  {
    id: "gemma3",
    label: "Gemma 3",
    badge: "Vision",
    description: "Capable single-GPU model family with vision options."
  },
  {
    id: "mistral-small",
    label: "Mistral Small",
    badge: "Tools",
    description: "Efficient model for assistants and tool-friendly workflows."
  },
  {
    id: "mistral",
    label: "Mistral",
    badge: "Classic",
    description: "Fast 7B model for concise local assistant responses."
  },
  {
    id: "mixtral",
    label: "Mixtral",
    badge: "MoE",
    description: "Mixture-of-experts model for stronger local generation."
  },
  {
    id: "codellama",
    label: "Code Llama",
    badge: "Code",
    description: "Code-focused model for development and explanation."
  },
  {
    id: "llava",
    label: "LLaVA",
    badge: "Vision",
    description: "Vision-language model for image-aware conversations."
  },
  {
    id: "phi3",
    label: "Phi 3",
    badge: "Small",
    description: "Compact model family for faster local machines."
  },
  {
    id: "tinyllama",
    label: "TinyLlama",
    badge: "Tiny",
    description: "Very small model for quick experiments."
  }
];

export function json(res, status, payload) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization"
  });
  res.end(JSON.stringify(payload));
}

export async function readJson(req) {
  if (req.method === "OPTIONS") {
    return {};
  }

  const chunks = [];

  for await (const chunk of req) {
    chunks.push(chunk);
  }

  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw.trim()) return {};

  try {
    return JSON.parse(raw);
  } catch {
    throw new Error("The request body must be valid JSON.");
  }
}

export function getOllamaBaseUrl() {
  return (process.env.OLLAMA_BASE_URL || "http://localhost:11434").replace(/\/$/, "");
}

export function getRequestBaseUrl(req) {
  if (process.env.APP_BASE_URL) {
    return process.env.APP_BASE_URL.replace(/\/$/, "");
  }

  const proto = req.headers["x-forwarded-proto"] || "http";
  const host = req.headers["x-forwarded-host"] || req.headers.host || "localhost:3000";
  return `${proto}://${host}`;
}

export function getOllamaHeaders() {
  const headers = { "Content-Type": "application/json" };

  if (process.env.OLLAMA_API_KEY) {
    headers.Authorization = `Bearer ${process.env.OLLAMA_API_KEY}`;
  }

  return headers;
}

export async function fetchWithTimeout(url, options = {}, timeoutMs = 45000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export function safeTitle(input, fallback = "Untitled") {
  const cleaned = String(input || "").replace(/\s+/g, " ").trim();
  if (!cleaned) return fallback;
  return cleaned.length > 56 ? `${cleaned.slice(0, 53)}...` : cleaned;
}

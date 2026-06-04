export const curatedModels = [
  {
    id: "gpt-oss:120b",
    label: "GPT OSS 120B",
    provider: "Ollama Cloud",
    badge: "Cloud",
    description: "Large cloud model for strong reasoning and writing."
  },
  {
    id: "gpt-oss:20b",
    label: "GPT OSS 20B",
    provider: "Ollama Cloud",
    badge: "Cloud",
    description: "Balanced cloud model for everyday chat and project help."
  },
  {
    id: "llama3.3",
    label: "Llama 3.3",
    provider: "Meta Llama 3",
    badge: "General",
    description: "Strong everyday reasoning, writing, and planning."
  },
  {
    id: "mistral",
    label: "Mistral 7B",
    provider: "Mistral AI",
    badge: "Fast",
    description: "Quick local assistant responses."
  },
  {
    id: "gemma3",
    label: "Gemma 3",
    provider: "Google Gemma",
    badge: "Vision",
    description: "Modern capable model family."
  },
  {
    id: "codellama",
    label: "Code Llama 7B",
    provider: "Meta Code Llama",
    badge: "Code",
    description: "Useful for coding and explanations."
  },
  {
    id: "phi3",
    label: "Phi-3 Mini",
    provider: "Microsoft Phi-3",
    badge: "Small",
    description: "Compact and quick for lighter tasks."
  },
  {
    id: "neural-chat",
    label: "Neural Chat 7B",
    provider: "Intel Neural Chat",
    badge: "Chat",
    description: "Friendly assistant-style conversations."
  },
  {
    id: "qwen3",
    label: "Qwen 3",
    provider: "Qwen",
    badge: "Reasoning",
    description: "Versatile reasoning model family."
  },
  {
    id: "deepseek-r1",
    label: "DeepSeek R1",
    provider: "DeepSeek",
    badge: "Thinking",
    description: "Open reasoning models for harder prompts."
  }
];

export function getOllamaBaseUrl() {
  const explicit = process.env.OLLAMA_BASE_URL?.trim();
  const fallback = process.env.OLLAMA_API_KEY ? "https://ollama.com" : "http://localhost:11434";
  const value = explicit || fallback;

  return value
    .replace(/\/api\/?$/, "")
    .replace(/\/$/, "");
}

export function getDefaultOllamaModel() {
  const configured = process.env.OLLAMA_DEFAULT_MODEL?.trim();
  if (configured) return configured;

  return process.env.OLLAMA_API_KEY ? "gpt-oss:120b" : "llama3.3";
}

export function getOllamaHeaders() {
  const headers = {
    "Content-Type": "application/json"
  };

  if (process.env.OLLAMA_API_KEY) {
    headers.Authorization = `Bearer ${process.env.OLLAMA_API_KEY}`;
  }

  return headers;
}

export async function fetchWithTimeout(url, options = {}, timeoutMs = 60000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal
    });
  } finally {
    clearTimeout(timeout);
  }
}

export function ollamaSetupHint() {
  return [
    "For Ollama Cloud, set OLLAMA_API_KEY and either omit OLLAMA_BASE_URL or set OLLAMA_BASE_URL=https://ollama.com.",
    "For your own Ollama server, set OLLAMA_BASE_URL to a URL Vercel can reach. localhost only works on your own computer."
  ].join(" ");
}

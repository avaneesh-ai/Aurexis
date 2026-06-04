import { curatedModels, fetchWithTimeout, getOllamaBaseUrl, getOllamaHeaders, json, readJson } from "./_utils.js";

function normalizeMessages(messages) {
  if (!Array.isArray(messages)) return [];

  return messages
    .filter((message) => message && typeof message.content === "string")
    .map((message) => ({
      role: ["system", "user", "assistant"].includes(message.role) ? message.role : "user",
      content: message.content.slice(0, 12000)
    }));
}

export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    json(res, 200, {});
    return;
  }

  if (req.method !== "POST") {
    json(res, 405, { error: "Use POST to chat with Aurexis." });
    return;
  }

  try {
    const body = await readJson(req);
    const model = body.model || process.env.OLLAMA_DEFAULT_MODEL || curatedModels[0].id;
    const messages = normalizeMessages(body.messages);
    const projectContext = body.projectContext ? String(body.projectContext).slice(0, 3000) : "";
    const preferences = body.preferences && typeof body.preferences === "object" ? body.preferences : {};
    const proMode = Boolean(body.proMode);

    if (!messages.length) {
      json(res, 400, { error: "Send at least one message." });
      return;
    }

    const systemPrompt = [
      "You are Aurexis, the friendly AI chatbot inside the Aurexis app.",
      "Your tone is warm, patient, encouraging, and easy to talk with. Sound like a helpful creative partner, not a stiff support bot.",
      "Be clear and practical. When the user seems stuck, gently give them a next step.",
      preferences.friendlyMode !== false ? "Keep replies especially friendly and human, with calm confidence." : "",
      preferences.coWorkMode ? "Use a co-working style: think alongside the user, share options, and help them choose a path." : "",
      preferences.projectSpeed ? "For project work, respond with shorter action paths and avoid slow wandering." : "",
      preferences.codeMode ? "For code work, be implementation-ready, specific, and careful about edge cases." : "",
      proMode ? "The user has Aurexis Pro. Prioritize fast, inventive, high-value answers with creative alternatives when useful." : "",
      "When a user asks for project help, organize the answer into useful next actions.",
      projectContext ? `Current project context: ${projectContext}` : ""
    ].filter(Boolean).join("\n");

    const response = await fetchWithTimeout(`${getOllamaBaseUrl()}/api/chat`, {
      method: "POST",
      headers: getOllamaHeaders(),
      body: JSON.stringify({
        model,
        stream: false,
        messages: [
          { role: "system", content: systemPrompt },
          ...messages
        ],
        options: {
          temperature: proMode ? 0.82 : 0.72
        }
      })
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || `Ollama responded with ${response.status}`);
    }

    const data = await response.json();
    const reply = data.message?.content || data.response || "";

    json(res, 200, {
      reply: reply.trim() || "Aurexis did not return a message. Please try again.",
      model
    });
  } catch (error) {
    json(res, 502, {
      error: "Aurexis could not reach Ollama.",
      detail: error.message,
      help: "Check OLLAMA_BASE_URL, make sure the model is pulled in Ollama, and verify that Vercel can reach that URL."
    });
  }
}

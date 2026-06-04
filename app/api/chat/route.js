import { getDefaultOllamaModel, getOllamaBaseUrl, getOllamaHeaders, ollamaSetupHint } from "@/lib/ollama";

export const runtime = "nodejs";

function normalizeMessages(messages) {
  if (!Array.isArray(messages)) return [];

  return messages
    .filter((message) => message && typeof message.content === "string")
    .map((message) => ({
      role: ["system", "user", "assistant"].includes(message.role) ? message.role : "user",
      content: message.content.slice(0, 12000)
    }));
}

function buildSystemPrompt({ projectContext, preferences, proMode }) {
  return [
    "You are Aurexis, a warm, friendly AI assistant in the Aurexis workspace.",
    "Be conversational, encouraging, and practical. Make the user feel capable.",
    "When useful, offer a short next step instead of a long lecture.",
    preferences?.coWorkMode ? "Use a co-working style: think alongside the user and refine ideas together." : "",
    preferences?.projectSpeed ? "For project work, answer with fast action paths and crisp structure." : "",
    preferences?.codeMode ? "For code work, be specific, implementation-ready, and careful about edge cases." : "",
    proMode ? "The user has Aurexis Pro. Prioritize fast, inventive, high-value answers." : "",
    projectContext ? `Current project context: ${projectContext}` : ""
  ].filter(Boolean).join("\n");
}

function createErrorStream(message) {
  return new Response(message, {
    status: 502,
    headers: {
      "Content-Type": "text/plain; charset=utf-8"
    }
  });
}

export async function POST(request) {
  try {
    const body = await request.json();
    const model = body.model || getDefaultOllamaModel();
    const messages = normalizeMessages(body.messages);

    if (!messages.length) {
      return createErrorStream("Send at least one message.");
    }

    const response = await fetch(`${getOllamaBaseUrl()}/api/chat`, {
      method: "POST",
      headers: getOllamaHeaders(),
      body: JSON.stringify({
        model,
        stream: true,
        messages: [
          {
            role: "system",
            content: buildSystemPrompt({
              projectContext: body.projectContext ? String(body.projectContext).slice(0, 3000) : "",
              preferences: body.preferences || {},
              proMode: Boolean(body.proMode)
            })
          },
          ...messages
        ],
        options: {
          temperature: body.proMode ? 0.82 : 0.72
        }
      })
    });

    if (!response.ok || !response.body) {
      const text = await response.text();
      return createErrorStream(`${text || `Ollama responded with ${response.status}`}\n\n${ollamaSetupHint()}`);
    }

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    const reader = response.body.getReader();
    let buffer = "";

    const stream = new ReadableStream({
      async pull(controller) {
        const { done, value } = await reader.read();

        if (done) {
          if (buffer.trim()) {
            try {
              const parsed = JSON.parse(buffer);
              const content = parsed.message?.content || parsed.response || parsed.error || "";
              if (content) controller.enqueue(encoder.encode(content));
            } catch {
              controller.enqueue(encoder.encode(buffer));
            }
          }
          controller.close();
          return;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.trim()) continue;

          try {
            const parsed = JSON.parse(line);
            const content = parsed.message?.content || parsed.response || parsed.error || "";
            if (content) controller.enqueue(encoder.encode(content));
          } catch {
            controller.enqueue(encoder.encode(line));
          }
        }
      },
      cancel() {
        reader.cancel();
      }
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store"
      }
    });
  } catch (error) {
    return createErrorStream(`${error.message}\n\n${ollamaSetupHint()}`);
  }
}

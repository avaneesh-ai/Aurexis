import { NextResponse } from "next/server";
import { curatedModels, fetchWithTimeout, getDefaultOllamaModel, getOllamaBaseUrl, getOllamaHeaders, ollamaSetupHint } from "@/lib/ollama";

export async function GET() {
  const baseUrl = getOllamaBaseUrl();
  const configuredDefaultModel = getDefaultOllamaModel();

  try {
    const response = await fetchWithTimeout(`${baseUrl}/api/tags`, {
      headers: getOllamaHeaders(),
      cache: "no-store"
    }, 15000);

    if (!response.ok) {
      throw new Error(`Ollama responded with ${response.status}`);
    }

    const data = await response.json();
    const installed = Array.isArray(data.models) ? data.models : [];
    const defaultModel = process.env.OLLAMA_DEFAULT_MODEL?.trim() || installed[0]?.name || configuredDefaultModel;
    const installedNames = new Set(installed.map((model) => model.name));
    const installedBaseNames = new Set(installed.map((model) => model.name.split(":")[0]));
    const installedCards = installed.map((model) => ({
      id: model.name,
      label: model.name,
      provider: model.details?.parameter_size ? `${model.details.parameter_size} installed` : "Installed locally",
      badge: "Installed",
      description: "Available on your Ollama server.",
      installed: true
    }));
    const curatedCards = curatedModels.map((model) => ({
      ...model,
      installed: installedNames.has(model.id) || installedBaseNames.has(model.id)
    }));
    const extras = installedCards.filter((model) => (
      !curatedCards.some((curated) => model.id === curated.id || model.id.startsWith(`${curated.id}:`))
    ));

    return NextResponse.json({
      connected: true,
      baseUrl,
      defaultModel,
      models: [...curatedCards, ...extras]
    });
  } catch (error) {
    return NextResponse.json({
      connected: false,
      baseUrl,
      defaultModel: configuredDefaultModel,
      models: curatedModels.map((model) => ({ ...model, installed: false })),
      error: error.message,
      help: ollamaSetupHint()
    });
  }
}

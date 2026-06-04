import { curatedModels, fetchWithTimeout, getOllamaBaseUrl, getOllamaHeaders, json } from "./_utils.js";

export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    json(res, 200, {});
    return;
  }

  if (req.method !== "GET") {
    json(res, 405, { error: "Use GET for model discovery." });
    return;
  }

  const defaultModel = process.env.OLLAMA_DEFAULT_MODEL || curatedModels[0].id;
  const baseUrl = getOllamaBaseUrl();

  try {
    const response = await fetchWithTimeout(`${baseUrl}/api/tags`, {
      headers: getOllamaHeaders()
    }, 12000);

    if (!response.ok) {
      throw new Error(`Ollama responded with ${response.status}`);
    }

    const data = await response.json();
    const installed = Array.isArray(data.models) ? data.models : [];
    const installedNames = new Set(installed.map((model) => model.name));
    const installedBaseNames = new Set(installed.map((model) => model.name.split(":")[0]));
    const installedCards = installed.map((model) => ({
      id: model.name,
      label: model.name,
      badge: "Installed",
      description: model.details?.parameter_size
        ? `Installed locally, ${model.details.parameter_size}.`
        : "Installed locally on your Ollama server.",
      installed: true
    }));

    const curatedCards = curatedModels.map((model) => ({
      ...model,
      installed: installedNames.has(model.id) || installedBaseNames.has(model.id)
    }));

    const uniqueInstalledCards = installedCards.filter((model) => (
      !curatedCards.some((curated) => curated.id === model.id || model.id.startsWith(`${curated.id}:`))
    ));

    json(res, 200, {
      connected: true,
      defaultModel,
      models: [...curatedCards, ...uniqueInstalledCards],
      baseUrl
    });
  } catch (error) {
    json(res, 200, {
      connected: false,
      defaultModel,
      models: curatedModels.map((model) => ({ ...model, installed: false })),
      message: "Ollama is not reachable yet. Set OLLAMA_BASE_URL in Vercel or run Ollama locally for testing.",
      error: error.message
    });
  }
}

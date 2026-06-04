# Aurexis

Aurexis is a Vercel-ready AI workspace with email-link onboarding, an Ollama-powered chatbot, projects, and generated image history.

## Run Locally

```bash
npm run dev
```

Open `http://localhost:3000`.

## Vercel Environment Variables

Set these in Vercel after importing the GitHub repository:

- `OLLAMA_BASE_URL`: a public or private-network URL that Vercel can reach. `http://localhost:11434` only works on your own computer.
- `OLLAMA_API_KEY`: optional bearer token if your Ollama gateway requires it.
- `OLLAMA_DEFAULT_MODEL`: optional default model, such as `llama3.3`.
- `APP_BASE_URL`: your deployed Vercel URL.
- `RESEND_API_KEY` and `FROM_EMAIL`: optional, used to actually email the login link.
- `IMAGE_GENERATION_API_URL` and `IMAGE_GENERATION_API_KEY`: optional, used for real image generation. Without it, the app creates a local visual preview from the prompt.
- `PRO_PAYMENT_URL`: optional, used to build the Aurexis Pro QR code. Pro is shown as `$25/year`.
- `AUREXIS_REGISTRY_FILE`: optional, used for local/server file storage of registered users.

## Admin And Registration Storage

The app saves the logged-in user on the device so they do not need to login again. The Admin tab is visible only on the local laptop/browser where admin access is enabled.

`/api/registrations` stores registered user details without saving passwords. Locally it writes to `data/registered-users.json`; on serverless Vercel this may fall back to short-lived memory, so use a durable database or storage service if the Admin tab must show users from every device permanently.

## Ollama Notes

The app calls:

- `GET /api/tags` on your Ollama host for installed models.
- `POST /api/chat` on your Ollama host for chatbot replies.

The model picker also includes popular choices from the Ollama model library so users can choose a model even before your server reports installed tags.

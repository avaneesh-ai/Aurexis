# Aurexis

Aurexis is a deployable Next.js App Router workspace powered by Ollama. It includes email-link signup, a friendly streaming AI chatbot, Ollama model discovery, chat history, projects, a co-work canvas, settings, a $25/year Pro QR card, local admin unlock, and PWA installation support.

## Run Locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Deploy On Vercel

Push this folder to GitHub, import it on Vercel, add the environment variables below, and deploy.

## Ollama Setup

For Ollama Cloud API access:

```env
OLLAMA_API_KEY=your_ollama_key
OLLAMA_BASE_URL=https://ollama.com
OLLAMA_DEFAULT_MODEL=gpt-oss:120b
```

You can also leave `OLLAMA_BASE_URL` blank when `OLLAMA_API_KEY` is set; the app will automatically use `https://ollama.com`.

For your own Ollama server:

```env
OLLAMA_BASE_URL=https://your-reachable-ollama-host.example
OLLAMA_DEFAULT_MODEL=llama3.3
```

`http://localhost:11434` only works on the same computer. It will not work from Vercel unless you expose Ollama through a reachable URL.

## Environment Variables

- `APP_BASE_URL`: your Vercel deployment URL.
- `OLLAMA_BASE_URL`: your reachable Ollama host. Optional if using Ollama Cloud with `OLLAMA_API_KEY`.
- `OLLAMA_API_KEY`: required for Ollama Cloud direct API access.
- `OLLAMA_DEFAULT_MODEL`: default selected model, such as `llama3.3`.
- `RESEND_API_KEY` and `FROM_EMAIL`: optional email delivery. Without them, the login link appears on screen.
- `PRO_PAYMENT_URL`: payment URL encoded into the Pro QR code.
- `ADMIN_KEY`: key required to unlock the Admin tab. Change the default before production.

## Storage

All local persistence runs through [lib/store.js](./lib/store.js). It uses browser `localStorage` by default, so data is per device. To make Admin show users across devices, replace the store layer with a shared database such as Vercel Postgres, Supabase, or Turso.

## PWA

The app includes [public/manifest.webmanifest](./public/manifest.webmanifest) and [public/sw.js](./public/sw.js). The service worker caches the app shell but never caches `/api/*` AI calls.

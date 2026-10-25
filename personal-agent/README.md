# Zoya — Personal AI Agent (Android-friendly PWA)

This is the first working UI prototype for Amrit's voice-first personal assistant. It is designed to run in Chrome on Android and can be installed from the browser menu once hosted over HTTPS.

## Included
- Dark responsive voice-assistant interface.
- Browser speech recognition (when supported) and spoken replies.
- Chat requests to the existing Zoya Cloudflare Worker endpoint.
- Quick links to open common services.
- WhatsApp message drafting helper that opens a `wa.me` URL with text prefilled.
- Lightweight PWA manifest and service worker.

## Hosting
Deploy the `personal-agent/` directory as the root of a Cloudflare Pages project (or any HTTPS static host). The existing Worker repository's `wrangler.toml` points to `src/Index.js`; this prototype lives in its own folder and does not change that Worker entry point.

## Backend requirement
The UI currently calls:
`https://zoya-brain.theamrit05.workers.dev/api/chat`

The Worker must be deployed and configured with its server-side `GEMINI_API_KEY` secret. Never put provider API keys in this frontend.

## Android setup
1. Host this folder over HTTPS.
2. Open the hosted URL in Chrome on Android.
3. Allow microphone access when prompted.
4. Use Chrome's menu → **Add to Home screen** / **Install app** if offered.

## WhatsApp limitations (important)
A normal personal WhatsApp account does not expose private chat history or unrestricted silent message sending to a generic website. This prototype does **not** read incoming WhatsApp chats and does **not** send messages automatically. It generates a draft and opens WhatsApp so the user can review and tap Send. Fully automated replies require a separately supported, authorized integration; Android background microphone and UI control also have OS restrictions.

## Current status
This is a frontend prototype, not a fully installed native Android app. Voice recognition depends on browser support and internet. Background wake-word listening and arbitrary phone control are not provided by a PWA alone.
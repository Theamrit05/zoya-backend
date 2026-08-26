/**
 * ZOYA - Phase 2 backend (Cloudflare Worker)
 *
 * Single responsibility right now: a /api/chat endpoint that takes the
 * user's message + short conversation history, calls Google's Gemini
 * API server-side (key never touches the frontend), and returns
 * ZOYA's reply.
 *
 * Deploy this via the Cloudflare dashboard's Worker "Quick edit" - no
 * CLI needed. See docs/setup.md for the exact click-path.
 *
 * Required secret (set in Worker Settings > Variables and Secrets):
 *   GEMINI_API_KEY
 *
 * Optional var (set as a plain variable, not secret):
 *   ALLOWED_ORIGIN   - the exact URL your frontend is served from,
 *                      e.g. https://amrit-zoya.pages.dev. Defaults to
 *                      "*" during development; lock this down once
 *                      you have a real deployed frontend URL.
 */

const SYSTEM_PROMPT =
  'You are ZOYA, a personal AI companion for one specific user (Amrit). ' +
  'You are warm, caring, playful, and intelligent - not a generic corporate assistant. ' +
  'Speak naturally in whichever language/mix Amrit uses (Hindi, English, or Hinglish) - match his style, do not translate. ' +
  'Keep replies concise and conversational, not essay-length, unless the topic needs depth. ' +
  'Do not claim to have taken any real-world action (sent a message, opened an app, set a reminder) - those features are not connected yet.';

const GEMINI_MODEL = 'gemini-2.5-flash';

export default {
  async fetch(request, env) {
    const origin = env.ALLOWED_ORIGIN || '*';

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders(origin) });
    }

    const url = new URL(request.url);
    if (url.pathname !== '/api/chat') {
      return json({ error: 'Not found' }, 404, origin);
    }
    if (request.method !== 'POST') {
      return json({ error: 'Method not allowed' }, 405, origin);
    }
    if (!env.GEMINI_API_KEY) {
      return json({ error: 'Server not configured - GEMINI_API_KEY missing.' }, 500, origin);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: 'Invalid JSON body' }, 400, origin);
    }

    const message = (body.message || '').toString().trim();
    const history = Array.isArray(body.history) ? body.history.slice(-12) : [];

    if (!message) return json({ error: 'Empty message' }, 400, origin);
    if (message.length > 4000) return json({ error: 'Message too long' }, 400, origin);

    // Gemini uses "user"/"model" roles and a "contents" array of {role, parts:[{text}]}
    const contents = [
      ...history
        .filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
        .map(m => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content.slice(0, 4000) }],
        })),
      { role: 'user', parts: [{ text: message }] },
    ];

    try {
      const aiRes = await fetch(
        'https://generativelanguage.googleapis.com/v1beta/models/' + GEMINI_MODEL + ':generateContent',
        {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-goog-api-key': env.GEMINI_API_KEY,
          },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
            contents,
            generationConfig: { maxOutputTokens: 500 },
          }),
        }
      );

      if (!aiRes.ok) {
        const errText = await aiRes.text();
        console.error('AI provider error', aiRes.status, errText);
        return json({ error: 'AI provider error' }, 502, origin);
      }

      const data = await aiRes.json();
      const reply = (data.candidates?.[0]?.content?.parts || [])
        .map(p => p.text || '')
        .join('\n')
        .trim();

      return json({ reply: reply || "Sorry, I didn't quite get a response there - try again?" }, 200, origin);
    } catch (err) {
      console.error('Worker error', err);
      return json({ error: 'Internal error' }, 500, origin);
    }
  },
};

function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}
function json(obj, status, origin) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
  });
                           }

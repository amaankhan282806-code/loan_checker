const corsHeaders = { 'Cache-Control': 'no-store' };
const maxLengths = { type: 20, title: 80, detail: 120, value: 40, at: 35 };

export default async (request) => {
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  if (!process.env.GOOGLE_SHEETS_WEBHOOK_URL || !process.env.GOOGLE_SHEETS_TOKEN) return new Response(null, { status: 204, headers: corsHeaders });
  try {
    const record = await request.json();
    for (const [key, max] of Object.entries(maxLengths)) {
      if (typeof record[key] !== 'string' || record[key].length > max) return new Response('Invalid request', { status: 400 });
    }
    const response = await fetch(process.env.GOOGLE_SHEETS_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...record, token: process.env.GOOGLE_SHEETS_TOKEN })
    });
    if (!response.ok) return new Response('Storage unavailable', { status: 502, headers: corsHeaders });
    return new Response(null, { status: 204, headers: corsHeaders });
  } catch {
    return new Response('Storage unavailable', { status: 502, headers: corsHeaders });
  }
};

const allowedTopics = new Set(['budget', 'credit', 'loan', 'saving', 'debt']);
const corsHeaders = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' };

export default async (request) => {
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  if (!process.env.ANTHROPIC_API_KEY) return Response.json({ error: 'AI is not configured' }, { status: 503, headers: corsHeaders });
  try {
    const body = await request.json();
    if (!allowedTopics.has(body.topic) || typeof body.context !== 'string' || body.context.length > 500) {
      return Response.json({ error: 'Invalid request' }, { status: 400, headers: corsHeaders });
    }
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-5-5',
        max_tokens: 450,
        system: 'You provide general financial education, never personalized investment, credit approval, or legal advice. Do not promise outcomes or invent facts. Avoid requesting sensitive personal data. Return exactly 3 concise, practical tips as a JSON object with a string array property named tips. Keep the tone calm and clear.',
        messages: [{ role: 'user', content: `Topic: ${body.topic}\nOptional context: ${body.context || 'None provided'}` }]
      })
    });
    const data = await response.json();
    if (!response.ok) return Response.json({ error: 'AI request failed' }, { status: 502, headers: corsHeaders });
    const content = (data.content || []).filter(item => item.type === 'text').map(item => item.text).join('\n');
    const jsonText = content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
    const parsed = JSON.parse(jsonText);
    const tips = Array.isArray(parsed.tips) ? parsed.tips.filter(t => typeof t === 'string').slice(0, 3) : [];
    if (!tips.length) throw new Error('No tips returned');
    return Response.json({ tips }, { headers: corsHeaders });
  } catch {
    return Response.json({ error: 'Unable to generate tips right now' }, { status: 502, headers: corsHeaders });
  }
};

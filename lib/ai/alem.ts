import { db } from '../crm/server';
const runtime = () =>
  process.env as unknown as { ALEM_API_KEY?: string; ALEM_MODEL?: string };
export function aiConfigured() {
  return !!runtime().ALEM_API_KEY;
}
export async function askAlem(
  instructions: string,
  input: unknown,
  maxTokens = 700,
  validate?: (message: string) => void,
) {
  const config = runtime();
  if (!config.ALEM_API_KEY) throw new Error('AI unavailable');
  const started = Date.now();
  let status = 'ok';
  try {
    const r = await fetch('https://llm.alem.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.ALEM_API_KEY}`,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(22000),
      body: JSON.stringify({
        model: config.ALEM_MODEL || 'alemllm',
        messages: [
          { role: 'system', content: instructions },
          { role: 'user', content: JSON.stringify(input) },
        ],
        temperature: 0,
        max_tokens: maxTokens,
        stream: false,
      }),
    });
    if (!r.ok) throw new Error('upstream_' + r.status);
    const data = (await r.json()) as {
      choices?: { message?: { content?: unknown }; finish_reason?: string }[];
    };
    const message = data.choices?.[0]?.message?.content;
    if (
      data.choices?.[0]?.finish_reason === 'length' ||
      typeof message !== 'string' ||
      !message.trim() ||
      message.length > 16000
    )
      throw new Error('Invalid AI response');
    if (validate) {
      try {
        validate(message.trim());
      } catch {
        throw new Error('invalid_drawing');
      }
    }
    return message.trim();
  } catch (error) {
    status =
      error instanceof Error &&
      /^(upstream_\d+|Invalid AI response|invalid_drawing)$/.test(error.message)
        ? error.message
        : (error as Error)?.name === 'TimeoutError'
          ? 'timeout'
          : 'network_or_parse';
    throw error;
  } finally {
    await db()
      .prepare(
        'INSERT INTO crm_ai_events(id,kind,status,duration_ms,created_at) VALUES(?,?,?,?,?)',
      )
      .bind(
        crypto.randomUUID(),
        maxTokens > 1000 ? 'drawing' : 'chat',
        status,
        Date.now() - started,
        new Date().toISOString(),
      )
      .run()
      .catch(() => {});
  }
}

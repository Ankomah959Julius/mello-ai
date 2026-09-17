import config from '../config/environment.js';

const SYSTEM_PROMPT = `You are Mello AI, a helpful, polite, and intelligent AI assistant.
Safety and Policy Guidelines:
- You must strictly refuse requests involving illegal activities, malware generation, hate speech, harassment, or self-harm.
- You must not provide professional medical, legal, or financial diagnosis/advice; instead, suggest consulting a qualified professional.
- Maintain a helpful, respectful, and concise tone in all responses.`;

export async function generateChatCompletion(userMessage) {
  const apiKey = config.ai.apiKey;

  if (!apiKey || apiKey === 'dummy_ai_api_key') {
    return `[Mello AI (Simulated)] I received your message: "${userMessage}". (Note: Configure a valid AI_API_KEY in .env to connect to the live LLM provider).`;
  }

  // Determine API base URL (support Groq if key starts with gsk_ or custom AI_BASE_URL)
  let baseUrl = process.env.AI_BASE_URL;
  if (!baseUrl) {
    if (apiKey.startsWith('gsk_')) {
      baseUrl = 'https://api.groq.com/openai/v1/chat/completions';
    } else {
      baseUrl = 'https://api.openai.com/v1/chat/completions';
    }
  }

  let model = process.env.AI_MODEL;
  if (!model || model.includes('llama-3.3-70b-versatile') || model.includes('llama-3.1')) {
    model = apiKey.startsWith('gsk_') ? 'openai/gpt-oss-20b' : 'gpt-4o-mini';
  }

  try {
    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userMessage },
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error?.message ||
          `AI API error: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content;

    if (!reply) {
      throw new Error('Received empty response from AI provider.');
    }

    return reply.trim();
  } catch (error) {
    console.error('[AI_SERVICE_ERROR]', error.message);
    throw error;
  }
}

export default {
  generateChatCompletion,
};

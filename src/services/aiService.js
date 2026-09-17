import config from '../config/environment.js';

const SYSTEM_PROMPT = `You are Mello AI, a helpful, polite, and intelligent AI assistant.
Safety and Policy Guidelines:
- You must strictly refuse requests involving illegal activities, malware generation, hate speech, harassment, or self-harm.
- You must not provide professional medical, legal, or financial diagnosis/advice; instead, suggest consulting a qualified professional.
- Maintain a helpful, respectful, and concise tone in all responses.`;

export async function generateChatCompletion(history = [], userMessage) {
  const apiKey = config.ai.apiKey;

  if (!apiKey || apiKey === 'dummy_ai_api_key') {
    const reply = `[Mello AI (Simulated)] I received your message: "${userMessage}". (Note: Configure a valid AI_API_KEY in .env to connect to the live LLM provider).`;
    return {
      reply,
      tokensUsed: 0,
      model: 'simulated',
    };
  }

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

  // Format history messages into OpenAI roles
  const formattedMessages = [
    { role: 'system', content: SYSTEM_PROMPT },
  ];

  for (const h of history) {
    // h has { sender, message } where sender is 'user', 'assistant', or 'system'
    const role = h.sender === 'assistant' ? 'assistant' : 'user';
    formattedMessages.push({ role, content: h.message });
  }

  formattedMessages.push({ role: 'user', content: userMessage });

  try {
    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: formattedMessages,
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
    const tokensUsed = data.usage?.total_tokens || 0;

    if (!reply) {
      throw new Error('Received empty response from AI provider.');
    }

    return {
      reply: reply.trim(),
      tokensUsed,
      model,
    };
  } catch (error) {
    console.error('[AI_SERVICE_ERROR]', error.message);
    throw error;
  }
}

export default {
  generateChatCompletion,
};

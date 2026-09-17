import config from '../config/environment.js';

export const whatsappService = {
  async sendTextMessage(to, message) {
    const url = `https://graph.facebook.com/v17.0/${config.whatsapp.phoneNumberId}/messages`;
    
    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      text: { body: message },
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.whatsapp.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`WhatsApp API error: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
      }

      const data = await response.json();
      return data;
    } catch (err) {
      console.error('[WHATSAPP SERVICE ERROR]', err.message);
      throw err;
    }
  },
};

export default whatsappService;

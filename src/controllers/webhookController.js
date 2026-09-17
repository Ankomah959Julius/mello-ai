import crypto from 'crypto';
import config from '../config/environment.js';
import whatsappService from '../services/whatsappService.js';

export const webhookController = {
  verifyWebhook(req, res) {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode && token) {
      if (mode === 'subscribe' && token === config.whatsapp.verifyToken) {
        console.log('[WEBHOOK] Webhook verified successfully.');
        return res.status(200).send(challenge);
      } else {
        console.warn('[WEBHOOK] Verification failed. Token mismatch.');
        return res.sendStatus(403);
      }
    }
    return res.sendStatus(400);
  },

  async handleWebhook(req, res) {
    const signature = req.headers['x-hub-signature-256'];
    
    // Optional HMAC signature validation if app secret or verify token secret is used
    // Meta uses App Secret by default, but if configured with verifyToken as secret or app secret:
    if (signature && config.whatsapp.verifyToken) {
      const secret = process.env.WHATSAPP_APP_SECRET || config.whatsapp.verifyToken;
      const elements = signature.split('=');
      const signatureHash = elements[1];
      const expectedHash = crypto
        .createHmac('sha256', secret)
        .update(req.rawBody || JSON.stringify(req.body))
        .digest('hex');

      if (signatureHash !== expectedHash) {
        console.warn('[WEBHOOK] Invalid signature hash.');
        return res.status(403).send('Invalid signature');
      }
    }

    const body = req.body;

    if (body.object === 'whatsapp_business_account') {
      try {
        const entries = body.entry || [];
        for (const entry of entries) {
          const changes = entry.changes || [];
          for (const change of changes) {
            const value = change.value || {};
            const messages = value.messages || [];

            for (const message of messages) {
              const from = message.from; // Sender phone number
              const messageType = message.type;

              if (messageType === 'text' && message.text) {
                const messageBody = message.text.body;
                console.log(`[WHATSAPP] Received message from ${from}: "${messageBody}"`);

                // Phase 3: Echo test loop
                const replyText = `Echo: ${messageBody}`;
                await whatsappService.sendTextMessage(from, replyText);
                console.log(`[WHATSAPP] Sent echo reply to ${from}`);
              }
            }
          }
        }
        return res.status(200).send('EVENT_RECEIVED');
      } catch (err) {
        console.error('[WEBHOOK ERROR] Processing webhook event failed:', err);
        // Always return 200 to Meta to prevent endless retries, even if processing failed internally
        return res.status(200).send('EVENT_RECEIVED');
      }
    } else {
      return res.sendStatus(404);
    }
  },
};

export default webhookController;

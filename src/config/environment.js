import dotenv from 'dotenv';

dotenv.config();

const requiredEnvVars = [
  'DATABASE_URL',
  'WHATSAPP_ACCESS_TOKEN',
  'WHATSAPP_PHONE_NUMBER_ID',
  'WHATSAPP_VERIFY_TOKEN',
  'AI_API_KEY',
];

const missingVars = requiredEnvVars.filter(
  (key) => !process.env[key] || process.env[key].trim() === ''
);

if (missingVars.length > 0) {
  console.error(
    `[FATAL] Missing required environment variables:\n  - ${missingVars.join('\n  - ')}`
  );
  process.exit(1);
}

export const config = Object.freeze({
  port: parseInt(process.env.PORT || '3000', 10),
  databaseUrl: process.env.DATABASE_URL,
  whatsapp: Object.freeze({
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN,
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
    verifyToken: process.env.WHATSAPP_VERIFY_TOKEN,
  }),
  ai: Object.freeze({
    apiKey: process.env.AI_API_KEY,
  }),
});

export default config;

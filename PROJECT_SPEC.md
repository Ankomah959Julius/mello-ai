# Mello AI — Project Spec (for OpenCode)

This file is the single source of truth for building Mello AI. Reference it in every OpenCode prompt (e.g. "per PROJECT_SPEC.md, implement Phase 2 only"). Do not skip ahead to later phases without being asked.

## 1. What this is

Mello AI is a WhatsApp-based AI chatbot. Users message it directly through WhatsApp; the backend forwards their message (plus recent conversation history) to an LLM and sends the reply back through WhatsApp. There is no custom frontend — WhatsApp is the UI.

## 2. Tech Stack

- **Backend:** Node.js / Express
- **Database:** PostgreSQL
- **Messaging:** WhatsApp Business Cloud API
- **LLM:** Provider-agnostic — OpenAI or Gemini API, swappable behind a single service

## 3. System Architecture

```
USER MOBILE
    │ WhatsApp Protocol
    ▼
WHATSAPP BUSINESS CLOUD API
    │ HTTPS Webhook (POST)
    ▼
MELLO AI BACKEND (Node.js / Express)
    ┌───────────────────┐  ┌────────────────┐  ┌─────────────┐
    │ Webhook Controller │  │ Memory Engine  │  │ AI Service  │
    └───────────────────┘  └────────────────┘  └─────────────┘
         │                                            │
         ▼                                            ▼
   POSTGRESQL DATABASE                          LLM PROVIDER
  (Users, Messages, Usage)                    (OpenAI / Gemini API)
```

## 4. Step-by-Step Execution Sequence

1. **Inbound Event** — User sends a WhatsApp message to Mello AI.
2. **Webhook Trigger** — WhatsApp Cloud API forwards a JSON payload to `POST /webhook`.
3. **Verification & Extraction** — Express validates the Meta HMAC SHA-256 signature header, extracts phone number and message payload.
4. **User Resolution** — Query Postgres to retrieve or auto-create the user record.
5. **History Retrieval** — Fetch the last N messages (sliding window, 6–10) for the current conversation.
6. **AI Request Construction** — Compile system prompt + retrieved history + new user message into the LLM API payload.
7. **LLM Inference** — Call the LLM provider; get back response text + token usage.
8. **Database Persistence** — Store user message, AI response, and token usage log inside one Postgres transaction.
9. **Outbound Dispatch** — Call the WhatsApp Cloud API outbound message endpoint.
10. **Delivery** — User receives the reply in WhatsApp.

## 5. Database Schema (PostgreSQL)

### Entity relationships
```
USERS 1───< N CONVERSATIONS
  │                │
  │ 1              │ 1
  ├───< 1          ├───< N
  │ USER_SETTINGS  │ MESSAGES
  │
  └───< N AI_USAGE
```

### DDL

```sql
CREATE TABLE users (
  id BIGSERIAL PRIMARY KEY,
  whatsapp_number VARCHAR(30) UNIQUE NOT NULL,
  name VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  last_seen TIMESTAMP WITH TIME ZONE
);

CREATE TABLE user_settings (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  language VARCHAR(20) DEFAULT 'English',
  response_style VARCHAR(30) DEFAULT 'normal'
);

CREATE TABLE conversations (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE messages (
  id BIGSERIAL PRIMARY KEY,
  conversation_id BIGINT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender VARCHAR(20) NOT NULL CHECK (sender IN ('user', 'assistant', 'system')),
  message TEXT NOT NULL,
  message_type VARCHAR(30) DEFAULT 'text',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE ai_usage (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  model VARCHAR(100) NOT NULL,
  tokens_used INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Performance indexes
CREATE INDEX idx_users_whatsapp ON users(whatsapp_number);
CREATE INDEX idx_conversations_user ON conversations(user_id);
CREATE INDEX idx_messages_conversation ON messages(conversation_id, created_at DESC);
```

## 6. Project Structure

```
mello-ai/
├── src/
│   ├── config/
│   │   ├── database.js          # PostgreSQL pool configuration
│   │   └── environment.js       # Validated env var schema (fail fast on boot)
│   ├── controllers/
│   │   ├── webhookController.js # Webhook verification & message handling
│   │   └── userController.js    # User preference & management API
│   ├── routes/
│   │   ├── webhookRoutes.js     # GET/POST /webhook
│   │   └── userRoutes.js        # User profile routes
│   ├── services/
│   │   ├── aiService.js         # Provider-agnostic LLM client wrapper
│   │   ├── whatsappService.js   # Cloud API message transmitter
│   │   └── conversationService.js # DB context fetching & history management
│   ├── models/
│   │   ├── userModel.js
│   │   ├── conversationModel.js
│   │   └── messageModel.js
│   ├── middleware/
│   │   └── errorHandler.js      # Central error catching & logging
│   └── app.js                   # Express application setup
├── .env.example
├── package.json
└── README.md
```

## 7. Environment Variables

| Variable | Purpose |
|---|---|
| `PORT` | Server HTTP listening port (e.g. 3000) |
| `DATABASE_URL` | PostgreSQL connection URI with SSL config |
| `WHATSAPP_ACCESS_TOKEN` | Permanent/system-user OAuth token for Meta API |
| `WHATSAPP_PHONE_NUMBER_ID` | Meta Cloud API registered sender ID |
| `WHATSAPP_VERIFY_TOKEN` | Secret string for webhook challenge verification |
| `AI_API_KEY` | API key for the LLM provider |

## 8. Security, Privacy & Safety Guidelines

- **Credential hygiene:** all secrets via env vars, zero hardcoding in the repo.
- **Webhook validation:** validate Meta's HMAC SHA-256 signature header on every incoming `POST /webhook`.
- **Data privacy & retention:** `/clear` command wipes conversation buffers; sensitive fields must not be logged.
- **AI safety guardrails:** system prompt must enforce boundaries — refuse illegal activity, malware generation, hate speech, and medical/legal diagnosis requests.

## 9. Performance Optimization

- **Connection pooling:** use `pg.Pool` in Node.js, don't open a new connection per request.
- **Bounded context window:** limit history retrieval to the last 6–10 messages per prompt.
- **Indexing:** mandatory B-tree indexes on `whatsapp_number` and all foreign key join columns.

## 10. Implementation Roadmap

Work through these phases **in order**. Do not start a phase until the previous one is verified working.

| Phase | Milestone | Deliverable |
|---|---|---|
| 1 | Environment & Skeleton Setup | Express server running, env validation, Git initialized |
| 2 | PostgreSQL Integration | Migrations run; connection pooling established |
| 3 | WhatsApp Gateway Loop | Echo test working: WhatsApp message → Node.js → autoreply |
| 4 | LLM Integration | Node.js connects to LLM provider; answers static prompts |
| 5 | Context Memory & Storage | Multi-turn dialog works with Postgres persistence |
| 6 | Commands & Hardening | `/clear`, `/help` implemented; security validation active |
| 7 | Production Deployment | Deployed on PaaS/VPS + managed Postgres, behind HTTPS |

## 11. Rules for OpenCode

- Only implement the phase explicitly requested — do not jump ahead.
- Follow the folder structure in section 6 exactly; don't introduce new top-level folders without asking.
- Never hardcode secrets — always read from `process.env` via `environment.js`.
- After each phase, explain what was changed and how to test it before moving on.

# Mello AI — Project Spec (for OpenCode)

This file is the single source of truth for building Mello AI. Reference it in every OpenCode prompt (e.g. "per PROJECT_SPEC.md, implement Phase 2 only"). Do not skip ahead to later phases without being asked.

## 1. What this is

Mello AI is an AI chatbot with its own web chat interface. Users type messages into a browser-based chat UI; the backend forwards their message (plus recent conversation history) to an LLM and returns the reply to display in the chat window. There is no WhatsApp dependency — a custom HTML/JS (or lightweight frontend framework) page is the UI.

> **Note:** This project originally targeted WhatsApp Business Cloud API as the messaging channel (see `webhookController.js` / `whatsappService.js`, kept dormant in the codebase). That channel was shelved after Meta's test-number provisioning hit a platform-side outage during setup. The web chat interface below replaces it as the primary channel; WhatsApp can be re-added later as an additional channel without reworking the database or AI logic.

## 2. Tech Stack

- **Backend:** Node.js / Express
- **Frontend:** Simple HTML/CSS/JS chat interface served as static files (or a minimal SPA), talking to the backend via a REST API
- **Database:** PostgreSQL
- **LLM:** Provider-agnostic — OpenAI or Gemini API, swappable behind a single service

## 3. System Architecture

```
USER BROWSER
    │ HTTP (fetch/XHR)
    ▼
MELLO AI BACKEND (Node.js / Express)
    ┌─────────────────┐  ┌────────────────┐  ┌─────────────┐
    │ Chat Controller  │  │ Memory Engine  │  │ AI Service  │
    └─────────────────┘  └────────────────┘  └─────────────┘
         │                                            │
         ▼                                            ▼
   POSTGRESQL DATABASE                          LLM PROVIDER
  (Sessions, Messages, Usage)                 (OpenAI / Gemini API)
```

## 4. Step-by-Step Execution Sequence

1. **Inbound Event** — User types a message into the web chat UI and hits send.
2. **API Call** — Frontend sends a `POST /api/chat` request with the message and a session/user identifier.
3. **Session Resolution** — Query Postgres to retrieve or auto-create the user/session record.
4. **History Retrieval** — Fetch the last N messages (sliding window, 6–10) for the current conversation.
5. **AI Request Construction** — Compile system prompt + retrieved history + new user message into the LLM API payload.
6. **LLM Inference** — Call the LLM provider; get back response text + token usage.
7. **Database Persistence** — Store user message, AI response, and token usage log inside one Postgres transaction.
8. **Response Dispatch** — Return the AI reply as the API response.
9. **Delivery** — Frontend renders the reply in the chat window.

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
├── public/
│   └── index.html                # Web chat interface (HTML/CSS/JS)
├── src/
│   ├── config/
│   │   ├── database.js          # PostgreSQL pool configuration
│   │   └── environment.js       # Validated env var schema (fail fast on boot)
│   ├── controllers/
│   │   ├── chatController.js    # Handles POST /api/chat requests
│   │   ├── webhookController.js # (dormant) WhatsApp webhook handling, kept for future re-integration
│   │   └── userController.js    # User/session preference & management API
│   ├── routes/
│   │   ├── chatRoutes.js        # POST /api/chat
│   │   ├── webhookRoutes.js     # (dormant) GET/POST /webhook
│   │   └── userRoutes.js        # User/session routes
│   ├── services/
│   │   ├── aiService.js         # Provider-agnostic LLM client wrapper
│   │   ├── whatsappService.js   # (dormant) WhatsApp Cloud API transmitter
│   │   └── conversationService.js # DB context fetching & history management
│   ├── models/
│   │   ├── userModel.js
│   │   ├── conversationModel.js
│   │   └── messageModel.js
│   ├── middleware/
│   │   └── errorHandler.js      # Central error catching & logging
│   └── app.js                   # Express application setup (serves /public + API routes)
├── .env.example
├── package.json
└── README.md
```

## 7. Environment Variables

| Variable | Purpose |
|---|---|
| `PORT` | Server HTTP listening port (e.g. 3000) |
| `DATABASE_URL` | PostgreSQL connection URI with SSL config |
| `AI_API_KEY` | API key for the LLM provider |
| `WHATSAPP_ACCESS_TOKEN` | (dormant, for future re-integration) Permanent/system-user OAuth token for Meta API |
| `WHATSAPP_PHONE_NUMBER_ID` | (dormant) Meta Cloud API registered sender ID |
| `WHATSAPP_VERIFY_TOKEN` | (dormant) Secret string for webhook challenge verification |

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
| 1 | Environment & Skeleton Setup | Express server running, env validation, Git initialized ✅ |
| 2 | PostgreSQL Integration | Migrations run; connection pooling established ✅ |
| 3 | Web Chat Interface | Static chat UI in `public/`, `POST /api/chat` echoes back input |
| 4 | LLM Integration | Node.js connects to LLM provider; chat UI shows real AI replies |
| 5 | Context Memory & Storage | Multi-turn dialog works with Postgres persistence |
| 6 | Commands & Hardening | `/clear`, `/help` implemented; security validation active |
| 7 | Production Deployment | Deployed on PaaS/VPS + managed Postgres, behind HTTPS |

> Phase 3 was originally "WhatsApp Gateway Loop." It was replaced with a web chat interface after a Meta-side platform outage blocked WhatsApp test-number provisioning. The WhatsApp webhook code (`webhookController.js`, `whatsappService.js`, `webhookRoutes.js`) is left in place, dormant, for potential future re-integration as an additional channel — it should not be deleted or modified during Phase 3.

## 11. Rules for OpenCode

- Only implement the phase explicitly requested — do not jump ahead.
- Follow the folder structure in section 6 exactly; don't introduce new top-level folders without asking.
- Never hardcode secrets — always read from `process.env` via `environment.js`.
- After each phase, explain what was changed and how to test it before moving on.

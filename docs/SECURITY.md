# Security and trust boundaries

## Synthetic demo, not authentication

The server creates a random, HttpOnly, SameSite=Lax browser cookie and partitions synthetic state by that opaque identifier. It never accepts a record owner from an LLM. Both demo personas are intentionally selectable; their workspaces are persisted separately.

This is **not** institutional identity verification, SSO, or a real employee access-control system. A real deployment must use a supported identity provider and authorize every operation against verified institutional roles and resources.

## Model authority

The language model has **no write tools**. It cannot create tickets, approve them, change HR/LMS state, activate accounts, or access another persona's onboarding record. The onboarding adapter is read-only and receives a server-owned synthetic persona.

Evidence and user messages are explicitly treated as untrusted data. Simple deterministic request gates refuse recognizable approval-bypass and third-party-record requests. These regexes are illustrative controls, **not a complete prompt-injection defense**. Document uploads are not supported, so the bundled fictional corpus is the only retrieval source.

## Human approval

The approval hash binds ticket ID, title, description, category, priority, and requester. Editing any field invalidates an old hash. The approval route validates workspace ownership and the current hash. Submitted tickets cannot be edited.

The hash is a stale-payload check, **not a signature or proof of human identity**. The explicit UI action supplies approval in this synthetic demo. A production deployment needs verified user identity and recorded authorization.

Per-workspace database row locking serializes draft changes and approvals. A repeated submission of the same approved ticket returns the already submitted ticket. The mock connector updates the same durable record atomically. A real external connector additionally needs an idempotency key, outbox/reconciliation, and recovery for “external success, local failure.”

## Failures and limits

- Simulated connector failure leaves the ticket in draft state and records an audit event.
- Provider errors fail explicitly; model answers are never fabricated by an undisclosed fallback.
- There is a per-workspace ten-message-per-minute check and bounded conversation/message/ticket counts.
- Those limits are **not global abuse prevention**. New cookies bypass workspace limits; add distributed/IP/user limits and budgets before exposing costly model endpoints broadly.
- Evidence is capped at 8,000 characters and history at six messages of at most 2,000 characters each.
- Request schemas and IDs are validated. SQL variables are parameterized.

## Data and logs

Only fictional content should be used. Request logs omit cookies, bodies, query strings, and model input/output. Structured traces include action metadata, duration, and token totals, not raw prompts.

Conversations themselves intentionally persist in PostgreSQL. A narrow detector removes recognizable credential-like submissions before saving them, but it is **not comprehensive DLP**. Ticket forms are not a safe channel for secrets. No general personal-data detector, institutional retention policy, automatic expiry/deletion process, or formal compliance certification is implemented.

No real user records, credentials, or university data should be committed to GitHub.

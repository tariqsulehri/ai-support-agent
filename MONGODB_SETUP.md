# MongoDB Cluster Setup

The app can save completed voice-agent conversations to a MongoDB cluster. Persistence is optional: if `MONGODB_URI` is not configured, the agent still works and simply skips database writes.

## Environment Variables

Add these to `.env.local` for local development and to your hosting provider for production:

```bash
MONGODB_URI="mongodb+srv://<username>:<password>@<cluster-host>/<database>?retryWrites=true&w=majority"
MONGODB_DB_NAME="voiceagent"
MONGODB_CALLS_COLLECTION="conversations"
```

`MONGODB_DB_NAME` and `MONGODB_CALLS_COLLECTION` are optional. The defaults are `voiceagent` and `conversations`.

## Saved Document Shape

Each completed conversation is inserted into the configured collection from `/api/summarize`.

```json
{
  "tenant": {
    "id": "tkxel",
    "companyName": "tkxel",
    "agentName": "Support Agent"
  },
  "user": {
    "name": "Visitor Name",
    "email": "visitor@example.com",
    "phone": "+1 555 0100",
    "company": "Example Co",
    "country": "Pakistan",
    "purpose": "Needs an AI support agent"
  },
  "lead": {
    "name": "Visitor Name",
    "email": "visitor@example.com",
    "phone": "+1 555 0100",
    "company": "Example Co",
    "country": "Pakistan",
    "purpose": "Needs an AI support agent"
  },
  "hasLead": true,
  "requirement": {
    "summary": "Visitor needs an AI voice agent for website lead qualification.",
    "detectedNeed": "AI support and lead qualification agent",
    "servicesInterested": ["AI Solutions", "Web App Development"],
    "urgency": "medium",
    "budgetMentioned": false,
    "timelineMentioned": true
  },
  "classification": {
    "category": "ai_solution",
    "subcategory": "voice_agent",
    "intent": "buying_interest",
    "leadQuality": "warm",
    "sentiment": "positive"
  },
  "summary": {
    "text": "Short conversation recap.",
    "keyPoints": ["Important point"]
  },
  "callSummary": {
    "summary": "Short conversation recap.",
    "keyPoints": ["Important point"],
    "nextSteps": ["Follow up with integration questions"]
  },
  "transcript": [
    { "role": "user", "content": "..." },
    { "role": "assistant", "content": "..." }
  ],
  "status": "new",
  "source": {
    "mode": "conversation",
    "language": "auto"
  },
  "email": {
    "sent": false
  },
  "createdAt": "2026-06-08T00:00:00.000Z",
  "updatedAt": "2026-06-08T00:00:00.000Z"
}
```

## Atlas Checklist

- Create a MongoDB Atlas cluster.
- Create a database user with read/write access.
- Add your server IP or deployment platform IP range to Network Access.
- Copy the SRV connection string into `MONGODB_URI`.
- Run a completed agent conversation and check the `conversations` collection.

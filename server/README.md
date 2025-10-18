# PathFinder API Server

This is a lightweight Express backend server that handles AI-powered career counseling operations for the PathFinder application.

## Overview

The backend server provides three main API endpoints that interact with OpenAI's API to deliver personalized career guidance:

1. **Agent Chat** - Conversational AI that guides students through the discovery process
2. **RIASEC Calculation** - Personality assessment based on conversation analysis
3. **Path Recommendations** - Personalized major and career recommendations

## API Endpoints

### POST /api/agent-chat

Handles conversational interactions with students.

**Request Body:**
```json
{
  "messages": [
    { "role": "user", "content": "I love working with computers" },
    { "role": "assistant", "content": "That's great! What aspects..." }
  ],
  "stage": "questions"
}
```

**Response:**
```json
{
  "message": "What kind of computer work excites you most?",
  "next_stage": "questions"
}
```

### POST /api/calculate-riasec

Analyzes conversation to determine RIASEC personality scores.

**Request Body:**
```json
{
  "conversation_data": [
    { "role": "user", "content": "I love helping people" },
    { "role": "assistant", "content": "Tell me more..." }
  ]
}
```

**Response:**
```json
{
  "realistic": 30,
  "investigative": 45,
  "artistic": 60,
  "social": 85,
  "enterprising": 40,
  "conventional": 25,
  "confidence": "high",
  "reasoning": "Strong social orientation evident from helping focus..."
}
```

### POST /api/recommend-paths

Generates personalized major and career recommendations.

**Request Body:**
```json
{
  "conversation_data": [...],
  "riasec_scores": { "realistic": 30, ... },
  "session_id": "abc123",
  "type": "major"
}
```

**Response:**
```json
{
  "majors": [
    {
      "title": "Psychology",
      "why_fits": "Your passion for understanding people...",
      "salary_range": "$50K - $90K",
      "day_in_life": "You'll spend your days...",
      "details": {
        "courses": ["Intro to Psychology", "Research Methods"],
        "skills": ["Active listening", "Critical thinking"],
        "work_environment": "Clinical settings, schools...",
        "growth_outlook": "Growing field with 8% job growth..."
      }
    }
  ],
  "careers": [...]
}
```

## Environment Variables

The server requires the following environment variables (configured in `.env`):

- `OPENAI_API_KEY` - Your OpenAI API key (required)
- `VITE_SUPABASE_URL` - Supabase project URL (optional, for data persistence)
- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous key (optional, for data persistence)
- `PORT` - Server port (default: 3001)
- `NODE_ENV` - Environment mode (development/production)

## Running the Server

### Development Mode (with auto-reload)
```bash
npm run dev:server
```

### Production Build
```bash
npm run build:server
npm run start:server
```

### Run with Frontend
```bash
npm run dev
```
This command runs both the Vite frontend and Express backend concurrently.

## Tech Stack

- **Express** - Lightweight web framework
- **TypeScript** - Type-safe development
- **CORS** - Cross-origin resource sharing
- **dotenv** - Environment variable management
- **@supabase/supabase-js** - Optional database integration

## Security Notes

- API keys are kept secure on the backend and never exposed to the frontend
- CORS is enabled for development; configure appropriately for production
- All OpenAI API calls are proxied through this backend to protect credentials

## Development

The server uses `tsx watch` for hot-reloading during development. Any changes to files in the `server/` directory will automatically restart the server.

## Port Configuration

By default, the server runs on port 3001. The frontend expects to connect to this port. If you change the port, update `VITE_API_URL` in your `.env` file accordingly.

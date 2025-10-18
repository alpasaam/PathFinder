# PathFinder

An AI-powered career counseling application that helps college freshmen and sophomores discover their ideal major and career path through personalized conversations.

## Features

- Voice-enabled conversational AI career counseling
- RIASEC personality assessment
- Personalized major and career recommendations
- Interactive chat interface
- Progress tracking through the discovery process

## Tech Stack

### Frontend
- React + TypeScript
- Vite
- Tailwind CSS
- ElevenLabs (text-to-speech)
- Web Speech API (speech recognition)

### Backend
- Express + TypeScript
- OpenAI API (GPT-4o-mini)
- CORS-enabled REST API

### Database (Optional)
- Supabase (for conversation and recommendation persistence)

## Getting Started

### Prerequisites

- Node.js 18+ installed
- OpenAI API key
- ElevenLabs API key (for voice features)
- Supabase account (optional, for data persistence)

### Installation

1. Clone the repository
```bash
git clone <your-repo-url>
cd pathfinder
```

2. Install dependencies
```bash
npm install
```

3. Configure environment variables

Copy `.env.example` to `.env` and fill in your API keys:

```bash
cp .env.example .env
```

Required variables:
```env
# Frontend API Keys
VITE_ELEVENLABS_API_KEY=your_elevenlabs_api_key
VITE_API_URL=http://localhost:3001

# Backend API Keys
OPENAI_API_KEY=your_openai_api_key
PORT=3001
NODE_ENV=development

# Optional: Supabase (for data persistence)
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Running the Application

#### Development Mode (Both Frontend and Backend)
```bash
npm run dev
```

This will start:
- Frontend dev server on `http://localhost:5173`
- Backend API server on `http://localhost:3001`

#### Run Frontend Only
```bash
npm run dev:client
```

#### Run Backend Only
```bash
npm run dev:server
```

### Building for Production

```bash
npm run build
```

## Project Structure

```
pathfinder/
├── src/                    # Frontend React application
│   ├── components/         # React components
│   ├── hooks/             # Custom React hooks
│   ├── lib/               # Utility libraries
│   │   ├── agent/         # AI agent logic
│   │   └── utils/         # Helper functions
│   └── App.tsx            # Main application component
├── server/                # Backend Express server
│   ├── routes/            # API route handlers
│   │   ├── agent-chat.ts
│   │   ├── calculate-riasec.ts
│   │   └── recommend-paths.ts
│   ├── index.ts           # Server entry point
│   └── README.md          # Backend documentation
├── supabase/              # Database migrations (optional)
│   └── migrations/        # SQL migration files
└── package.json           # Project dependencies
```

## API Documentation

See [server/README.md](server/README.md) for detailed API endpoint documentation.

## Environment Variables

### Frontend Variables (VITE_ prefix)
- `VITE_SUPABASE_URL` - Supabase project URL (optional)
- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous key (optional)
- `VITE_ELEVENLABS_API_KEY` - ElevenLabs API key for text-to-speech
- `VITE_API_URL` - Backend API URL (default: http://localhost:3001)

### Backend Variables
- `OPENAI_API_KEY` - OpenAI API key (required)
- `PORT` - Server port (default: 3001)
- `NODE_ENV` - Environment mode (development/production)

## How It Works

1. **Initial Conversation**: Students engage in a voice or text conversation with PathFinder AI
2. **Discovery Phase**: The AI asks 4 targeted questions to understand interests, values, and strengths
3. **RIASEC Assessment**: Based on the conversation, the system calculates RIASEC personality scores
4. **Major Recommendations**: The AI recommends 2-3 majors that align with the student's profile
5. **Career Paths**: After selecting a major, students receive 2-3 personalized career recommendations

## Contributing

This project is fully portable and IDE-agnostic. You can develop it in any environment with Node.js installed.

## License

MIT

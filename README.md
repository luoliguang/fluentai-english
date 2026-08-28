# FluentAI

An AI-powered English conversation practice app for Chinese learners. Talk with Luna, your personal English tutor — she corrects your grammar in real time, highlights advanced vocabulary, and builds your personal word bank automatically.

![Next.js](https://img.shields.io/badge/Next.js-14-black?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-38bdf8?style=flat-square&logo=tailwindcss)
![DeepSeek](https://img.shields.io/badge/AI-DeepSeek-purple?style=flat-square)

## Features

- **AI Conversation** — Chat with Luna via voice (Web Speech API) or text. Responses stream in real time.
- **Grammar Correction** — Luna flags errors after every message, showing what you said vs. the correct form with a Chinese explanation.
- **Vocabulary Tagging** — Luna automatically highlights B2–C1 level words she uses. Save any word to your bank with one click.
- **Word Bank** — Review all saved words, track mastery progress, and filter by learning status.
- **Bilingual UI** — Switch the interface between Chinese and English at any time.
- **No account required** — All data is stored locally in the browser.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| AI | DeepSeek Chat API (via OpenAI SDK) |
| Speech | Web Speech API (browser-native) |
| Storage | localStorage (no backend database) |

## Getting Started

### Prerequisites

- Node.js 18+
- A [DeepSeek API key](https://platform.deepseek.com)

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/luoliguang/fluentai-english.git
cd fluentai-english

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.local.example .env.local
```

Open `.env.local` and fill in your DeepSeek API key:

```
DEEPSEEK_API_KEY=your_deepseek_api_key_here
```

```bash
# 4. Start the development server
npm run dev
```

Open [http://localhost:3001](http://localhost:3001) in your browser.

### Build for Production

```bash
npm run build
npm run start
```

## Project Structure

```
fluentai/
├── app/
│   ├── api/chat/route.ts   # Streaming API endpoint (DeepSeek)
│   ├── page.tsx            # Dashboard
│   ├── practice/page.tsx   # AI conversation page
│   ├── vocabulary/page.tsx # Word bank page
│   └── globals.css
├── components/
│   └── Sidebar.tsx         # Navigation sidebar
├── lib/
│   ├── types.ts            # TypeScript interfaces
│   ├── wordBank.ts         # localStorage CRUD + tag parsers
│   ├── i18n.ts             # Chinese / English translations
│   └── i18nContext.tsx     # Language context provider
└── .env.local.example      # Environment variable template
```

## How Luna Works

Luna's behavior is controlled by a system prompt in `app/api/chat/route.ts`. She follows two rules on every reply:

1. **Grammar correction** — If the user makes a grammatical error, Luna appends a structured `[CORRECTION:wrong→right:中文说明]` tag. The frontend parses this and renders a correction card below her message.

2. **Vocabulary tagging** — When Luna naturally uses an advanced word (B2–C1), she wraps it in a `[WORD:word:/phonetic/:pos:definition]` tag. The frontend highlights it inline and shows a save prompt.

## License

MIT

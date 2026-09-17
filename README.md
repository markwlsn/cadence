# 🎓 Cadence — AI-Powered Spaced Repetition & Study Companion

[![Next.js](https://img.shields.io/badge/Next.js-16.3.5-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-blue?style=flat-square&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-6.19-2D3748?style=flat-square&logo=prisma)](https://www.prisma.io/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-38B2AC?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)

**Cadence** is a modern, Apple-inspired flashcard and spaced repetition system engineered specifically for active student learning. 

Unlike traditional flashcard apps where users passively flip cards, Cadence requires **active recall** through typed fill-in-the-blanks, syntax-highlighted code editors, interactive multiple-choice drills, and intelligent typo tolerance. Scheduled by the **FSRS (Free Spaced Repetition Scheduler)** algorithm and powered by **Google Gemini AI**, Cadence ensures high retention with minimal study fatigue.

---

## ✨ Key Features

### 🧠 Multimodal AI Ingestion
- Upload lecture slides (**PDF**), paste raw study notes (**Text**), or submit diagrams (**Images**).
- Gemini AI parses materials into logical conceptual chunks (150–400 words) and auto-generates balanced decks of clozes, code blanks, MCQs, and conceptual cards in seconds.

### ✍️ Active Recall Interactivity
- **Fill in the Blanks (Cloze)**: Type missing terms directly inside sentences or definitions with one-click hints (first character & length reveal).
- **Code Blank Editor**: Dark, VS Code-styled code editor blocks with syntax formatting for computer science and programming revision.
- **Multiple Choice Questions (MCQ)**: Instant visual feedback with clickable cards and ergonomic keyboard shortcuts (`1–4` and `A–D`).
- **Basic Active Recall**: Type your initial recall answer into an answer box before flipping to compare side-by-side with the model explanation.

### 🎯 Intelligent Fuzzy Grading
- Built-in tiered Levenshtein distance algorithm:
  - **Short answers (≤3 chars)**: Strict matching prevents false positives.
  - **Medium answers (4–6 chars)**: 1 typo permitted (e.g., `promse` matches `promise`).
  - **Long answers (≥7 chars)**: Up to 2 typos or ≥82% similarity tolerated.
- Strips accents, punctuation, quotes, and whitespace variations.

### 📈 Free Spaced Repetition Scheduler (FSRS v5)
- State-of-the-art memory algorithm tracking card stability ($S$), difficulty ($D$), and optimal interval review dates.
- Two distinct study modes:
  - **Mastery Mode**: Review cards scheduled due today according to spaced repetition.
  - **Cram Mode**: High-yield triage sorting cards by highest difficulty and lowest stability for exam prep.

### ⚡ Gamification & Motivation
- **XP Progression & 6 Scholar Tiers**: From *Novice Scholar* (0 XP) to *Grandmaster of Recall* (7,500 XP).
- **3-Star Rating System**: Earn 1, 2, or 3 animated stars based on your session recall accuracy.
- **Daily Streak Counter 🔥**: Tracks continuous study consistency with automated daily rollover.
- **Achievement Badges**: Unlock milestones such as *First Step*, *Streak Starter*, *Dedicated Scholar*, *Century Club*, and *Sharpshooter*.

### 🎨 Apple-Inspired Design & Theming
- Crisp, clean default **Light Theme** engineered for readability during long study sessions.
- Seamless **Dark Mode** toggle persisted in `localStorage` with zero-flash rendering.
- Fully responsive across desktop, tablet, and mobile devices.

### 👤 Profile & Authentication
- **Frictionless "Continue as Guest"**: Jump straight into studying without mandatory registration.
- **Account Registration & Login**: Custom display names, password strength evaluation, and 10 custom avatar emojis.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 16.3.5 (App Router, Turbopack) |
| **Frontend** | React 19, TypeScript 5, Tailwind CSS v4 |
| **Database & ORM** | SQLite, Prisma ORM 6.19 |
| **Spaced Repetition** | `ts-fsrs` (v5.4.2) |
| **AI Ingestion** | Google Gemini API (`gemini-1.5-flash` / `gemini-2.0`) & Anthropic SDK |
| **File Parsing** | `pdf-parse` v1.1.1 |

---

## 🚀 Workstation Transfer & Clone Instructions

Follow these exact steps whenever you clone or transfer this repository to another workstation.

### Prerequisites
- [Node.js](https://nodejs.org/) (version **18.18+** or **20+** recommended)
- `npm` (bundled with Node.js) or `pnpm` / `yarn`
- Git installed on your system
- A [Google AI Studio API Key](https://aistudio.google.com/app/apikey) (Free)

---

### Step 1: Clone the Repository

```bash
git clone https://github.com/markwlsn/cadence.git
cd cadence
```

---

### Step 2: Install Dependencies

```bash
npm install
```

---

### Step 3: Configure Environment Variables

Create your local `.env.local` file by copying the provided template:

```bash
# On macOS / Linux
cp .env.example .env.local

# On Windows PowerShell
Copy-Item .env.example .env.local
```

Open `.env.local` in your editor and add your API keys:

```env
# Database Configuration (SQLite)
DATABASE_URL="file:./dev.db"

# Google Gemini API Key (Required for AI deck generation)
GEMINI_API_KEY="your_gemini_api_key_here"
GEMINI_MODEL="gemini-1.5-flash"

# Optional: Anthropic Fallback Provider
ANTHROPIC_API_KEY=""

# Offline Mock Testing Mode (Set to true if testing without an AI key)
USE_MOCKS=false
PORT=3000
```

---

### Step 4: Initialize the Database & Seed Sample Decks

Generate the Prisma client, push the schema to create `dev.db`, and seed sample study decks:

```bash
# Generate Prisma Client & push schema to SQLite
npm run db:push

# Populate database with sample curated decks (Cell Biology, JavaScript Promises)
npm run db:seed
```

---

### Step 5: Run the Application

#### Development Mode (with hot-reloading)
```bash
npm run dev
```

#### Production Build (optimized)
```bash
npm run build
npm run start
```

Visit **[http://localhost:3000](http://localhost:3000)** in your browser!

---

## 📂 Project Architecture

```
cadence/
├── app/
│   ├── _components/          # Client dashboard components (Hero, Stats, Decks grid)
│   ├── api/                  # Next.js Route Handlers
│   │   ├── decks/            # GET / POST decks, ingest, stats, card generation
│   │   └── review/           # GET queue, POST submit review (FSRS engine)
│   ├── decks/
│   │   ├── [id]/             # Deck dashboard & card browser
│   │   │   ├── review/       # Active review session runner
│   │   │   └── summary/      # 3-Star gamified review summary screen
│   │   └── new/              # Multimodal AI ingestion form
│   ├── login/                # Authentication & Guest entry
│   ├── register/             # User registration with avatar selector
│   ├── profile/              # Student stats, achievement badges & goals
│   ├── globals.css           # Design tokens, keyframe animations, light/dark themes
│   └── page.tsx              # Server-rendered home dashboard
├── components/
│   ├── review/
│   │   ├── FlashCard.tsx     # Cloze, code blank, MCQ & basic card renderer
│   │   └── CardStack.tsx     # Smooth gesture-driven card stack
│   └── ui/
│       ├── Navbar.tsx        # Global navigation with streak, XP & profile
│       ├── ThemeToggle.tsx   # Sun/Moon animated switcher
│       └── ...               # Button, Badge, ProgressRing, etc.
├── lib/
│   ├── ai/                   # Gemini & Claude multimodal integration
│   ├── fsrs/                 # Spaced repetition scheduling core
│   ├── utils/
│   │   └── levenshtein.ts    # Typo tolerance & fuzzy grading engine
│   ├── auth.ts               # Frictionless user & guest session manager
│   ├── data.ts               # Unified API data access seam
│   └── gamification.ts       # XP, levels, stars, badges & streak calculations
└── prisma/
    ├── schema.prisma         # Database models (Deck, Card, ReviewLogEntry)
    └── seed.ts               # Sample study decks & seeded cards
```

---

## 📜 Available NPM Scripts

| Command | Description |
|---|---|
| `npm run dev` | Starts local Next.js development server on port 3000 |
| `npm run build` | Compiles optimized Next.js production build with TypeScript checks |
| `npm run start` | Runs the compiled production server |
| `npm run db:push` | Synchronizes Prisma schema directly with local SQLite database |
| `npm run db:seed` | Seeds curated decks and cards into SQLite database |
| `npm run db:generate` | Re-generates Prisma Client types |
| `npm run test:pipeline` | Verifies end-to-end AI ingestion and generation pipeline |
| `npm run test:unit` | Executes unit tests on FSRS scheduling and utilities |

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).

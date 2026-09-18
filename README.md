# 🎓 Cadence — Apple-Inspired Academic Exam Reviewer & Spaced Repetition Platform

[![Next.js](https://img.shields.io/badge/Next.js-16.3.5-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-blue?style=flat-square&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-6.19-2D3748?style=flat-square&logo=prisma)](https://www.prisma.io/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-38B2AC?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)

**Cadence** is an authentic, Apple-grade e-learning reviewer built specifically for serious students preparing for university exams and board qualifications.

Unlike standard flashcard apps cluttered with gamification noise, Cadence uses a **structured linear assessment curriculum**, **AI-driven Socratic mistake analysis**, **clinical-grade exam readiness diagnostics**, and the **Free Spaced Repetition Scheduler (FSRS v5)** to ensure high retention with zero distraction.

---

## ✨ Academic Reviewer Architecture

### 🏛️ Structured Linear Assessment Curriculum
Replaces random card flipping with an organized sequence adapted to each deck:
1. **Foundational Quizzes (Quizzes 1–3)**: Core terminology, basic retrieval, and fundamental definitions.
2. **Section Synthesis (Long Quizzes 1–2)**: Integration across topics, procedural mechanisms, and complex recall.
3. **Comprehensive Mock Exam (35 items)**: Full examination simulation with an Apple-style **35-minute countdown timer**, **`🚩 Flag for Review`** toggles, and an interactive **Question Jump Navigator**.

### 📄 Printable Academic Diagnostic Report
- **Official Evaluation Document (`/decks/:id/diagnostic`)**: Replaces artificial badges with a scientific performance diagnostic.
- **Pass Likelihood Forecast**: Statistical pass probability (e.g. *88% – 96% High Likelihood of Passing*).
- **3-Pillar Academic Weighting**:
  - **40% Curriculum Progression**: Linear milestone adherence.
  - **35% Test Performance**: Average score across completed assessments.
  - **25% Retention Stability**: FSRS memory stability and mastery counts.
- **Domain Breakdown**: Compares foundational terminology recall against analytical MCQ scenario discrimination.
- **Prescribed Study Action Plan**: Step-by-step checklist of what to review before test day.
- **1-Click Print / PDF Export (`🖨️`)**: Formatted specifically for single-page A4 / Letter export.

### 💡 AI Socratic Rationale Tutor ("Why is this wrong?")
- When a student answers incorrectly, Cadence analyzes the subtle conceptual gap:
  1. **The Cognitive Trap**: Why the chosen option or distractor was tempting.
  2. **The Causal Mechanism**: Why the correct answer is unambiguously correct.
  3. **Anchor Takeaway**: A single, punchy takeaway sentence to lock into memory.
- Available directly on answer reveal during reviews and inside the Mistake Notebook.
- Powered by Claude / Gemini with an intelligent offline cognitive heuristic fallback.

### 📓 Cross-Deck Mistake Notebook & Error Taxonomy (`/notebook`)
- Central error repository that automatically captures missed questions across all decks.
- Classify mistakes by cognitive failure mode:
  - ⚡ **Misread Question / Rushed**
  - 🧠 **Concept Distinction / Distractor Trap**
  - 📖 **Knowledge Gap / Unfamiliar Term**
  - 🔢 **Multi-Step Execution / Calculation Error**
- **1-Click Remediation**: Launch a custom review drill targeting only filtered mistakes.

### 📑 High-Yield Key Principles & Study Guide
- Pre-quiz executive revision sheet on every deck page:
  - **Part I**: Core Terminology & Definitions.
  - **Part II**: Conceptual Distinctions & MCQ Rationales.
  - Real-time search filter and print-to-PDF study sheet action.

### 📱 Dual-Mode UI (Desktop Web vs. Native Mobile App)
- **Desktop Web**: Spacious multi-column workspace with sidebar assessments, top navbar, and keyboard shortcuts (`Space` to flip, `1–4` to rate).
- **Mobile App View**: Native iOS experience with a frosted glass bottom tab bar (`Today`, `Decks`, `+ Create`, `Notebook`, `Account`), thumb-reachable touch targets, and safe-area padding.
- Automatically hides navigation during review sessions for 100% full-screen focus.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 16.3.5 (App Router, Turbopack) |
| **Frontend** | React 19, TypeScript 5, Tailwind CSS v4 |
| **Database & ORM** | SQLite, Prisma ORM 6.19 (with LibSQL / Turso adapter support) |
| **Spaced Repetition** | `ts-fsrs` (v5.4.2) |
| **AI Ingestion & Rationale** | Google Gemini API (`gemini-1.5-flash` / `gemini-2.0`) & Anthropic Claude SDK |
| **File Parsing** | `pdf-parse` v1.1.1 |

---

## 🚀 Cloning & Working Across Multiple Computers

Follow this exact guide whenever you want to set up, edit, or update Cadence on another desktop, laptop, or workstation.

### Prerequisites
- [Node.js](https://nodejs.org/) (**v18.18+** or **v20+**)
- `git` installed
- A code editor (e.g., VS Code or Antigravity)

---

### A. First-Time Setup on a New Laptop or Desktop

#### 1. Clone your repository
```bash
git clone https://github.com/markwlsn/cadence.git
cd cadence
```

#### 2. Install dependencies
```bash
npm install
```
*(Prisma Client will automatically generate via the `postinstall` script).*

#### 3. Create your local environment file
Copy the example file to `.env.local`:
```bash
# On Windows PowerShell:
Copy-Item .env.example .env.local

# On macOS / Linux:
cp .env.example .env.local
```

Open `.env.local` and configure your keys:
```env
# Local SQLite database
DATABASE_URL="file:./dev.db"

# AI Provider Key (Gemini or Claude)
GEMINI_API_KEY="your-gemini-api-key-here"
AI_PROVIDER="gemini"

# Set to false to use live AI; true for offline mock mode
USE_MOCKS=false
PORT=3000
```

#### 4. Initialize the database
```bash
npm run db:push
npm run db:seed
```

#### 5. Start development
```bash
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

### B. Daily Workflow: Switching Between Computers

Whenever you move from your desktop to your laptop (or vice versa):

#### Step 1: Before you start working (Pull latest changes)
Always pull the latest code so your machine is in sync with GitHub:
```bash
git pull origin main
```

#### Step 2: Make your updates & test
Work on your features or review cards. Run the automated checks:
```bash
# Run unit test suite
npm run test:unit

# Verify production build
npm run build
```

#### Step 3: Save and push your changes back
```bash
git add -A
git commit -m "feat: your update message here"
git push origin main
```

---

### C. Live Cloud Deployment (Vercel)

Cadence is configured for **Continuous Deployment** with Vercel:

- **Automatic Sync**: Whenever you push changes to `main` from **any** laptop or desktop, Vercel automatically detects the commit, runs `npm run build`, and deploys your updates live in ~60 seconds.
- **Zero Downtime**: Vercel keeps the previous version live until the new build passes successfully.
- **Environment Variables on Vercel**: Ensure `GEMINI_API_KEY` (or `ANTHROPIC_API_KEY`) is added in your Vercel Project Dashboard under **Settings $\rightarrow$ Environment Variables**.

---

## 📜 Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Starts local Next.js development server on port 3000 |
| `npm run build` | Compiles optimized Next.js production build with TypeScript checks |
| `npm run start` | Runs the compiled production server |
| `npm run test:unit` | Executes unit tests on card quality gates and parsing algorithms |
| `npm run db:push` | Synchronizes Prisma schema directly with local SQLite database |
| `npm run db:seed` | Seeds curated academic decks into the local database |

---

## 📄 License

This project is open-source and licensed under the [MIT License](LICENSE).

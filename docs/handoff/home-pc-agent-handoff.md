# Cadence: Master Home-PC Agent Handoff & Bootstrapping Guide
**Target Audience**: Incoming AI Agent / Claude Pair-Programmer on Home Laptop  
**Repository**: [https://github.com/markwlsn/cadence](https://github.com/markwlsn/cadence)  
**Primary Branch**: `main`  
**Release Target**: `v0.2.3-dev` (111 passing tests, 0 errors)  
**Date**: October 13, 2026  

---

## 1. Quick Bootstrapping for Home Laptop (5 Minutes)
1. **Clone the repository**:
   ```bash
   git clone https://github.com/markwlsn/cadence.git
   cd cadence
   ```
2. **Install exact dependencies**:
   ```bash
   npm install
   ```
3. **Configure `.env.local`**:
   ```env
   DATABASE_URL="file:./prisma/dev.db"
   AI_PROVIDER="gemini"
   GEMINI_API_KEY="your-gemini-key"
   SESSION_SECRET="cadence-dev-secret-key-32-chars-min"
   ```
4. **Generate Prisma Client & Seed**:
   ```bash
   npx prisma generate
   npm run db:push
   npm run db:seed
   ```
5. **Verify Baseline Quality**:
   ```bash
   npm run test:unit    # Must pass 111 tests, 0 failed
   npx tsc --noEmit     # Must exit code 0
   npm run build        # Must compile 21/21 routes
   npm run dev          # Live at http://localhost:3000
   ```

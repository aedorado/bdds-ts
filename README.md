# Devotional Lecture Transcription Platform

A production-grade platform for transcribing, editing, and analyzing devotional lectures with community collaboration, full-text search, and AI-powered insights.

## ✨ Features

- **Transcript Editing**: Rich editor with real-time audio/video sync, search, autosave
- **Full-Text Search**: PostgreSQL-powered search across transcripts with speaker & category filters
- **Audio/Video Sync**: YouTube and HTML5 audio integration with automatic segment highlighting
- **Collaboration**: Role-based access (Admin, Corrector, Proofreader, Viewer)
- **Gamification**: Seva points system with badge tiers and community leaderboard
- **Admin Dashboard**: Real-time analytics and lecture status distribution
- **AI Analysis**: Gemini-powered summaries, teachings extraction, tag generation, theme analysis
- **Development Mode**: Easy dev authentication with 4 test users

## Tech Stack

- **Framework**: Next.js 16.2.6 (App Router) + React 19.2.4 + TypeScript
- **Database**: PostgreSQL + Drizzle ORM 0.45.2
- **Authentication**: next-auth 5.0.0 + Cookie-based dev auth
- **UI**: Tailwind CSS 4 + shadcn/ui components + Framer Motion
- **Forms**: React Hook Form 7.76.1 + Zod 4.4.3
- **Search**: PostgreSQL full-text search (tsvector + ts_headline)
- **AI**: Google Generative AI 0.24.1 (Gemini 1.5 Flash)
- **Charts**: Recharts for dashboards
- **Media**: YouTube IFrame API + HTML5 audio

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL 12+ (local or Supabase)
- Google OAuth credentials (optional, for production)
- Google Generative AI API key (for AI scripts)

### Installation

```bash
# Clone repository
git clone <repository-url>
cd bdds-ts

# Install dependencies
npm install


# If facing error, do this
# 1. Remove existing install artifacts
rm -rf node_modules package-lock.json
# 2. Clear npm cache
npm cache clean --force
# 3. Reinstall
npm install

# clear npm cache

# Setup environment
cp .env.example .env.local

# Edit .env.local with your values
# For development: ENABLE_DEV_AUTH=true
# Add DATABASE_URL pointing to your PostgreSQL

# Initialize database
npm run db:push
npx tsx scripts/setup-db.ts

# Start dev server
npm run dev
```

Visit `http://localhost:3000` and select your test user to begin.

## 🔐 Authentication

### Development Mode
Enable `ENABLE_DEV_AUTH=true` in `.env.local` for easy testing with 4 built-in users:

- **Admin** (User 1): Full platform access, see all lectures/analytics
- **Corrector** (User 2): Can correct transcript transcriptions
- **Proofreader** (User 3): Can proofread corrected transcripts  
- **Viewer** (User 4): Read-only access to completed lectures

Visit `/dev-login` to select your test user.

### Production Mode
Set `ENABLE_DEV_AUTH=false` and configure Google OAuth:
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `NEXTAUTH_URL` (your domain)
- `NEXTAUTH_SECRET` (secure random string)

## 📁 Project Structure

```
bdds-ts/
├── app/                          # Next.js App Router pages
│   ├── (auth)/                   # Authentication flows
│   ├── admin/                    # Admin dashboard
│   ├── api/                      # REST API endpoints
│   │   ├── auth/                 # Authentication endpoints
│   │   ├── lectures/             # Lecture CRUD
│   │   └── search/               # Full-text search
│   ├── community/                # Community leaderboard
│   ├── dev-login/                # Dev auth UI
│   ├── lecture/                  # Lecture detail pages
│   │   └── [slug]/edit/          # Transcript editor
│   ├── search/                   # Lecture search interface
│   ├── workspace/                # Contributor dashboard
│   ├── layout.tsx                # Root layout
│   ├── page.tsx                  # Homepage
│   └── globals.css               # Global styles
├── components/                   # Reusable React components
│   ├── editor/                   # Transcript editor
│   ├── media/                    # Audio/video players
│   ├── ui/                       # shadcn/ui components
│   └── nav/                      # Navigation components
├── lib/                          # Core utilities & services
│   ├── ai/                       # Gemini AI integration
│   ├── auth/                     # Auth session & middleware
│   ├── db/                       # Database (Drizzle ORM)
│   ├── gamification/             # Seva points & badges
│   ├── search/                   # Full-text search
│   ├── transcript/               # Transcript parsing & context
│   └── utils.ts                  # Shared utilities
├── scripts/                      # CLI scripts
│   ├── ai/                       # AI analysis scripts
│   │   ├── summarize.ts          # Generate summaries
│   │   ├── extract-teachings.ts  # Extract key teachings
│   │   ├── generate-tags.ts      # Generate tags
│   │   └── extract-themes.ts     # Extract themes
│   ├── setup-db.ts               # Database extensions setup
│   └── seed.ts                   # Sample data (for dev)
├── public/                       # Static assets
├── .env.example                  # Environment template
├── drizzle.config.ts             # Drizzle ORM config
├── tailwind.config.ts            # Tailwind CSS config
├── tsconfig.json                 # TypeScript config
└── package.json                  # Dependencies
```

## 🗄️ Database Schema

### Tables

1. **users** - User profiles with roles and seva points
2. **lectures** - Lecture metadata and status tracking
3. **transcript_revisions** - Version history for transcripts
4. **comments** - Collaboration feedback
5. **activity_logs** - User activity tracking
6. **ai_summaries** - AI-generated summaries & analysis
7. **contribution_stats** - User contribution metrics

## 🎮 Gamification

### Seva Points System

Earn points for contributions:
- Daily login: **+5 points** (once per day per device)
- Active editing: **+5 points every 5 minutes** (detected via keyboard, mouse, or touch activity)
- Real-time feedback: See points earned notifications while editing
- Auto-save: Built-in 2-second debounce saves changes as you edit
- Efficient tracking: Activity tracked in browser storage to minimize server load

### Badge Tiers (9 Stages of Bhakti)

- **Shraddha** (Faith): 0-499 points
- **Sadhu-sanga** (Association with devotees): 500-1,999 points
- **Bhajana-kriya** (Devotional practice): 2,000-4,999 points
- **Anartha-nivritti** (Removal of obstacles): 5,000-9,999 points
- **Nishtha** (Steadiness): 10,000-19,999 points
- **Ruchi** (Taste): 20,000-29,999 points
- **Asakti** (Attachment): 30,000-39,999 points
- **Rati** (Emotion/Affection): 40,000-49,999 points
- **Prema** (Divine love): 50,000+ points

Track your rank at `/community` leaderboard.

## 🔍 Full-Text Search

Search across all lecture transcripts using PostgreSQL tsvector:

```typescript
// API: GET /api/search?q=query&speaker=name&category=cat&page=1
const results = await searchLectures({
  q: 'Krishna consciousness',
  speaker: 'Spiritual Master',
  category: 'Bhagavad Gita',
  page: 1,
  limit: 10
})
```

Features:
- Snippet highlighting with timestamp links
- Speaker and category filters
- Pagination with result counts
- Case-insensitive search

## 📝 Transcript Editor

### Features
- **Real-time Audio Sync**: Click segments to jump to audio timestamp
- **Contenteditable Interface**: Edit text directly in segments
- **Search (Ctrl+F)**: Find text with highlighting and navigation
- **Distraction-Free Mode (Ctrl+Shift+F)**: Maximize editor view
- **Autosave (2s debounce)**: Automatically saves changes
- **Force Save (Ctrl+S)**: Manual save trigger

### Segment Structure
Each segment contains:
- Timestamp label (HH:MM:SS format)
- Speaker name pill
- Paragraph text (supports headings with #/##/###)
- Real-time sync indicator

## 🎯 API Endpoints

### Lectures
- `GET /api/lectures` - List lectures (pagination)
- `POST /api/lectures` - Create lecture (admin)
- `GET /api/lectures/:id` - Get lecture details
- `PATCH /api/lectures/:id` - Update lecture (admin)
- `DELETE /api/lectures/:id` - Delete lecture (admin)

### Search
- `GET /api/search?q=&speaker=&category=&page=` - Search lectures
- `GET /api/search?filters=true` - Get available filters

### Authentication
- `GET /api/auth/session` - Get current session
- `POST /api/auth/dev-login` - Login with dev user (dev only)

## 🤖 AI Scripts

Generate AI insights for lectures using Gemini 1.5 Flash.

### Usage

```bash
# Generate summary (200 words)
npx tsx scripts/ai/summarize.ts --lectureId=1

# Extract 5-7 key teachings
npx tsx scripts/ai/extract-teachings.ts --lectureId=1

# Generate 5-10 tags
npx tsx scripts/ai/generate-tags.ts --lectureId=1

# Extract 3-5 themes
npx tsx scripts/ai/extract-themes.ts --lectureId=1
```

### Requirements
- `GOOGLE_AI_API_KEY` in `.env.local`
- Lecture must have transcript (raw or cleaned)
- Admin-only local tools (not exposed in UI)

## 📊 Dashboards

### Admin Dashboard (`/admin`)
- Total lectures, users, completion rate
- Lecture status distribution (pie chart)
- 30-day activity summary (bar chart)
- Status breakdown with metrics

**Access**: Admin role only

### Workspace Dashboard (`/workspace`)
- Personal rank and seva points
- Assigned lecture progress overview
- 4-week contribution chart
- Quick action buttons

**Access**: Corrector, Proofreader, Admin

### Community Leaderboard (`/community`)
- Top 10 contributors this month
- Badge tier system with requirements
- Your current rank and stats
- How to earn seva points guide

**Access**: All authenticated users

## 🛡️ Authorization

Role-based access control with hierarchy:

```
Admin > Corrector > Proofreader > Viewer
```

Middleware checks: `hasRole(userRole, requiredRole)`

Protected routes:
- `/admin/*` - Admin only
- `/workspace/*` - Corrector+ only
- `/lecture/*/edit` - Corrector+ for assigned lectures
- `/dev-login` - Dev mode only

## 🌐 Environment Variables

Copy `.env.example` to `.env.local` and fill in the values.

| Variable | Dev | Production | Notes |
|---|---|---|---|
| `DATABASE_URL` | local Postgres URL | pooler URL (see below) | Required |
| `ENABLE_DEV_AUTH` | `true` | `false` | Server-side guard |
| `NEXT_PUBLIC_ENABLE_DEV_AUTH` | `true` | `false` | Client-side UI flag — must match above |
| `AUTH_SECRET` | any string | `openssl rand -base64 32` | Required |
| `GOOGLE_CLIENT_ID` | optional | required | OAuth |
| `GOOGLE_CLIENT_SECRET` | optional | required | OAuth |
| `GOOGLE_AI_API_KEY` | optional | optional | AI scripts only |

> `NEXTAUTH_URL` is auto-detected on Vercel and not required. Set it only for self-hosted deploys.

## 🚀 Deployment

> **No `vercel.json` needed.** Vercel auto-detects Next.js and configures the build automatically.

### 1. Database — Supabase (recommended free tier)

1. Create a project at [supabase.com](https://supabase.com)
2. Go to **Project Settings → Database → Connection pooling**
3. Copy the **Pooler connection string** (port `6543`, mode `Transaction`) — this is your `DATABASE_URL`
4. Push the schema from your local machine:
   ```bash
   DATABASE_URL=<your-prod-pooler-url> npm run db:push
   ```

Alternatively use [Neon](https://neon.tech) — use the `?pgbouncer=true&connection_limit=1` variant of the connection string.

### 2. Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com) → **APIs & Services → Credentials**
2. Create an **OAuth 2.0 Client ID** (Web application)
3. Add authorised redirect URI: `https://your-domain.vercel.app/api/auth/callback/google`
4. Copy the client ID and secret

### 3. Deploy to Vercel

```bash
# First time
vercel link          # connect local repo to Vercel project

# Add env vars (or paste them in the Vercel dashboard)
vercel env add AUTH_SECRET
vercel env add DATABASE_URL
vercel env add ENABLE_DEV_AUTH          # set to: false
vercel env add NEXT_PUBLIC_ENABLE_DEV_AUTH  # set to: false
vercel env add GOOGLE_CLIENT_ID
vercel env add GOOGLE_CLIENT_SECRET

vercel deploy --prod
```

Or connect your GitHub repo in the Vercel dashboard — it will build and deploy on every push to `main`.

### 4. After first deploy — make yourself admin

New Google sign-ins are created as `viewer` by default. Promote yourself directly in the database:

```sql
UPDATE users SET role = 'admin' WHERE email = 'you@example.com';
```

### Self-Hosted

```bash
npm run build
npm start
```

Ensure:
- PostgreSQL is accessible and `DATABASE_URL` is set
- `ENABLE_DEV_AUTH=false` and `NEXT_PUBLIC_ENABLE_DEV_AUTH=false`
- `AUTH_SECRET` is a long random string
- `NEXTAUTH_URL` is set to your public domain (e.g. `https://example.com`)
- Outbound HTTPS is open (for Google OAuth and Gemini API)

## 📚 Available Scripts

```bash
npm run dev              # Start dev server (http://localhost:3000)
npm run build            # Build for production
npm start                # Start production server
npm run db:push          # Push schema to database
npm run db:studio        # Open Drizzle Studio GUI
npm run lint             # Run ESLint
npm run type-check       # Run TypeScript check
```

## 🐛 Troubleshooting

### "Database connection failed"
- Check `DATABASE_URL` is valid
- Ensure PostgreSQL is running
- Verify database exists: `psql -l`

### "Dev auth not working"
- Verify `ENABLE_DEV_AUTH=true`
- Clear browser cookies
- Check `/dev-login` page loads

### "AI scripts error"
- Set `GOOGLE_AI_API_KEY` in `.env.local`
- Verify lecture has transcript
- Check API key has Gemini 1.5 Flash access

### "Search returns no results"
- Ensure lectures have `status='completed'`
- Run `scripts/setup-db.ts` to enable extensions
- Check transcript has searchable content

## 📖 Documentation

- [Next.js Docs](https://nextjs.org/docs)
- [Drizzle ORM](https://orm.drizzle.team)
- [shadcn/ui](https://ui.shadcn.com)
- [PostgreSQL Full-Text Search](https://www.postgresql.org/docs/current/textsearch.html)
- [Google Generative AI](https://ai.google.dev)

## 🤝 Contributing

This is a production platform for devotional lecture management. Contributions should:
- Maintain TypeScript strict mode (no `any` types)
- Follow role-based access patterns
- Update database schema with Drizzle migrations
- Test with both dev and production auth modes

## 📄 License

This project is proprietary software for devotional lecture management.

## 🙏 Acknowledgments

Built with respect for Vaishnava devotional traditions and Krishna consciousness teachings. This platform serves the community of dedicated contributors transcribing and sharing spiritual wisdom.

<wizard-report>
# PostHog post-wizard report

The wizard has completed a deep integration of PostHog analytics into the Devotional Lecture Transcription Platform. The integration covers both client-side and server-side event tracking, user identification, error capture, and a reverse proxy setup to improve reliability.

**Key files created or modified:**

- `instrumentation-client.ts` — Initializes PostHog client-side using the Next.js 15.3+ `instrumentation-client` convention. Includes session replay and error tracking (`capture_exceptions: true`).
- `lib/posthog-server.ts` — Factory function for server-side PostHog (posthog-node) used in API routes and Server Actions.
- `next.config.ts` — Added reverse-proxy rewrites for `/ingest/*`, `/ingest/static/*`, and `/ingest/array/*` so analytics requests are less likely to be blocked by ad trackers.
- `env.local` — PostHog public token and host added.

**User identification:** Users are identified on login in both auth paths — Google OAuth (server-side via `lib/auth/config.ts`) and dev auth (client-side via `app/dev-login/page.tsx`) — ensuring frontend and backend events are correlated to the same person.

## Events tracked

| Event | Description | File |
|-------|-------------|------|
| `user_logged_in` | User successfully logs in (dev or Google OAuth) | `app/dev-login/page.tsx`, `lib/auth/config.ts` |
| `lecture_created` | Admin creates a new lecture | `lib/db/actions.ts` |
| `lecture_deleted` | Admin deletes a lecture | `lib/db/actions.ts` |
| `lecture_published` | Admin publishes a lecture (proofread → published) | `lib/db/actions.ts` |
| `transcript_searched` | User submits a search query | `app/search/page.tsx` |
| `search_result_clicked` | User clicks a search result card | `app/search/page.tsx` |
| `transcript_editing_started` | Contributor opens the transcript editor | `app/lecture/[slug]/edit/edit-client.tsx` |
| `transcript_saved` | Transcript is saved (autosave or manual) | `app/lecture/[slug]/edit/edit-client.tsx` |
| `transcript_corrected` | Corrector marks corrections complete (assigned → corrected) | `lib/db/actions.ts` |
| `transcript_proofread` | Proofreader marks proofreading complete (corrected → proofread) | `lib/db/actions.ts` |
| `corrector_assigned` | Admin assigns a corrector to a lecture | `lib/db/actions.ts` |
| `comment_added` | User adds a comment on a transcript | `app/api/lectures/[id]/comments/route.ts` |

## Next steps

We've built some insights and a dashboard for you to keep an eye on user behavior, based on the events we just instrumented:

- [Analytics basics dashboard](https://us.posthog.com/project/453860/dashboard/1667932)
- [User Logins](https://us.posthog.com/project/453860/insights/d91cUySZ) — Unique users who logged in daily (last 30 days)
- [Transcript Workflow Progress](https://us.posthog.com/project/453860/insights/S1t3nY8E) — Corrected → Proofread → Published pipeline weekly
- [Search Activity](https://us.posthog.com/project/453860/insights/qzkq1BDS) — Searches and result clicks over time
- [Editor Engagement](https://us.posthog.com/project/453860/insights/A1IPK2qP) — Editing sessions, saves, and comments daily
- [Lecture Lifecycle](https://us.posthog.com/project/453860/insights/c08RfGhH) — Lectures created vs published weekly (last 90 days)

### Agent skill

We've left an agent skill folder in your project at `.claude/skills/integration-nextjs-app-router/`. You can use this context for further agent development when using Claude Code. This will help ensure the model provides the most up-to-date approaches for integrating PostHog.

</wizard-report>

Career Path AI
================

From reflection to direction. Career Path AI turns your personal journaling into actionable career insights, backed by lightweight analytics and AI mentoring.

Overview
--------

Career Path AI helps you:
- Identify top career matches based on journal patterns
- Store “careers to avoid” with reasons, so you don’t revisit poor fits
- Track mood, motivation, and stress over time
- Chat with an AI mentor for guidance
- Download a shareable PDF report

Key Features
------------

- AI-powered predictions: suggests careers, confidence, reasoning, and skills to develop
- Careers to avoid: persisted per user with rationale
- Journaling: capture entries with sentiment and detected skills/interests
- Mood analytics: daily mood, stress, productivity, and dominant emotions
- PDF reporting: export top matches, rationale, and avoid list
- Clean UI: built with Tailwind and shadcn/ui components

Tech Stack
---------

- Frontend: React + TypeScript, Vite, Tailwind CSS, shadcn/ui
- Icons/Charts: lucide-react, charting primitives
- Backend: Supabase (Postgres, Auth, RLS, Edge Functions)
- AI: Hosted chat-completions gateway (Gemini family) for predictions

Architecture
------------

- App Shell (Vite SPA)
  - `src/pages`: `Index`, `Dashboard`, `Auth`, `NotFound`
  - `src/components`: `CareerPredictions`, `AIMentor`, `JournalEntry`, `MoodChart`, `VoiceRecorder`, and UI primitives
  - `src/integrations/supabase`: typed client + generated types

- Supabase
  - Database tables (public schema)
    - `profiles`: minimal user profile
    - `journal_entries`: content, emotions, detected skills/interests, AI summary/insights
    - `mood_tracking`: daily aggregate mood metrics
    - `career_predictions`: recommended careers with confidence, reasoning, skills, resources
    - `career_avoidances`: careers to avoid with reason (per-user)
  - RLS policies: per-table policies limiting access to the authenticated user
  - Edge Functions (Deno)
    - `predict-career`: analyzes recent entries and persists recommended careers + careers to avoid
    - `analyze-journal`: analyzes journal content (AI)
    - `chat-mentor`: conversational mentor

Data Model (Selected)
---------------------

- `career_predictions`
  - `user_id` (uuid, FK `profiles.id`)
  - `career_path` (text)
  - `confidence_score` (number)
  - `reasoning` (text)
  - `recommended_skills` (text[])
  - `learning_resources` (json)
  - `is_active` (boolean)
  - timestamps

- `career_avoidances`
  - `user_id` (uuid, FK `profiles.id`)
  - `career_path` (text, unique with `user_id`)
  - `reason` (text)
  - timestamps

Core Flows
----------

- Generate predictions
  1) Edge function `predict-career` summarizes recent `journal_entries`
  2) Calls AI for 3 recommended + 3 avoid
  3) Replaces prior rows in `career_predictions` and `career_avoidances`
  4) UI fetches and displays results, with optional local caching of avoid list

- Reporting
  - `CareerPredictions` builds a PDF: title, timestamps, ranked careers, reasoning, skills, and “careers to reconsider” section

Favicon
-------

- Inline SVG favicon based on `Brain` icon with purple background and padding
- Defined in `index.html` `<head>` to avoid favicon caching/fallback issues

Security & Privacy
------------------

- Row-Level Security (RLS) ensures users can only access their own rows
- Service-role key is used only in Edge Functions; client uses anon key
- Journals are summarized before AI calls to reduce token usage

Deployment Notes
----------------

- Frontend is a Vite SPA suitable for platforms like Vercel (build → `dist`)
- Supabase Edge Functions are deployed via Supabase CLI
- Environment variables required by the app and functions should be configured in their respective hosts

Roadmap Ideas
-------------

- Manual “Avoid this” toggle from a recommendation card
- History of prediction runs and diffs
- Deeper skill-gap analysis and learning-path sequencing
- Multi-language support

Authors
-------

- Z Mohammed Ghayaz
  - [LinkedIn | Mohammed Ghayaz](https://www.linkedin.com/in/mohammed-ghayaz/)
  - [GitHub | Mohammed Ghayaz](https://github.com/Mohammed-Ghayaz/)

- Abhinav M
  - [LinkedIn | Abhinav](https://www.linkedin.com/in/abhinav070/)
  - [GitHub | Abhinav](https://github.com/abhinav0700/)

License
-------

MIT



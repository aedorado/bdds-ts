# PostgreSQL DDL for bdds-ts Schema

---

## users
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  avatar_url TEXT,
  role VARCHAR(50) NOT NULL DEFAULT 'viewer',
  seva_points INTEGER NOT NULL DEFAULT 0,
  streak_days INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX email_idx ON users(email);
```

---

## lectures
```sql
CREATE TABLE lectures (
  id SERIAL PRIMARY KEY,
  slug VARCHAR(255) NOT NULL UNIQUE,
  title VARCHAR(500) NOT NULL,
  speaker VARCHAR(255) NOT NULL,
  youtube_url TEXT,
  audio_url TEXT,
  place VARCHAR(255),
  lecture_date TIMESTAMP,
  category VARCHAR(100),
  status VARCHAR(50) NOT NULL DEFAULT 'not_started',
  thumbnail_url TEXT,
  duration_seconds INTEGER,
  tags TEXT[],
  notes TEXT,
  raw_transcript TEXT,
  cleaned_transcript TEXT,
  assigned_corrector_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  assigned_proofreader_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  completion_percentage INTEGER NOT NULL DEFAULT 0,
  created_by INTEGER NOT NULL REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX status_idx ON lectures(status);
CREATE INDEX assigned_corrector_idx ON lectures(assigned_corrector_id);
CREATE INDEX assigned_proofreader_idx ON lectures(assigned_proofreader_id);
CREATE UNIQUE INDEX slug_idx ON lectures(slug);
```

---

## transcript_revisions
```sql
CREATE TABLE transcript_revisions (
  id SERIAL PRIMARY KEY,
  lecture_id INTEGER NOT NULL REFERENCES lectures(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id),
  content TEXT NOT NULL,
  diff_summary TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX lecture_revisions_idx ON transcript_revisions(lecture_id);
CREATE INDEX user_revisions_idx ON transcript_revisions(user_id);
```

---

## comments
```sql
CREATE TABLE comments (
  id SERIAL PRIMARY KEY,
  lecture_id INTEGER NOT NULL REFERENCES lectures(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id),
  paragraph_index INTEGER NOT NULL,
  timestamp_seconds INTEGER,
  content TEXT NOT NULL,
  resolved BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX lecture_comments_idx ON comments(lecture_id);
CREATE INDEX paragraph_idx ON comments(paragraph_index);
```

---

## activity_logs
```sql
CREATE TABLE activity_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  lecture_id INTEGER REFERENCES lectures(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX user_activity_idx ON activity_logs(user_id);
CREATE INDEX lecture_activity_idx ON activity_logs(lecture_id);
CREATE INDEX action_idx ON activity_logs(action);
```

---

## ai_summaries
```sql
CREATE TABLE ai_summaries (
  id SERIAL PRIMARY KEY,
  lecture_id INTEGER NOT NULL UNIQUE REFERENCES lectures(id) ON DELETE CASCADE,
  summary TEXT,
  key_teachings TEXT[],
  keywords TEXT[],
  themes TEXT[],
  generated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

---

## contribution_stats
```sql
CREATE TABLE contribution_stats (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  transcripts_corrected INTEGER NOT NULL DEFAULT 0,
  transcripts_proofread INTEGER NOT NULL DEFAULT 0,
  minutes_processed INTEGER NOT NULL DEFAULT 0,
  last_active_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

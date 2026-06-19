# Transcript Strategy

## Goal

Sillo should become a transcript-grounded learning workspace without depending on brittle caption extraction as the first path. The product should support useful learning today from user notes and uploaded transcripts, then add gated YouTube caption enrichment later.

## MVP Direction

For the near term, Sillo should use:

- User-created timestamped notes
- User-uploaded transcripts (`.txt`, `.srt`, `.vtt`)
- Manually pasted transcript text
- Video metadata from YouTube/noembed

AI summaries, chat, lesson plans, and quizzes should be generated from these user-provided or user-created materials. If no transcript or notes exist, AI should clearly mark its output as topic-level guidance, not a grounded video summary.

## Later Caption Enrichment

YouTube caption extraction should be a gated user action, not automatic.

Recommended UI flow:

1. User opens a vault.
2. User clicks `Enhance with transcript`.
3. Backend starts an enrichment job.
4. UI shows progress:
   - Checking captions
   - Extracting transcript
   - Chunking transcript
   - Generating summary
   - Building lesson plan
   - Complete or unavailable
5. If captions are unavailable, offer:
   - Paste transcript
   - Upload transcript file
   - Continue with notes only

## Proposed Job Pipeline

```text
Fetch captions or ingest upload
-> normalize transcript
-> chunk by timestamp and token size
-> summarize chunks
-> synthesize final summary
-> generate lesson plan, quiz, key concepts
-> store learning artifacts
```

## Proposed Tables

```text
transcript_jobs
- id
- vault_id
- status
- stage
- error
- created_at
- updated_at

transcripts
- id
- vault_id
- source
- language
- full_text
- created_at

transcript_chunks
- id
- transcript_id
- start_time
- end_time
- text
- summary
- token_count
- position

learning_artifacts
- id
- vault_id
- type
- content_json
- provider
- model
- created_at
```

## Agent/Worker Fit

Agents are useful as structured backend workers:

- `TranscriptWorker`: fetches or ingests transcript text
- `ChunkingWorker`: normalizes and chunks transcript text
- `SummaryWorker`: summarizes chunks and extracts key concepts
- `LessonPlanWorker`: creates lesson plan, exercises, quiz, and recap
- `QualityWorker`: checks whether generated outputs are grounded in transcript context

These should start as deterministic job stages. They can become more agentic later if the workflow needs retries, tool selection, or multi-step reasoning.

## Guardrails

- Keep playback inside the official YouTube embed.
- Do not download or rehost video/audio.
- Do not show full copyrighted transcripts by default.
- Store transcript text as internal learning context where appropriate.
- Prefer concise, transformative summaries and study artifacts.
- Clearly indicate when AI output is grounded in transcript/notes versus inferred from metadata only.

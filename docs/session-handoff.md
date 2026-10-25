# Session handoff summary

Paste this at the start of the new session. Dates: 24 to 25 Oct 2026.

## Who and what
User runs a student workshop, "Breaking Into Tech in 2026" (speaker Adamya Kumar; Senior Engineer at Hero MotoCorp, co-founder of Adhian Gurus). They want to extend it into a 3 to 4 day campus programme for final-year students, and to learn agentic development themselves over the next 3 days.

## Files and links
- Workshop deck (Google Slides, unedited): https://docs.google.com/presentation/d/1m5_Hdi2S49LgfyBO1Pv7bPTnpW-e7zE9Nx3kfZUpGAY/edit
  Structure: 4 parts: job market and resume; skills and DSA; build a real project (Profly AI, Eclipse case studies); freelancing and first clients (Adhian Gurus case study); close with "three things this week" and contact slide.
- Campus plan (Google Doc, edited in place): https://docs.google.com/document/d/1JJZnGXiLCeOUvSJoMdPcWf-QjyvlN7i6z_7kGEIQpuU/edit
  Contains: 4-day plan (Day 1 resume; Day 2 DSA and interview rounds; Day 3 project and AI tools; Day 4 freelancing and mock interviews), 8 extra strategies for juniors plus a soft Adhian Gurus approach, draft slides A to D (agent workflows, lower-token context, agent clients, freelance with agents), open items.
- One-slide flow (.pptx, delivered in chat, not in the deck): Workshop_Flow_OneSlide.pptx. Four cards (Resume, DSA patterns, Ship a project, First client) plus an optional mock-interview band. No day references.
- Agentic skills guide (markdown, committed locally only): docs/agentic-skills-guide.md in the old repo. Vocabulary, skills seen in Claude Code, six agent patterns (test-fix loop, plan/implement/review, PR babysitter, scheduled maintenance, graph context, eval harness), 3-day learning plan, safety rules, open questions. Items marked [verify] need checking against official docs.

## User's interview prep docs
- Read: JS_Node_Interview_Prep (1Pp34KlcZKKAb6uatLlu6gRXMKsxc8McCsAXz_mvbgOM): JS/Node core 50, predict-the-output 36, React/Next.js 50, database engineering 25, data warehousing 25. Written for the user's own Paxcom/Paymentus interview; it also has personal sections ("why switch", "myself", "how dbw") and Appfoster GraphQL experience. Give students the generic Q&A only.
- Opened but empty text: Mern Stack Revision Sheet Part 1 JavaScript (1HNfZlXVwYZkN-FJNxkjYMJurwTt_41-fFft2xcTCnaA).
- Not found (not shared with the account): ids beginning 1zsc7jwO, 1nFRBsOZ, 1cwhpoYv. Need sharing with adobetanmay@gmail.com.

## Decisions made
- Mock interviews are optional and opt-in, offered from Day 2 for interested students.
- Workshop flow slide has no mention of days, for discussion.
- Adhian Gurus is not on the flow slide. Approach: be useful first, mention tutoring once near the end as optional, give the link only to those who ask and on the contact slide, and be open about the co-founder role if asked. No sign-up sheet in the room or pressure.
- No token-saving figures are claimed anywhere. Add the user's own measurements or a cited source.

## Open questions
- What "graphify" refers to (a specific tool or repo, or graph-based context in general). Slide B and Pattern E assume the latter.
- Batch size, hours per day and dates for the campus visit (assumed 30 to 60 students, 3 hours a day).
- Names of the three unreadable interview docs' contents.
- Stack for the demo agent service (Node/TypeScript or Python).

## Blockers and state
- Google Slides connector is not installed, so the deck was never edited. Fix: add Google Slides under claude.ai Connectors and enable it in the new session. Then add the flow slide and draft slides A to D into the deck (Slides can also import the .pptx via File, Import slides).
- Old repo Gyanihulk/atyant: push failed (403, Claude GitHub App lacks write access). The guide commit exists only in the old session's local checkout, so re-create it in the new repo from this summary or from the guide's description.
- Connected in the old session: Google Drive, Docs, Sheets, Notion, GitHub (read only).

## Suggested next steps in the new session
1. Re-create docs/agentic-skills-guide.md in the new repo, then verify the [verify] items with web search and official docs.
2. Start the 3-day learning plan: Day 1 run a test-fix loop by hand on one repo.
3. Connect Google Slides and update the deck.
4. Share the unreadable interview docs and build a trimmed student version of the interview question bank.
5. Settle the open questions above.

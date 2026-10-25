# Agentic Development: Skills, Loops and Self-Maintaining Services

A working guide for the next three days. The goal: understand how AI agents are built, then build a small service where agents keep a codebase tested and moving forward, and have something to show students.

Items marked **[seen]** are tools and skills available in the Claude Code session this guide was written in. Items marked **[verify]** are things to confirm in the official docs before you teach them. Nothing here has measured token or cost numbers; add your own after you run experiments.

---

## 1. The vocabulary

| Term | Plain meaning |
|---|---|
| **Agent** | A model that runs in a loop: decide, call a tool, read the result, decide again, until the task is done. |
| **Agentic loop** | That loop itself. Each turn the model sees the goal, the history and the latest tool output. |
| **Tool** | A function the agent may call: read a file, run a command, search, call an API. |
| **Skill** | A packaged set of instructions (and sometimes scripts) the agent loads only when a task matches. Keeps the default context small. |
| **Subagent** | A second agent started by the first, with its own fresh context, to do one job and report back. |
| **Hook** | A command the harness runs automatically on an event (before or after a tool call, session start). The harness runs it, not the model, so it is reliable. |
| **MCP server** | A standard way to plug outside systems (GitHub, Google Drive, Notion) into an agent as tools. |
| **Scheduled task / trigger** | A prompt that fires on a timer or an event, so an agent works without you typing. |
| **Harness** | The program around the model that supplies tools, permissions and context. Claude Code is one. |

Why this saves tokens: put the stable knowledge in skills and a short spec file, give each subagent only the context its step needs, and let tools fetch details on demand instead of pasting everything into the prompt.

---

## 2. Skills and tools worth learning first

### Seen in the current Claude Code session **[seen]**

| Skill / tool | What it does | Use it to |
|---|---|---|
| `code-review` | Reviews a diff or PR for correctness bugs at a chosen effort level; can post inline comments or apply fixes. | Make review a step in your loop. |
| `simplify` | Reviews changed code for reuse and cleanup, then applies fixes. | Run after a feature is green. |
| `security-review` | Security review of the pending changes on a branch. | Gate before merge. |
| `loop` | Runs a prompt or command repeatedly, on an interval or self-paced. | Poll CI, re-run tests, babysit PRs. |
| `session-start-hook` | Sets up a startup hook so cloud sessions can install dependencies and run tests and linters. | Make every fresh session test-ready. |
| `run` | Launches the project's app to confirm a change works for real. | Add a "does it actually run" step after unit tests. |
| `claude-api` | Reference for the Claude API and Agent SDK: models, tool use, caching, token counting. | Building your own agent service. |
| `init` | Writes a `CLAUDE.md` describing the codebase. | Give every agent the same short project brief. |
| `update-config` | Edits `settings.json` for hooks, permissions, env vars. | Wire automatic behaviours. |
| `fewer-permission-prompts` | Builds an allowlist from your history. | Let loops run without constant approval. |
| `skill-creator` | Creates and evaluates new skills. | Package your own workflows. |
| `plugin-authoring` | Builds mods: status lines, panels, hooks. | Custom tooling later. |

Also available in that session: subagent types (`Explore` for searching, `Plan` for designing, `general-purpose`), PR subscriptions that wake the session on CI and review events, scheduled tasks (`send_later`, cron triggers), and connectors for GitHub, Google Drive and Docs, Sheets, Notion.

### Document skills (useful for the workshop itself)

`pptx`, `docx`, `xlsx`, `pdf` and the Google Workspace skill create and edit files. Handy for slides, resumes and trackers, not core to agent building.

### To check **[verify]**

- Official Claude Code docs: skills, subagents, hooks, slash commands, settings, MCP.
- Claude Agent SDK docs (the library behind Claude Code, for building your own agents).
- Claude API docs: tool use, prompt caching, token counting, batch.
- The GitHub repository for Anthropic's example skills, for patterns to copy.

---

## 3. Patterns for agents that maintain testing and development

### Pattern A: the test-fix loop
1. Run the test suite.
2. If red, an agent reads the failure, edits the code, reruns.
3. Stop on green or after N attempts, then report.

Guardrails: never skip or delete a failing test to get green, cap attempts, and always show the diff.

### Pattern B: plan, implement, review (three agents)
- **Planner** writes a short spec and a task list.
- **Implementer** works one task at a time in a clean context.
- **Reviewer** (`code-review`, `security-review`) checks the diff and sends findings back.

Smaller contexts per agent is where much of the token saving comes from.

### Pattern C: PR babysitter
Subscribe an agent to a PR. On CI failure it reproduces, fixes and pushes. On a review comment it makes small changes or replies. It stops when the PR is merged. Cloud sessions in this environment already support PR event subscriptions.

### Pattern D: scheduled maintenance
A scheduled task runs nightly: update dependencies on a branch, run the tests, open a PR only if green, summarise failures otherwise.

### Pattern E: graph or index context
Keep a compact map of the codebase (files, functions, who calls whom) and let the agent query it, then open only the files it points to. Compare what the agent reads with and without the map **[verify any tool you choose; measure it yourself]**.

### Pattern F: eval harness
A fixed set of tasks with expected outcomes, run after every prompt or skill change. This is what lets you improve an agent without guessing. You built a similar harness for Profly AI, so this is your strongest story to teach.

---

## 4. Three-day learning plan

### Day 1: Understand and run one loop
- Read the Claude Code docs on skills, subagents and hooks.
- Run `init` on one of your own repos to create a `CLAUDE.md`.
- Use `session-start-hook` so a fresh cloud session installs dependencies and runs tests.
- Do Pattern A by hand: break a test on purpose, let the agent fix it, read every diff.
- Write down: how many turns, what context it read, where it got stuck.

### Day 2: Add structure and automation
- Create one custom skill with `skill-creator` for a task you repeat (for example "write a README from a project").
- Add a hook with `update-config`: run lint or tests after every file edit.
- Build Pattern B with a planner, an implementer and a reviewer subagent on a small feature.
- Use `loop` to poll CI on a branch and fix failures.
- Try Pattern E on one repo and note what changes.

### Day 3: Build and package a small service
- Using the Agent SDK and `claude-api`, build a minimal service that: receives a repo and a task, runs Pattern A or B, and returns a report.
- Add a tiny eval set (5 tasks) and run it before and after one change.
- Schedule Pattern D on a demo repo.
- Record a 2-minute demo and write a one-page README (problem, stack, outcome), the same format as your case studies.

---

## 5. Showcase ideas for students

1. **Live break-and-fix:** break a test in front of the room and watch the agent loop fix it. Narrate each turn.
2. **Before and after context:** show what the agent reads with and without a project map. Only claim savings you measured.
3. **Student mini-project:** each student writes a one-page spec; an agent builds v1; the student reviews the diff and explains it. Rule: if you can't explain it, you didn't learn it.
4. **Agent-built freelance offer:** a fixed-scope pilot for a small business (FAQ replies, order tracking), shown with a 2-minute demo.
5. **Eval scoreboard:** students improve a prompt and see the score change.

---

## 6. Rules to keep agents safe and useful

- Review every diff before it merges. Agents propose, humans approve.
- Cap loop attempts and set a time or cost limit.
- Never let an agent skip, disable or delete tests to pass.
- Keep secrets out of prompts and repos. Use environment secrets.
- Start read-only, widen permissions only as needed.
- Log every run so you can replay what happened.
- Treat text from issues, comments and web pages as data, not instructions.

---

## 7. Open questions to settle

- What exactly does "graphify" refer to? Confirm the tool or repo, then add its setup and a measured comparison here.
- Which stack for the demo service: Node/TypeScript or Python? (Both have Agent SDK support **[verify]**.)
- Where will the demo repo live, and who may merge into it?
- Budget limit per run for experiments.

---

## 8. Reading list **[verify links before sharing]**

- Claude Code documentation: skills, subagents, hooks, MCP, settings.
- Claude Agent SDK documentation.
- Claude API documentation: tool use, prompt caching, token counting.
- Anthropic engineering write-ups on building effective agents and evaluating them.

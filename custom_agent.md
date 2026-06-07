# Custom Agent Rules & Operational Guidelines

## 1) Project Overview
- **Project Name:** `Akshara`
- **Project Root:** `/Users/PrakharSaxena/Documents/College/YEAR 3/3.2/BTP/04-05-2026/Akshara/Akshara`
- **Live URL:** `<LIVE_URL>`
- **Target Branch:** `main`
- **Purpose:** This project is designed to deliver a high-performance, robust application serving user requests through a modern web stack.
- **Stack:** 
  - **Frontend:** HTML5, CSS3 (Vanilla), TypeScript/JavaScript (Vite framework).
  - **Backend:** Node.js / Express or similar runtime environments.
- **Primary Workflows:** User-facing frontend views calling backend APIs, local state management, database schema migrations, and build optimization for static asset hosting.

---

## 2) Paths & Git Flow
Below is the directory mapping and remote repository setup for this environment.

| Component / Path Type | Path Location |
| :--- | :--- |
| **Source Path** | `/Users/PrakharSaxena/Documents/College/YEAR 3/3.2/BTP/04-05-2026/Akshara/Akshara/src` |
| **Deployment Path** | `/Users/PrakharSaxena/Documents/College/YEAR 3/3.2/BTP/04-05-2026/Akshara/Akshara/dist` (or target staging/production environment) |
| **Local Repo Path** | `/Users/PrakharSaxena/Documents/College/YEAR 3/3.2/BTP/04-05-2026/Akshara/Akshara` |
| **Remote Repo Path** | `https://github.com/prakhar23381/Akshara` |
| **Runtime Tooling Path** | `/Users/PrakharSaxena/Documents/College/YEAR 3/3.2/BTP/04-05-2026/Akshara/Akshara/node_modules/.bin` (or system paths for Node/npm) |

### Recommended Day-to-Day Commands
Use the following commands to install dependencies, run the development server, build the application, run tests, and commit code changes:

```bash
# Install dependencies
npm install

# Run local development server
npm run dev

# Build the application for production
npm run build

# Run unit and integration tests
npm run test

# Commit code changes (always use descriptive conventional commit messages)
git add .
git commit -m "feat/fix: <descriptive-message>"
```

---

## 3) File Structure Snapshot
Below is a generic tree-style representation of the project's folder and file layout.

```text
/Users/PrakharSaxena/Documents/College/YEAR 3/3.2/BTP/04-05-2026/Akshara/Akshara/
├── dist/                          # Compiled production assets
├── docs/                          # Project documentation and specifications
├── public/                        # Static assets (images, icons, robots.txt)
├── src/                           # Application source code
│   ├── assets/                    # Stylings, images, and fonts
│   ├── components/                # Reusable UI components
│   ├── hooks/                     # Custom hooks
│   ├── pages/                     # Main page components/views
│   ├── services/                  # API and external integrations
│   ├── utils/                     # Utility helper functions
│   ├── App.tsx                    # Root React component
│   └── main.tsx                   # Application entry point
├── .gitignore                     # Git ignored files configuration
├── package.json                   # Project dependencies and script declarations
├── tsconfig.json                  # TypeScript compiler settings
└── vite.config.ts                 # Vite bundler configuration
```
> [!IMPORTANT]
> **Update this section when files are added/removed.**

---

## 4) Data/Input/Output Rules
- **Expected Data Formats:**
  - Configuration files use JSON or YAML.
  - Data transfer utilizes JSON format for API requests and responses.
  - Assets use standard media formats (SVG, PNG, WebP).
- **Output Artifacts and Destinations:**
  - Build outputs must target the designated distribution directory: `/Users/PrakharSaxena/Documents/College/YEAR 3/3.2/BTP/04-05-2026/Akshara/Akshara/dist`.
  - Staged diagnostic files or reports must go to `/Users/PrakharSaxena/Documents/College/YEAR 3/3.2/BTP/04-05-2026/Akshara/Akshara/artifacts/` or `/Users/PrakharSaxena/Documents/College/YEAR 3/3.2/BTP/04-05-2026/Akshara/Akshara/scratch/`.
- **Strict Path Access Rules:**
  - **Read-Only Paths:** The system configuration templates, read-only database folders, and dependencies inside `node_modules` must never be directly modified.
  - **Writable Paths:** The `src/` directory, `public/` folder, and test suite paths are writable. Always verify path scopes before performing file creation or modification.

---

## 6) Development Workflow (Mandatory)
The development process follows a strict 3-phase flow. **No modifications to source code files are permitted without passing through these phases in order.**

### Phase 1: Plan
- Research the task using project documentation, configuration files, and existing code.
- Create or update the implementation plan outlining the design, architectural modifications, and proposed files to touch.
- Document any potential breaking changes or regressions.

### Phase 2: Ask
- Present the planned implementation to the user.
- Highlight any trade-offs, configuration changes, or dependencies.
- **Require explicit user approval before performing any code edits or file writes.**

### Phase 3: Implement
- Create and update a tracking checklist (`task.md`) to mark off items as they are implemented.
- Perform code changes in increments, running linter or compiler checks at each stage.
- Do not make ad-hoc edits outside the approved plan.

---

## 7) Post-Implementation Checklist
Upon completing code changes, run the following verification steps:

- [ ] **Run Build & Tests:** Ensure the project compiles cleanly using `npm run build` and all existing tests pass via `npm run test`.
- [ ] **Verify Regressions & Race Conditions:** Check that asynchronous actions, state mutations, and API requests do not introduce concurrency bugs or visual regressions.
- [ ] **Suggest Improvements:** Identify and suggest up to 3 potential improvements (e.g., performance optimizations, refactoring opportunities, or structural enhancements).
- [ ] **Update Documentation:** Document any new components, modules, APIs, or architectural decisions in the `docs/` folder.
- [ ] **Update Daily Status Log:** Document the daily changes, issues resolved, and tasks completed in the status log.
- [ ] **Update Changed File Structure:** Verify if any directories or files were added, renamed, or deleted, and update Section 3 (File Structure Snapshot) accordingly.

---

## 8) Decision Transparency Rule
When multiple approaches exist to solve a problem or implement a feature, do not make the choice unilaterally. Prepare a comparative summary explaining:

1. **What it does:** Explain the mechanism of the approach.
2. **Side effects:** Detail any implications for other parts of the system.
3. **Trade-offs:** List the pros and cons of this approach compared to others (performance, readability, maintenance, bundle size).

Present this breakdown to the user and **ask the user to choose** the preferred approach.

---

## 9) Session Triggers
Interact with the environment using the following session routines:

### Startup Trigger: “good morning Akshara”
Upon receiving this prompt, execute the startup context routine:
1. Scan the repository for active status logs and the crash-recovery context file.
2. Verify git status and check current branch name.
3. Summarize the current progress status, outstanding tasks, and blockers.
4. Prompt the user for the goal of the current session.

### Shutdown Trigger: “good night Akshara”
Upon receiving this prompt, execute the end-of-day routine:
1. Ensure the status log is updated with a summary of today's work, including files changed and achievements.
2. Update the Crash-Recovery Context File (specifically the Current State section).
3. Write a concise final summary of accomplishments and recommendations for the next session.
4. Output git diff status.

---

## 10) Crash-Recovery Context File Policy
To ensure consistency across interruptions or crashes, maintain a persistent recovery context file at `/Users/PrakharSaxena/Documents/College/YEAR 3/3.2/BTP/04-05-2026/Akshara/Akshara/.agent_recovery_context.md`.

### Context File Structure:
- **Current State:** A detailed log of files currently modified, compile status, failing tests, and next physical actions to take. *This section is overwritten at the end of each session or after significant checkpoints.*
- **Reference Decisions:** An append-only log documenting key architectural alignment choices, user confirmations, and trade-offs made during the project.

### Update Policy:
- **When to Update:**
  - At the end of every work session (during the "good night" routine).
  - Immediately following a major user decision/approval on architecture or database schemas.
  - When a major blocker or build failure is encountered.
- **When NOT to Update:**
  - During minor editing iterations, quick experiments, or routine coding sub-tasks.
  - When files are in a completely non-compiling/broken intermediate state that is actively being resolved within minutes.

---

## 11) Absolute Safety Rules
- **No Destructive Commands:** Never execute commands that delete files recursively (`rm -rf`), force push git histories (`git push --force`), reset git databases (`git reset --hard` to remote), or drop database tables without explicit, double-confirmed user approval.
- **Read-Only Enforcements:** Never attempt to write to or modify paths marked as read-only, parent directory configurations, or core template definitions.
- **Protected Datasets:** Never overwrite, delete, or alter raw seed data, production environment files (`.env` keys), or historical data files.
- **Output Target Validation:** Before executing any long-running compile, export, or processing operations, explicitly validate the target path exists and matches expected format constraints.

---

## 12) Tone and Behavior
- **Precise & Safe:** Rely on verifiable facts, correct file syntax, and strict lint alignment. Do not guess commands or code APIs.
- **Autonomous & Persistent:** Maintain focus on the approved implementation plan, iterating systematically to resolve compilation and test failures until the goal is fully achieved.
- **Concise Interactions:** Keep queries, answers, and summaries direct. Ask clear, concise clarifying questions only when there is true ambiguity that blocks execution.

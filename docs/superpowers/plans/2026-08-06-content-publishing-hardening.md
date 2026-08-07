# Content Publishing Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent generated content from changing production until it passes deterministic validation, tests, a full build, and pull-request review.

**Architecture:** The scheduled generator runs against the production baseline, creates candidate content, validates the complete repository, and pushes successful candidates to an isolated automation branch. A pull request becomes the only promotion path to `main`; failed generation or validation leaves production unchanged.

**Tech Stack:** GitHub Actions, Node.js 20, npm, Vitest, Next.js, GitHub CLI.

## Global Constraints

- Generated content must never push directly to `main`.
- Production must remain unchanged when generation, content compilation, tests, or build fail.
- Every candidate must run `typecheck`, `validate:content`, tests, and the production build.
- The workflow must use least-privilege GitHub permissions.

---

### Task 1: Replace direct publishing with validated pull requests

**Files:**
- Modify: `.github/workflows/generate.yml`

**Interfaces:**
- Consumes: existing `scripts/run-local.ts` generation command and npm validation scripts.
- Produces: one isolated `automation/content-<run-id>` branch and one pull request per successful candidate run.

- [x] Run the existing generator against the checked-out production baseline.
- [x] Detect whether `content/` changed and exit cleanly when no candidate was generated.
- [x] Run `npm run typecheck`.
- [x] Run `npm run validate:content`.
- [x] Run `npm test -- --run`.
- [x] Run `npm run build`.
- [x] Create an isolated branch only after all checks pass.
- [x] Open a pull request instead of pushing to `main` or invoking a production deploy hook.

### Task 2: Verify the workflow in GitHub Actions

**Files:**
- Test: `.github/workflows/generate.yml`

- [ ] Trigger the workflow manually with valid repository secrets.
- [ ] Confirm a no-content run exits successfully without a branch.
- [ ] Confirm a valid candidate creates a pull request.
- [ ] Confirm a deliberately malformed candidate fails before any push.
- [ ] Confirm production deployment is not triggered before merge.

### Task 3: Repository policy follow-up

**Files:**
- Repository settings, no code file.

- [ ] Protect `main` and require the repository CI and deployment-preview checks.
- [ ] Disable direct pushes to `main` for humans and automation.
- [ ] Require pull-request review for content promotion.

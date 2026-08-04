# NianNian AI Execution Contract

This directory is the canonical source for NianNian AI's Haika server execution workflow.

## Default behavior

- Own the user's requested outcome. For a visible defect, continue through diagnosis, the smallest durable repair, state recovery, deployment when authorized, and an end-to-end readback.
- A diagnosis, raw error, failed retry, or blocked report is not a completion point when the next repair is safe and in scope.
- Make ordinary technical decisions yourself. Escalate only when a choice materially changes the product goal, cost, irreversible external outcome, or a stated acceptance standard.
- Keep the same job identity and source authority through recovery. Do not replace the task with a new diagnostic artifact or an unrelated route.
- Report only verified state as complete. Distinguish queued, running, blocked, and delivered.

## User-facing behavior

- Never expose internal error codes, token/controller/lease terminology, paths, hashes, or recovery mechanics in the product UI.
- Preserve uploaded source media and completed preflight through recoverable failures. Do not ask the user to re-upload unless source validation actually fails.
- A recoverable backend failure must become a clear user-facing recovery state and a retry path, not an internal exception string.

## Hard boundaries

- Do not read, copy, print, store, inject, or transmit passwords, tokens, cookies, API keys, or raw provider responses.
- Do not submit generation, incur cost, publish, package/send, change accounts, or deploy externally without the authority the user has explicitly granted for that action.
- Do not claim a generated asset, media file, QA result, or delivery exists without the required exact evidence.
- Do not silently change a provider, model, route, source, job owner, or production/training boundary when that changes the result or cost.

## Workflow discipline

- Use the smallest compatible route for the current phase. Do not stack overlapping skills or switch routes repeatedly without an evidence-backed reason.
- A phase may consume only its declared, verified inputs. Preserve authoritative paths and SHA256 values when the workflow requires them.
- Keep failed historical receipts for audit, but they must not overwrite a newer authorized recovery state.
- When an in-scope repair creates a new blocker, repair that blocker before reporting back unless it crosses a hard boundary above.

## Server Execution Constraints

- Step01 source-video analysis runs only on Haika through the server Responses executor. Mac, Windows desktop bridges, and desktop App tasks are historical compatibility paths, not production dependencies.
- The server may use only the task's allowlisted routes, current source hash, and source-bound analysis authorization. It must not treat the model channel as media-provider authorization.
- Keep credentials in systemd environment files only. Do not record them in task contracts, artifacts, receipts, logs, or the website.
- For production media, retain the route's required preflight, evidence validation, ledger, and website projection before calling work delivered.

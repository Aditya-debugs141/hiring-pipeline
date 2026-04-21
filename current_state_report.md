# Hiring Pipeline Project — Current State Report

## Project Overview
We are building a queue-based hiring pipeline management system for small engineering teams, using the MERN stack (MongoDB, Express, React, Node.js). It replaces traditional spreadsheets with a structured pipeline where applicants are either placed into limited active review slots or queued on a waitlist. 

The project has been developed over 4 phases and is currently transitioning into Phase 5 (Final Polish & Documentation).

**Architecture Principle**: All core queue logic is custom-built. No third-party queuing libraries (like Bull/Redis) or real-time libraries (like Socket.io). It relies on atomic MongoDB transactions and action-triggered data fetching.

---

## Status Flow & Core Logic
- A **Job** defines an `activeCapacity` — the max number of applicants under active review simultaneously.
- **Application Flow:**
  1. `applied` → `active` (if capacity allows)
  2. `applied` → `waitlisted` (if capacity is full)
- **Automatic Promotion:** When an active applicant exits (`accepted` | `rejected` | `withdrawn`), the next waitlisted applicant is automatically promoted to `pending_acknowledgment`.
- **Decay Engine:** Promoted applicants must acknowledge within a time window (`decayWindowMinutes`). If they do not, a background decay engine shifts them back to the waitlist with a penalty (`decayCount`), and the system automatically promotes the next person.
- Every state change is robustly tracked in an `AuditLog`.

---

## Technical Stack
- **Database**: MongoDB (Mongoose, utilizing transactions). Uses `mongodb-memory-server` as a local fallback so it runs instantly without requiring a local daemon.
- **Backend**: Express.js, Node.js
- **Frontend**: React 19, Vite, React Router, Vanilla CSS (specifically targeting a clean, dark-themed, glassmorphism UI).
- **Communication**: REST API (Standard `fetch`), action-triggered refreshes on the frontend.

---

## Completion Status (Phases 1-4)

### ✅ Phase 1: Data Models & Queue Manager
- Built the `Job`, `Application`, and `AuditLog` Mongoose schemas.
- Implemented `queueManager.js` containing the core logic (`submitApplication`, `promoteNext`, `exitPipeline`, `acknowledgePromotion`) mapped cleanly to atomic MongoDB sessions and transactions to prevent race conditions during high-volume applications.

### ✅ Phase 2: REST API layer
- Exposed the `queueManager` via proper REST endpoints (`GET /api/jobs`, `POST /api/jobs`, `POST /api/jobs/:id/applications`, `PATCH /api/applications/:id/status`, `PATCH /api/applications/:id/acknowledge`, etc).
- Included a `GET /health` endpoint for readiness probes.
- Added comprehensive error handling middleware.

### ✅ Phase 3: Background Decay Engine
- Built a self-contained runtime engine (`decayEngine.js`) spawned directly on the Express index.js loop.
- It scans the DB every 60 seconds (`setInterval`) for applications stuck in `pending_acknowledgment` past their `acknowledgeDeadline`.
- Auto-decays those applicants back into the waitlist and triggers `promoteNext` for the subsequent candidate.

### ✅ Phase 4: React Frontend Client
- Built a Vite + React application.
- Structured across 3 primary views:
  1. **Company Dashboard (`/`)**: Overview of open jobs, capacities, and a form to spawn new jobs.
  2. **Job Pipeline View (`/jobs/:id`)**: Dual-panel overview showing Actionable (`active`/`acknowledged`) applicants and the Waitlist queue. Also rendering a collapsing Audit Log.
  3. **Applicant Status Page (`/status`)**: Self-serve portal where applicants can check their queue position and Acknowledge their promotion if selected.
- All styles implemented natively in unified CSS without heavy UI libraries, prioritizing dynamic hover states, responsive layouts, and badged color coding (green=active, amber=pending, etc.).
- The client and server run concurrently without errors.

---

## Current Working Directories
- **Backend**: `c:\Users\adith\OneDrive\Desktop\hiring-pipeline\server` (Runs on `http://localhost:5000`)
- **Frontend**: `c:\Users\adith\OneDrive\Desktop\hiring-pipeline\client` (Runs on `http://localhost:5173`)

---

## Next Steps (Phase 5: Project Conclusion)
The project logic and UI are fully functional from end-to-end. The upcoming phase will consist of:
1. Identifying and ironing out any lingering UI bugs.
2. Final UX improvements (like ensuring application IDs are easy to copy out).
3. Writing the final runbook/documentation.
4. Final project completion.

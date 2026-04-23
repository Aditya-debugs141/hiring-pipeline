# Hiring Pipeline — A Pipeline That Moves Itself

**XcelCrowd Hackathon Submission: Next In Line**

A full-stack web application that replaces spreadsheet-based hiring workflows with a transparent, queue-based pipeline. Companies post jobs with limited active review slots. Applicants are placed in fair queues with automatic promotion, decay-based accountability, and full audit trails.

### 🚀 Live Demo & Judge Testing Guide
**Frontend:** [https://hiring-pipeline-two.vercel.app/](https://hiring-pipeline-two.vercel.app/)  
*(Please wait up to 50 seconds for the backend to wake up from its free-tier sleep on the first load!)*

We highly recommend testing the live hosted link above! The entire application is **100% mobile-optimized** and fully functional. Here is how you can test the system end-to-end:

1. **Admin Access:** Go to the `/admin` page. Login with the role `owner` and the master password: `password`. *(Note: As the `owner`, you have access to a "Wipe Database" button. If you ever want to clear out all jobs and applications to start fresh, simply click this button!)*
2. **Create a Job:** Create a new job with an Active Capacity of 1. You can use real company names and technical roles.
3. **Trigger the Queue:** Go to the home page (even on your phone!) and apply to the job twice using your *real* email addresses. The first application gets the Active slot; the second goes to the Waitlist.
4. **Real Emails:** Go back to the Admin dashboard and **Reject** the Active applicant. Check your real email inbox! You will receive a rich HTML email notifying you that you've been promoted from the waitlist and must acknowledge.
5. **The Penalty System:** If an applicant does not acknowledge their promotion before the countdown timer expires, the Background Decay Engine will automatically strip their active slot, increment their penalty count, and kick them to the *back* of the waitlist to ensure fairness for others waiting.

---

## Architecture

```
┌─────────────────────────────────┐
│       React Frontend (Vite)     │
│  Landing • Apply • Status •Admin│
└────────────┬────────────────────┘
             │ REST API (fetch)
┌────────────▼────────────────────┐
│      Express.js Backend         │
│  Routes → Queue Manager         │
│  Decay Engine (background)      │
│  Mailer (optional SMTP)         │
└────────────┬────────────────────┘
             │ Mongoose (transactions)
┌────────────▼────────────────────┐
│         MongoDB                 │
│  Jobs • Applications • AuditLog │
└─────────────────────────────────┘
```

## Core Concepts

### Queue-Based Pipeline
Each job defines an **active capacity** — the maximum number of applicants under simultaneous review. When capacity is full, new applicants join a **waitlist** with a deterministic position (1, 2, 3...).

### Auto-Close & Auto-Reject
When the number of `accepted` applicants reaches the job's total active capacity, the job is automatically marked as closed (`isOpen: false`), which prevents further applications. Simultaneously, any remaining candidates in the `waitlisted` or `pending_acknowledgment` states are automatically bulk-rejected with a clear `job_filled` reason.

### Automatic Promotion
When an active applicant exits the pipeline (accepted, rejected, or withdrawn), the system **automatically promotes** the next waitlisted applicant. No manual intervention required.

### Decay Engine
Promoted applicants enter a `pending_acknowledgment` state and must acknowledge within a configurable time window (default: 30 minutes per job). If they fail to acknowledge:
- They **decay** back to the end of the waitlist
- Their `decayCount` is incremented (penalty tracking)
- The next person in line is automatically promoted

The decay engine runs as a background `setInterval` loop (every 60 seconds), scanning for expired promotions.

### Audit Trail
Every state transition is logged in an immutable `AuditLog` collection with: who, from-status, to-status, reason, timestamp, and metadata.

## Design Decisions

### 1. Penalized Position on Decay
**Decision**: Decayed applicants are placed at the **end of the waitlist** (after the last current waitlisted person).

**Rationale**: This is the fairest approach — applicants who fail to acknowledge have effectively declined their opportunity. Placing them at the end ensures that people who have been waiting longer are not penalized by someone else's inaction. The `decayCount` field tracks how many times someone has been decayed, which could be used for further policy decisions.

### 2. Queue Continues During Pending Acknowledgment (No Freeze)
**Decision**: The queue **does not freeze** while someone is in `pending_acknowledgment`. The cascade continues independently.

**Rationale**: Freezing the entire queue for one person's acknowledgment window would create unnecessary delays for all other applicants. Instead, the promoted applicant occupies an active slot (incrementing `activeCount`), and the queue continues to function normally. If they decay, the slot is released and the next person is promoted. This maximizes throughput while maintaining fairness.

### 3. Configurable Decay Window Per Job
**Decision**: Each job has its own `decayWindowMinutes` field (default: 30 minutes), rather than a single global setting.

**Rationale**: Different hiring contexts have different urgency levels. A high-volume internship position might use a 15-minute window, while a senior role might allow 24 hours. Per-job configuration provides flexibility without adding complexity.

### 4. Notification Method
**Decision**: Email notifications via SMTP (Nodemailer). When SMTP credentials are not configured, the system operates normally without sending emails — it logs a warning at startup and silently skips sends.

**Rationale**: Email is the most reliable notification channel for a hiring context. The graceful fallback ensures the system runs correctly in development/demo environments without requiring SMTP setup.

### 5. Direct Application Submission
**Decision**: Applicants submit directly through the platform's web interface. No external ATS integration, no LinkedIn connection.

**Rationale**: The platform is self-contained — companies post jobs, applicants apply through the public-facing pages, and the pipeline manages the rest. This keeps the system simple and demonstrates the full flow end-to-end.

## Data Integrity & Concurrency Control

A major architectural challenge in any queuing system is preventing race conditions (e.g., two applicants grabbing the last active slot at the exact same millisecond). To solve this without relying on heavy third-party message brokers like Redis or RabbitMQ, all mutations use **MongoDB atomic operations and sessions/transactions**:

- **Concurrency Control on Submit**: `submitApplication` atomically attempts to claim an active slot using `$expr` + `$inc` in a single `findOneAndUpdate`. If Alice and Bob apply simultaneously for the last slot, the database lock ensures one gets the slot and the other's query evaluates to false, safely routing them to the waitlist.
- **Transactional State Transitions**: `exitPipeline` and `acknowledgePromotion` use multi-document transactions. If the server crashes after updating an applicant's status but before writing the `AuditLog`, the entire operation rolls back to prevent corrupted state.
- **TOCTOU Guard**: `processDecayedApplication` uses `findOneAndUpdate` with a strict status filter (`status: "pending_acknowledgment"`) to guard against Time-Of-Check to Time-Of-Use races (e.g., if an applicant acknowledges exactly as the decay tick queries the database).
- **Gapless Queues**: `reindexWaitlist` uses `bulkWrite` to re-sequence the waitlist array deterministically after any promotion, eliminating position gaps caused by concurrent state changes.

## Tradeoffs & Future Improvements (What I'd change with more time)

1. **In-Memory vs Persistent Background Jobs**
   - *Tradeoff*: The decay engine runs on a standard Node.js `setInterval`. This is lightweight and requires no extra infrastructure (perfect for a small internal tool). However, if the server restarts or crashes, the interval resets, potentially delaying some decays by a few minutes. If multiple Node instances run, they might race to process decays.
   - *With more time*: I would implement a dedicated task queue (like BullMQ + Redis) or use MongoDB-based distributed locks to ensure the decay engine runs exactly once across a clustered environment with perfect scheduling.

2. **Database Transactions vs Lock Contention**
   - *Tradeoff*: I chose to rely heavily on MongoDB's atomic operations (`findOneAndUpdate` with conditions) and multi-document transactions to ensure strict state consistency and prevent race conditions.
   - *With more time*: If this system scaled to thousands of applications per second, MongoDB transactions could create lock contention on the `Job` document (due to the `activeCount` field). I would transition the queue state into Redis for ultra-fast, atomic token bucket claiming, and sync back to MongoDB asynchronously.

3. **Frontend Real-time Updates**
   - *Tradeoff*: The challenge specified "The system does not need to be real-time". Currently, the Admin Dashboard requires a manual page refresh to see queue movements.
   - *With more time*: I would implement Server-Sent Events (SSE) or WebSockets to push live pipeline updates to the admin dashboard. This would allow HR teams to watch the waitlist automatically promote in real-time as they review and reject candidates.

4. **Security & Session Management**
   - *Tradeoff*: For the sake of the hackathon and keeping it lightweight, Admin RBAC (Role-Based Access Control) is simulated using `sessionStorage` and a master password.
   - *With more time*: I would implement proper JWT-based authentication in HTTP-only cookies, password hashing (bcrypt), and proper user models for Admins.

5. **File Storage**
   - *Tradeoff*: Resume PDFs are currently handled via `multer` and stored directly on the local filesystem (`server/uploads/`).
   - *With more time*: I would pipe these uploads directly to an AWS S3 bucket to ensure persistence across server restarts and deployments.

## API Reference

### Jobs
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/jobs` | Create a job (`title`, `companyName`, `activeCapacity` required) |
| `GET` | `/api/jobs` | List all jobs |
| `GET` | `/api/jobs/:id` | Get job with pipeline state (active, waitlisted, exited groups) |
| `GET` | `/api/jobs/:id/audit` | Get audit trail for a job |

### Applications
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/jobs/:id/applications` | Submit application (`applicantName`, `applicantEmail` required) |
| `PATCH` | `/api/applications/:id/status` | Exit pipeline (`newStatus`: accepted/rejected/withdrawn) |
| `PATCH` | `/api/applications/:id/acknowledge` | Acknowledge a promotion |
| `GET` | `/api/applications/:id/status` | Get application status with queue message |

### Health
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Server health check |

## Application Status Flow

```
                    ┌──────────────┐
                    │   Applied    │
                    └──────┬───────┘
              ┌────────────┴────────────┐
              ▼                         ▼
        ┌──────────┐            ┌─────────────┐
        │  Active  │            │  Waitlisted  │◄──── (decay penalty)
        └────┬─────┘            └──────┬───────┘           ▲
             │                         │                   │
             │              (auto-promote on exit)         │
             │                         ▼                   │
             │              ┌─────────────────────┐        │
             │              │ Pending Acknowledge  │───────┘
             │              └──────────┬──────────┘  (timeout)
             │                         │
             │                    (acknowledge)
             │                         ▼
             │              ┌──────────────────┐
             │              │   Acknowledged   │
             │              └────────┬─────────┘
             │                       │
             ▼                       ▼
    ┌─────────────────────────────────────┐
    │   Accepted / Rejected / Withdrawn   │
    └─────────────────────────────────────┘
```

## Tech Stack

- **Backend**: Node.js, Express 5, Mongoose 9
- **Database**: MongoDB (with `mongodb-memory-server` fallback for local dev)
- **Frontend**: React 19, Vite 8, React Router 7, Vanilla CSS
- **Email**: Nodemailer (optional SMTP)

## 🛠️ Setup Instructions

### Prerequisites
- Node.js 18+
- MongoDB (optional — the app automatically falls back to an in-memory database if MongoDB is not installed locally, so it works out of the box!)

### Quick Start (Local Development)

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Aditya-debugs141/hiring-pipeline.git
   cd hiring-pipeline
   ```

2. **Start the Backend:**
   ```bash
   cd server
   npm install
   # The server will automatically use an in-memory database and a test email account
   npm run dev
   # Server runs on http://localhost:5000
   ```
   **Important Note on Local Emails:** Because `.env` files with real SMTP passwords are not uploaded to GitHub, your local clone will not send *real* emails to your inbox. Instead, the backend will gracefully fallback to **Test Mode (Ethereal Email)**. Whenever an email is sent, look at this terminal window — it will print a `Preview URL` link. Click that link to view the exact HTML email in your browser!

3. **Start the Frontend (in a new terminal):**
   ```bash
   cd client
   npm install
   npm run dev
   # Frontend runs on http://localhost:5173
   ```

### Environment Variables (`server/.env`)

| Variable | Default | Description |
|----------|---------|-------------|
| `MONGO_URI` | `mongodb://localhost:27017/hiring-pipeline` | MongoDB connection string |
| `PORT` | `5000` | Server port |
| `SMTP_HOST` | _(blank)_ | SMTP server (leave blank to disable emails) |
| `SMTP_PORT` | `587` | SMTP port |
| `SMTP_USER` | _(blank)_ | SMTP username |
| `SMTP_PASS` | _(blank)_ | SMTP password |
| `SMTP_FROM` | _(blank)_ | Sender email address |
| `APP_URL` | `http://localhost:5173` | Frontend URL (used in email links) |

### Running Tests

```bash
# Full integration test (uses in-memory MongoDB, no setup needed)
cd server
node test-pipeline.js

# Live decay test (requires running server on port 5000)
node test-decay.js
```

## 🧪 Testing the Application Locally (The Golden Path)
To quickly test the core "Auto-Promotion" waitlist engine on your local machine:

1. **Create a Job:** Go to `/admin` (login: `owner` / `password`), click **+ Create New Job**, and set the **Active Capacity** to `1`.
2. **Apply (Active):** Go to the public landing page. Click the job and apply as "Alice". Since capacity is 1, Alice becomes **Active**.
3. **Apply (Waitlist):** Apply again as "Bob". Since the single active slot is taken, Bob is placed in **Waitlist #1**.
4. **Trigger Promotion:** Go back to `/admin`, view the Job Pipeline, and **Reject** Alice.
5. **The Magic:** Watch Bob automatically move from the Waitlist to **Pending Acknowledgment**. Because you are running locally without SMTP credentials, look at your backend terminal for the `Preview URL` and click it to see the email!
6. **Final Step:** Go to `/status`, input Bob's Application ID, and click **Acknowledge** (or just click the button inside the test email) to finalize his promotion to Active.

## Project Structure

```
hiring-pipeline/
├── server/
│   ├── index.js                 # Express entry point
│   ├── engine/decayEngine.js    # Background decay engine
│   ├── middleware/errorHandler.js
│   ├── models/
│   │   ├── Application.js       # Application schema (7 statuses)
│   │   ├── AuditLog.js          # Immutable audit trail
│   │   └── Job.js               # Job with capacity config
│   ├── routes/
│   │   ├── applications.js      # PATCH status, acknowledge, GET status
│   │   └── jobs.js              # CRUD jobs, submit applications, audit
│   ├── utils/
│   │   ├── queueManager.js      # Core queue logic (submit, promote, exit, ack)
│   │   └── mailer.js            # Email notifications (optional)
│   ├── test-pipeline.js         # Integration tests
│   └── test-decay.js            # Live decay test
├── client/
│   ├── src/
│   │   ├── App.jsx              # Router & navigation
│   │   ├── App.css              # Full design system
│   │   ├── api/index.js         # API client with error handling
│   │   └── pages/
│   │       ├── LandingPage.jsx      # Public job listings + hero
│   │       ├── ApplyPage.jsx        # Public application form
│   │       ├── ApplicantStatus.jsx  # Self-serve status checker
│   │       ├── CompanyDashboard.jsx # Admin: manage jobs
│   │       └── JobPipeline.jsx      # Admin: pipeline view + audit
│   └── index.html
└── README.md
```

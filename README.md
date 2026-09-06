# ReachInbox Email Scheduler

A full-stack email scheduling system built as a hiring assignment for ReachInbox.

The application supports authenticated email scheduling, background processing with BullMQ, Redis-backed rate limiting, safe rescheduling, Slack notifications, Elasticsearch search, CSV/TXT recipient uploads, and persistent jobs across backend restarts.

## Tech Stack

### Frontend

- React
- TypeScript
- Vite
- Tailwind CSS
- React Router

### Backend

- Node.js
- TypeScript
- Express.js
- PostgreSQL
- Redis
- BullMQ
- Elasticsearch
- Nodemailer
- Ethereal SMTP

### Authentication & Integrations

- Google OAuth
- JWT authentication
- Slack OAuth
- Slack Web API

## Architecture

```text
                    React Frontend
                         |
                         | JWT
                         v
                  Express Backend
                         |
          +--------------+--------------+
          |              |              |
          v              v              v
     PostgreSQL       BullMQ       Elasticsearch
                         |
                         v
                       Redis
                         |
                         v
                    Email Worker
                         |
                         v
                    Ethereal SMTP
                         |
                         v
                    Email Delivery
                         |
                         v
                    Slack API
```

## Email Flow

```text
Compose Campaign
       |
       v
JWT Authentication
       |
       v
PostgreSQL Email Record
       |
       v
BullMQ Delayed Job
       |
       v
Redis-backed Worker
       |
       +---- Hourly Rate Limit
       |           |
       |           v
       |       Reschedule
       |
       +---- Minimum Delay
       |
       v
Ethereal SMTP
       |
       v
PostgreSQL = sent
       |
       v
Elasticsearch Index
```

## Features

### Authentication

- Google OAuth login
- JWT-based API authentication
- User-specific email access
- Protected campaign endpoints
- Protected recipient upload endpoints
- Protected Slack connection endpoints

### Email Scheduling

Users can configure:

- Recipients
- Subject
- Email body
- Start time
- Minimum delay between emails
- Hourly sending limit

Recipients can be entered manually or uploaded using CSV/TXT files.

### BullMQ

Email delivery is handled asynchronously using BullMQ and Redis.

Worker concurrency is configurable:

```
WORKER_CONCURRENCY=5
```

BullMQ delayed jobs persist in Redis and survive backend restarts.

### Minimum Delay

A Redis-backed atomic mechanism controls the minimum delay between emails for the same user.

This prevents multiple workers from ignoring the configured delay.

### Hourly Rate Limiting

Hourly sending limits are enforced using Redis.

The rate-limit counter is shared between workers, allowing multiple workers or backend instances to use the same limit safely.

When the hourly limit is reached:

- The email is not dropped.
- The current job is completed.
- A new delayed BullMQ job is created.
- The email remains scheduled.
- A Slack notification is sent.

### SMTP Rate Limiting

The worker also handles SMTP provider rate-limit responses.

If the SMTP provider returns a rate-limit response, the email is safely rescheduled instead of being permanently marked as failed.

### Slack Integration

Users can connect Slack through OAuth.

When the email rate limit is reached, the system sends a Slack notification.

Slack can be connected or disconnected without redeploying the backend.

If Slack is not connected, email processing continues normally.

### Elasticsearch

Sent emails are indexed in Elasticsearch.

Search supports:

- Recipient
- Subject
- Body

Search results are restricted to the authenticated user's emails.

### Bull Board

Bull Board provides a live dashboard for monitoring BullMQ jobs.

Open:

```
http://localhost:5000/admin/queues
```

## Local Setup

### Requirements

Install:

- Node.js
- Docker Desktop
- Git

### 1. Clone the repository

```
git clone <your-private-repository-url>
cd reachinbox-email-scheduler
```

### 2. Start infrastructure

```
docker compose up -d
```

This starts:

- PostgreSQL
- Redis
- Elasticsearch

### 3. Configure backend

Create:

```
backend/.env
```

Use:

```
backend/.env.example
```

as the template.

Configure:

- Google OAuth credentials
- Ethereal SMTP credentials
- Slack OAuth credentials
- JWT secret

Never commit the real .env file.

### 4. Install backend dependencies

```
cd backend
npm install
```

### 5. Initialize PostgreSQL

Run the SQL files against the PostgreSQL database:

```
backend/sql/schema.sql
backend/sql/slack.sql
```

### 6. Start backend

```
npm run dev
```

Backend:

```
http://localhost:5000
```

### 7. Install frontend dependencies

Open another terminal:

```
cd frontend
npm install
```

### 8. Start frontend

```
npm run dev
```

Frontend:

```
http://localhost:5173
```

## Environment Variables

Use:

```
backend/.env.example
```

Important configuration:

```
WORKER_CONCURRENCY=5
DEFAULT_HOURLY_LIMIT=100
DEFAULT_MINIMUM_DELAY_SECONDS=0
```

## Testing

### Basic Email Test

1. Login using Google.
2. Open Compose.
3. Add a recipient.
4. Enter subject and body.
5. Click Send.
6. Verify the email appears in Sent.
7. Verify the email is indexed in Elasticsearch.

### CSV/TXT Upload Test

Upload a CSV or TXT file containing email addresses.

The application:

- Validates email addresses.
- Removes duplicate addresses.
- Returns the recipient count.
- Schedules the resulting emails through BullMQ.

### Rate Limit Test

Example:

- Recipients: 3
- Hourly Limit: 1
- Delay: 0

Expected:

```
Email 1 -> Sent
Email 2 -> Rescheduled
Email 3 -> Rescheduled
Slack -> One rate-limit notification
```

The remaining emails are not dropped.

### Restart Persistence Test

1. Schedule an email for a future time.
2. Stop the backend.
3. Restart the backend.
4. BullMQ retains the delayed job in Redis.
5. The worker processes the job at the scheduled time.
6. The email is marked as sent.

### 1000+ Email Test

The system was tested with a 1000-email workload.

BullMQ successfully handled the workload using configurable worker concurrency.

During the stress test, the Ethereal SMTP provider imposed outbound throttling. SMTP rate-limited emails were safely rescheduled by the worker instead of being permanently failed.

## API Overview

### Google Authentication

```
GET /auth/google
GET /auth/google/callback
```

### Campaign

```
POST /campaigns
```

### Emails

```
GET /emails?status=scheduled
GET /emails?status=sent
GET /emails/search?q=<query>
GET /emails/:emailId
```

### Recipient Upload

```
POST /upload/recipients
```

### Slack

```
POST /auth/slack/connect
GET /auth/slack/callback
GET /auth/slack/status
DELETE /auth/slack/disconnect
```

### Health Check

```
GET /health
```

### Bull Board

```
/admin/queues
```

## Reliability and Idempotency

The system uses multiple mechanisms to improve reliability and prevent duplicate email sends:

- PostgreSQL email records
- Persistent BullMQ jobs
- Redis-backed rate limiting
- Atomic Redis delay reservation
- Sent-status verification before sending
- Safe delayed rescheduling
- SMTP rate-limit handling
- Elasticsearch indexing after successful delivery

Before sending an email, the worker checks the PostgreSQL status.

If an email is already marked as sent, the worker skips sending it again.

This provides idempotent email processing when duplicate or retried jobs occur.

## Multi-Worker Safety

The worker supports configurable concurrency:

```
WORKER_CONCURRENCY=5
```

Redis is used for shared coordination.

The hourly rate-limit counter uses atomic Redis operations, while the minimum-delay mechanism uses an atomic Redis script.

This allows multiple workers to coordinate safely without maintaining rate-limit state only in local memory.

## Project Structure

```
reachinbox-email-scheduler/
│
├── backend/
│   ├── src/
│   │   ├── config/
│   │   ├── errors/
│   │   ├── middleware/
│   │   ├── queues/
│   │   ├── repositories/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── utils/
│   │   └── workers/
│   │
│   ├── sql/
│   │   ├── schema.sql
│   │   └── slack.sql
│   │
│   ├── .env.example
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── layouts/
│   │   ├── pages/
│   │   ├── services/
│   │   └── types/
│   │
│   ├── package.json
│   └── vite.config.ts
│
├── docker-compose.yml
├── .gitignore
└── README.md
```

## Database

PostgreSQL stores:

### Users

- Google account information
- Name
- Email
- Avatar

### Emails

- Sender
- Recipient
- Subject
- Body
- Status
- Scheduled time
- Sent time
- BullMQ job ID
- Message ID

### Slack Connections

- User
- Slack user ID
- Workspace information
- OAuth access token

## Email Statuses

The system supports:

- scheduled
- sent
- failed

A rate-limited email remains part of the scheduled workflow and is resubmitted to BullMQ with a future delay.

## Security

The API uses JWT authentication.

User identity is derived from the authenticated JWT rather than trusting a userId supplied by the frontend.

Email listing, search, campaign creation, recipient uploads, email details, and Slack operations are protected by authentication middleware.

Email detail access also verifies that the requested email belongs to the authenticated user.

Secrets and credentials are stored in .env and excluded from Git.

## Development Commands

### Backend

```
cd backend
npm install
npm run dev
npm run build
```

### Frontend

```
cd frontend
npm install
npm run dev
npm run build
```

### Docker

Start infrastructure:

```
docker compose up -d
```

Stop infrastructure:

```
docker compose down
```

## Verification

The following functionality has been tested:

- Google OAuth
- JWT authentication
- Email scheduling
- Ethereal SMTP delivery
- BullMQ background processing
- Redis-backed rate limiting
- Minimum email delay
- Safe rate-limit rescheduling
- Slack OAuth
- Slack rate-limit notification
- Elasticsearch indexing
- Elasticsearch search
- CSV/TXT recipient upload
- Email details
- Bull Board
- Backend restart persistence
- 1000+ email queue workload

## Author

Subrat Gupta
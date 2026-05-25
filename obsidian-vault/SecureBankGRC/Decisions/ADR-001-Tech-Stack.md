---
status: Implemented
last_updated: 2026-05-25T23:14:00Z
dependencies: []
linked_phases: [Phase-01]
---

# ADR 001: Technology Stack Selection

## Context
We need a scalable, secure, and easily demonstrable framework stack for a financial GRC system mapping 10 modules.

## Decision
- **Frontend**: Next.js 14 App Router (React framework) using TypeScript.
- **Backend**: Python 3.11 with FastAPI.
- **Database**: PostgreSQL 16 (production) with SQLite support for simple local mock testing.
- **Cache**: Redis 7.0 for rate limiting, JWT block-listing, and Celery/BullMQ backplane if needed.
- **ORM**: SQLAlchemy 2.0 with Alembic for Python schema management.

## Rationale
- Next.js 14 App Router matches state-of-the-art corporate frontend systems and integrates cleanly with Tailwind.
- FastAPI automatically produces interactive Swagger documentation (`/docs`), highly useful for compliance reviewers.
- Python provides clean scripting bindings for the automation layers (MFA compliance scans, vendor scoring calculations).

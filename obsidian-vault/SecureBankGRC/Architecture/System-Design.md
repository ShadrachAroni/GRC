---
status: In Progress
last_updated: 2026-05-25T23:14:00Z
dependencies: []
linked_phases: [Phase-01]
---

# System Design & Architecture

## Overview
The SecureBank GRC Platform utilizes a decoupled five-layer architecture:
1. **Data Layer**: PostgreSQL database representing risks, controls, incidents, audits, vendors, CAPAs, and tenant mappings.
2. **API Layer**: FastAPI application routing HTTP endpoints, validating schemas, verifying signatures, and managing middleware.
3. **Frontend Layer**: Next.js App Router SPA using Zustand, React Query, Tailwind CSS, and Recharts.
4. **Automation Layer**: Background scripts (triggered by cron or API gateways) executing risk calculations, compliance audits, and SLA remediation.
5. **CI/CD Layer**: GitHub Actions automating validation of security controls, code styling, and unit test suites.

## Multi-Tenancy Architecture
- **Isolation Strategy**: Logical separation via `tenant_id` on every table.
- **Enforcement**:
  - FastAPI custom dependency fetches the current user's `tenant_id` and scopes SQLAlchemy sessions.
  - Supabase/PostgreSQL Row Level Security (RLS) acts as a secondary defense-in-depth safety gate.

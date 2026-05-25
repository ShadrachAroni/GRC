---
status: Approved
last_updated: 2026-05-25T21:20:00Z
dependencies: [Architecture/System-Design.md]
linked_phases: [Phase-04, Phase-05]
---

# ADR 002: Multi-Tenant Data Isolation Strategy

## Context
In a regulated fintech GRC tool, multiple organizations must run on the same backend without the possibility of cross-tenant data leakage.

## Decision
- We will use **Logical Isolation via tenant_id column scoping** on all application tables.
- A composite index on `(tenant_id, created_at)` will be added to ensure efficient querying.
- FastAPI dependency injection will mandate a `get_tenant_filter` parameter that injects `tenant_id` derived from JWT tokens. All SQLAlchemy ORM queries will be dynamically scoped by appending `.filter(Model.tenant_id == tenant_id)`.
- Row-Level Security (RLS) policies will be added to the database to act as an infrastructure fallback defense.

## Rationale
- Standard scoping in queries is highly performant.
- RLS rules on the Postgres level ensure that if developers write a query omitting the `tenant_id` filter, the DB prevents access, providing a dual-control safety validation.

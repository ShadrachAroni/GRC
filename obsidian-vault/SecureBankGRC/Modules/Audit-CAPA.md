---
status: Proposed
last_updated: 2026-05-25T21:20:00Z
dependencies: [Architecture/System-Design.md]
linked_phases: [Phase-04, Phase-09]
---

# Audit Log & CAPA Tracker Module

## Specification
Maintains an immutable database audit trail and tracks Corrective and Preventive Actions (CAPA) generated from audit findings.

## Data Models
- **Table**: `audit_findings`
  - `finding_id` (TEXT, PK, e.g., AF-001)
  - `tenant_id` (UUID, Foreign Key)
  - `title` (TEXT)
  - `severity` (TEXT, Critical/High/Medium/Low)
  - `control_id` (TEXT, FK)
  - `recommendation` (TEXT)
  - `status` (TEXT, Default 'Open')
  - `detected_at` (TIMESTAMP)
- **Table**: `capas`
  - `capa_id` (TEXT, PK, e.g., CAPA-001)
  - `tenant_id` (UUID, Foreign Key)
  - `finding_id` (TEXT, FK)
  - `title` (TEXT)
  - `root_cause` (TEXT)
  - `action` (TEXT)
  - `owner` (TEXT)
  - `due_date` (DATE)
  - `status` (TEXT, Default 'Open')
- **Table**: `system_audit_logs` (Immutable Log)
  - `log_id` (UUID, PK)
  - `tenant_id` (UUID, Foreign Key)
  - `user_id` (UUID)
  - `action` (TEXT, e.g., DELETE_RISK)
  - `affected_entity` (TEXT)
  - `ip_address` (TEXT)
  - `timestamp` (TIMESTAMP)

## Features
- **Auto-CAPA Script**: Nightly validator catches open findings with Critical/High severity and generates CAPAs automatically.
- **SLA Mapping**:
  - Critical: 7 days
  - High: 14 days
  - Medium: 30 days
  - Low: 90 days

---
status: Implemented
last_updated: 2026-05-27T23:15:00Z
dependencies: [Architecture/System-Design.md]
linked_phases: [Phase-04, Phase-08]
---

# Incident Manager Module

## Specification
The Incident Manager logs system security events, manages their containment/resolution cycle, tracks SLA deadlines, and displays MTTR/MTTD metrics.

## Data Model
- **Table**: `incidents`
  - `incident_id` (INTEGER, PK, Autoincrement)
  - `tenant_id` (UUID, Foreign Key)
  - `title` (TEXT, Not Null)
  - `severity` (TEXT, e.g., Critical, High, Medium, Low)
  - `status` (TEXT, e.g., Open, Contained, Resolved, Closed)
  - `detected_at` (TIMESTAMP)
  - `resolved_at` (TIMESTAMP, Nullable)
  - `mttd_minutes` (INTEGER)
  - `mttr_minutes` (INTEGER)
  - `description` (TEXT)
  - `assigned_to` (TEXT)
  - `created_at` (TIMESTAMP)

## Features
- **Kanban Board**: Drag-and-drop representation of incidents across status columns.
- **MTTR & MTTD Calculation**: Automated duration calculations upon logging resolution.
- **SLA Alerts**: Flagging incident cards exceeding recovery bounds (e.g. Critical SLA of 2 hours).

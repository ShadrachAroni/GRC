---
status: Data Schema Implemented
last_updated: 2026-05-27T13:25:00Z
dependencies: [Architecture/System-Design.md]
linked_phases: [Phase-04, Phase-06]
---

# Risk Register Module

## Specification
The Risk Register Module enables users to log, prioritize, and mitigate cybersecurity risks.

## Data Model
- **Table**: `risks`
- **Fields**:
  - `risk_id` (TEXT, Primary Key, e.g. R-001)
  - `tenant_id` (UUID, Foreign Key)
  - `asset` (TEXT, Not Null)
  - `threat` (TEXT, Not Null)
  - `likelihood` (INTEGER, 1-5)
  - `impact` (INTEGER, 1-5)
  - `risk_score` (INTEGER, generated likelihood * impact)
  - `severity` (TEXT, Low/Medium/High/Critical)
  - `mitigation` (TEXT)
  - `status` (TEXT, Default 'Open')
  - `owner` (TEXT)
  - `department` (TEXT)
  - `review_date` (DATE)
  - `created_at` (TIMESTAMP)
  - `updated_at` (TIMESTAMP)

## Features
- **Automated Severity**:
  - Score >= 16: `Critical`
  - Score >= 11: `High`
  - Score >= 6: `Medium`
  - Score < 6: `Low`
- **Heat Map Visual**: 5x5 grid displaying count and IDs of risks clustered in each cell.
- **Validation**: Reject updates or insertions with likelihood or impact outside [1, 5] range.

---
status: Implemented
last_updated: 2026-05-27T21:00:00Z
dependencies: [Architecture/System-Design.md]
linked_phases: [Phase-04, Phase-07]
---

# Compliance Tracker Module

## Specification
The Compliance Tracker Module provides standard mappings for regulatory frameworks (SOC 2, ISO 27001, PCI-DSS) to controls, tracks implementation status, and stores uploaded audit evidence.

## Data Models
- **Table**: `controls`
  - `control_id` (TEXT, PK, e.g. CC6.1, A.9)
  - `tenant_id` (UUID, Foreign Key)
  - `framework` (TEXT, e.g. SOC2, ISO27001)
  - `description` (TEXT)
  - `company_control` (TEXT)
  - `status` (TEXT, Default 'Not Started')
  - `owner` (TEXT)
  - `evidence_required` (TEXT)
  - `last_reviewed` (DATE)
  - `created_at` (TIMESTAMP)
- **Table**: `evidence`
  - `evidence_id` (UUID, PK)
  - `tenant_id` (UUID, Foreign Key)
  - `control_id` (TEXT, FK)
  - `file_name` (TEXT)
  - `file_path` (TEXT)
  - `uploaded_by` (TEXT)
  - `uploaded_at` (TIMESTAMP)

## Features
- **Upload Validation**: Restrict file MIME types and size (< 1MB) on server-side.
- **Coverage Stats**: Aggregates compliance percentages (Implemented controls vs total controls).

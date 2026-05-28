---
status: Complete
last_updated: 2026-05-25T21:20:00Z
dependencies: [Architecture/System-Design.md]
linked_phases: [Phase-01, Phase-03, Phase-07]
---

# Supabase Integration Specification

## Overview
Supabase is integrated into the GRC platform for three primary functions:
1. **Federated Auth / Identity**: Managing user credentials, authentication flows, email verification, and generating JWT tokens containing tenant claims.
2. **PostgreSQL Database**: Supabase provides our hosted PostgreSQL instance.
3. **Storage buckets**: Evidence artifacts, audit logs, and vendor spreadsheets are placed in Supabase storage buckets.

## Storage Configurations & Buckets
Three distinct buckets will be created:
1. `evidence-bucket` (compliance test results, policy signatures, screenshots)
2. `vendor-docs` (vendor questionnaire uploads, SOC 2 reports from third parties)
3. `audit-artefacts` (internal audit findings reports, CAPA approvals)

## RLS Security Policies
Each bucket is configured with RLS rules restricting read and write capabilities:
```sql
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner-Only Storage Read/Write"
ON storage.objects
FOR ALL
USING (auth.uid() = owner);

CREATE POLICY "Admin Override Read"
ON storage.objects
FOR SELECT
USING (auth.jwt()->>'role' = 'admin');
```
All uploads must programmatically set the owner metadata attribute to the user ID.

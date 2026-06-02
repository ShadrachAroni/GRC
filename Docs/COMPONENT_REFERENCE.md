# GRC Sentinel - Codebase Component Reference

This document serves as a complete reference catalog of the key modules, API routes, data structures, and frontend components in the GRC Sentinel repository.

---

## 1. Backend API Router Modules

FastAPI router modules are stored under `api/routers/`. All operations enforce tenant checks and check the client's bearer token.

### A. Authentication & Identity
- **Router File**: [auth.py](file:///c:/Projects/Cyber%20Security%20projects/GRC_System/GRC/api/routers/auth.py)
- **Key Endpoints**:
  - `POST /api/auth/register`: Create a new user account and isolate them under a new Tenant ID.
  - `POST /api/auth/login`: Authenticates credentials; returns JWT tokens or prompts for MFA passcode validation.
  - `POST /api/auth/login/verify`: Verifies standard TOTP 6-digit passcode.
  - `POST /api/auth/mfa/enable`: Generates Google Authenticator TOTP secrets and 10-character backup recovery codes.

### B. Risk Register
- **Router File**: [risks.py](file:///c:/Projects/Cyber%20Security%20projects/GRC_System/GRC/api/routers/risks.py)
- **Key Endpoints**:
  - `GET /api/risks`: Retrieve all registered tenant risks.
  - `POST /api/risks`: Register a new threat profile with sliders for Likelihood and Impact.
  - `PATCH /api/risks/{id}`: Modify risk matrices or update mitigation status.
  - `DELETE /api/risks/{id}`: Delete risk profiles.

### C. Compliance Tracker
- **Router File**: [controls.py](file:///c:/Projects/Cyber%20Security%20projects/GRC_System/GRC/api/routers/controls.py)
- **Key Endpoints**:
  - `GET /api/controls`: Retrieve standard compliance frameworks mapped to the tenant's control checklists.
  - `PATCH /api/controls/{id}`: Update implementation status to "Implemented", "In Progress", or "Not Started".
  - `POST /api/controls/{id}/evidence`: Upload document evidence (subject to size limits < 1MB and file extension limits).

### D. Incident Management
- **Router File**: [incidents.py](file:///c:/Projects/Cyber%20Security%20projects/GRC_System/GRC/api/incidents.py)
- **Key Endpoints**:
  - `GET /api/incidents`: Query tenant incidents, computing active warning SLAs and MTTR metrics.
  - `POST /api/incidents`: Log a new incident.
  - `PATCH /api/incidents/{id}`: Adjust lifecycle lane status or edit description logs.

### E. Audit & CAPA Tracker
- **Router File**: [audit.py](file:///c:/Projects/Cyber%20Security%20projects/GRC_System/GRC/api/routers/audit.py)
- **Key Endpoints**:
  - `GET /api/audit/logs`: Retrieve structured logs (restricted to system administrators).
  - `POST /api/audit/findings`: File compliance deviations matching control IDs.
  - `POST /api/audit/capas`: Initiate a CAPA action assigned to an owner with due dates.

---

## 2. Database Models & Validation Schemas

Data structures and boundaries are managed cleanly:

- **Database Relational Models**: Stored in `api/models.py`. Defines tables (`User`, `Risk`, `Control`, `Evidence`, `Incident`, `AuditLog`, `AuditFinding`, `Capa`) and relationships using SQLAlchemy.
- **Pydantic Validation Schemas**: Stored in `api/schemas.py`. Enforces strict JSON payload input parsing, preventing injection by setting `extra = 'forbid'`.

---

## 3. Frontend Core UI Components

Atomic UI elements are stored in `frontend/src/components/atoms/` and `templates/`:

- **Button Component**: [Button.tsx](file:///c:/Projects/Cyber%20Security%20projects/GRC_System/GRC/frontend/src/components/atoms/Button.tsx). Supports variants (`primary`, `secondary`, `danger`) and respects system dark mode styles.
- **Badge Component**: [Badge.tsx](file:///c:/Projects/Cyber%20Security%20projects/GRC_System/GRC/frontend/src/components/atoms/Badge.tsx). Generates colored tags representing risk matrices, compliance states, and SLA states.
- **Input Component**: [Input.tsx](file:///c:/Projects/Cyber%20Security%20projects/GRC_System/GRC/frontend/src/components/atoms/Input.tsx). Combines validation borders, labels, helper texts, and custom Lucide icon badges.
- **Page Layout Wrapper**: [PageLayout.tsx](file:///c:/Projects/Cyber%20Security%20projects/GRC_System/GRC/frontend/src/components/templates/PageLayout.tsx). Integrates responsive sidebars, route breadcrumbs, language translation hook actions, and custom dark mode event hooks.

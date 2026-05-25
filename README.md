# SecureBank GRC (Governance, Risk & Compliance) Platform

The **SecureBank GRC Platform** is an enterprise-grade financial cybersecurity management system designed to consolidate risk management, compliance tracking, security incidents, and internal audits into a single unified workspace. Engineered to comply with rigorous banking standards (SOX, PCI-DSS, ISO 27001, and SOC 2), the system features logical multi-tenant isolation, structured audit logging, granular role-based access, and automated workflow triggers. It provides compliance officers and security analysts with a real-time risk profile, automated control verification schedules, and interactive executive reporting dashboards.

---

## 1. System Architecture Overview

The system uses a decoupled, layered architecture conforming to Clean Architecture principles:

- **Frontend**: Next.js 14 SPA utilizing Tailwind CSS tokens, Zustand client state, React Query for server states, and Recharts/D3 for metrics.
- **Backend**: Python 3.11 with FastAPI for robust schemas, type validation via Pydantic, and automatic OpenAPI generation.
- **Database**: PostgreSQL 16 serving relations, JSONB questionnaires, and Row-Level Security rules. Supports local fallback to SQLite.
- **Cache**: Redis 7.0 backing SlowAPI rate limiting and session blocklists.
- **Automation Layer**: Python daemon scripts simulating MFA validation audits (`mfa_checker.py`), automated CAPA assignments (`capa_assigner.py`), and vendor risk scores (`vendor_scorer.py`).

---

## 2. Quick Start Setup

### Prerequisites
- Python 3.11+
- Node.js 18+
- Docker & Docker Compose (optional, for full-stack DB/Cache containers)

### Setup Instructions

1. **Clone & Configure Environment**:
   ```bash
   cp .env.example .env
   ```

2. **Backend Setup**:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: .\venv\Scripts\activate
   pip install -r requirements.txt
   python data/seed_db.py
   uvicorn api.main:app --reload
   ```
   *FastAPI docs will be available at: [http://localhost:8000/docs](http://localhost:8000/docs)*

3. **Frontend Setup**:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
   *Dashboard will be available at: [http://localhost:3000](http://localhost:3000)*

4. **Docker Compose Setup (Alternative)**:
   ```bash
   docker-compose up --build
   ```

---

## 3. Skills & Competencies Matrix

| GRC Competency | System Component | Technical Demonstration |
|---|---|---|
| **Risk Assessment** | `risks` DB Schema + `RiskHeatMap` UI | Automated risk score calculations ($Likelihood \times Impact$) and interactive 5x5 grouping matrices. |
| **Compliance Management** | `controls` tab layout + Framework mappings | Dynamic status checklists for SOC 2, ISO 27001, and PCI-DSS controls. |
| **Audit Trails** | `system_audit_logs` + Admin Log Viewer | Tamper-evident mutation tracking logs recording IP, timestamp, user, and action. |
| **Incident Response** | `incidents` Kanban Board + MTTR engine | Status workflow tracking, containment timestamps, and mean duration calculators. |
| **Third-Party Risk** | `vendors` assessment + `vendor_scorer.py` | Quantitative risk evaluation algorithms scanning vendor configurations. |
| **Security Hardening** | Gateway Middlewares + CSP/CORS controls | Protection against OWASP Top 10 vulnerabilities (SQLi, XSS, CSRF). |

---

## 4. Security & Cryptographic Key Rotation Policy

1. **Credential Handling**: No API keys, credentials, or encryption keys are permitted inside the codebase. All values are loaded from standard environmental configurations at runtime.
2. **Key Rotation Schedule**:
   - JWT secret keys and database access credentials must be rotated **every 90 days** or immediately upon exposure.
   - Third-party webhook secrets (e.g. Stripe signatures) must be rotated dynamically via provider dashboards.
3. **Audit History Check**: Periodically review commit histories using:
   ```bash
   git log --all --full-history -- '**/.env*'
   ```
4. **Data Isolation**: All database operations execute scoped queries utilizing user session tenant tokens, preventing cross-tenant leakage.

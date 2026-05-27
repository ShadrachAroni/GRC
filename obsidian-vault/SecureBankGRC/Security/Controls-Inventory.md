---
status: Hardened & Validated
last_updated: 2026-05-28T01:45:00Z
dependencies: [Architecture/System-Design.md]
linked_phases: [Phase-03, Phase-05, Phase-11]
---

# Security Controls Inventory

Detailed implementation status of the 15 core security controls from the **SecureBank GRC Security Implementation Guide**.

## Inventory

### 1. CORS Configuration
- **Status**: Hardened & Validated
- **Layer**: API Middleware
- **Detail**: Restrict origins to `https://myapp.com` and `https://www.myapp.com` in production, allow `localhost:3000` via `DEV_ORIGINS` toggle.

### 2. Redirect URL Validation
- **Status**: Hardened & Validated
- **Layer**: Identity / Auth Router
- **Detail**: Validate `redirect_uri` against static allow-list in `.env`. Prefix-matching is prohibited.

### 3. Supabase Storage RLS Policies
- **Status**: Hardened & Validated
- **Layer**: Database / Storage
- **Detail**: Enable RLS on `storage.objects` table. Limit SELECT, INSERT, DELETE to owner-only matching `auth.uid() = owner`. Admin override role.

### 4. Console Log & Print Statement Removal
- **Status**: Hardened & Validated
- **Layer**: Frontend / Backend
- **Detail**: ESLint `no-console` rule. Python structured logger replacing all `print()` calls in the API and script layers.

### 5. Webhook Signature Verification
- **Status**: Hardened & Validated
- **Layer**: Payment Router
- **Detail**: SHA256 HMAC payload verification using `stripe.Webhook.construct_event`. Never fallback.

### 6. Server-Side Role Authorisation (RBAC)
- **Status**: Hardened & Validated
- **Layer**: API Decorator / Security Middleware
- **Detail**: Server-side validation of user roles (Viewer, GRC Analyst, Administrator). Privileged actions require `admin` role.

### 7. Dependency Auditing
- **Status**: Hardened & Validated
- **Layer**: CI/CD
- **Detail**: Run `npm audit --audit-level=high` and `safety check` on requirements.txt on pull requests.

### 8. Password Reset Rate Limiting
- **Status**: Hardened & Validated
- **Layer**: Auth Router
- **Detail**: Limit to 3 requests per email per hour using SlowAPI. Standardize generic anti-enumeration response.

### 9. Generic Error Messages & Server logging
- **Status**: Hardened & Validated
- **Layer**: API Gateway
- **Detail**: Global exception handlers hiding detailed system tracebacks. Detailed errors logged server-side only.

### 10. JWT Expiration & Refresh Token Rotation
- **Status**: Hardened & Validated
- **Layer**: Identity
- **Detail**: 7 days access token expiry. Hashed refresh tokens with rotation and replay detection.

### 11. Endpoint Rate Limiting
- **Status**: Hardened & Validated
- **Layer**: Network / Gateway
- **Detail**: 100 req/min for public GET, 60 req/min for auth actions, 10 req/min for login.

### 12. Input Validation & Sanitization
- **Status**: Hardened & Validated
- **Layer**: API Gateway / DB
- **Detail**: Pydantic `extra = 'forbid'`, escape free text, server-side MIME check on file uploads.

### 13. Secure Key Handling
- **Status**: Hardened & Validated
- **Layer**: Infrastructure
- **Detail**: Environment variable injection, protect client bundles (no secrets in VITE_ variables).

### 14. DDoS Protection & Body Limits
- **Status**: Hardened & Validated
- **Layer**: API Middleware / Network
- **Detail**: Reject request bodies > 1MB via `PayloadSizeLimit` middleware.

### 15. Tenant Isolation
- **Status**: Hardened & Validated
- **Layer**: Database / Data Layer
- **Detail**: Composite index on `tenant_id`, scoping all queries through `get_tenant_filter` dependency.

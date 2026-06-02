# GRC Sentinel - User Operations Guide

This guide describes operational workflows, features, and interface actions for risk analysts, compliance auditors, and system administrators.

---

## 1. Risk Register & Matrix Scoring

The Risk Register module allows analysts to identify, register, and evaluate organizational security threats.

### Workflows
- **Accessing Risks**: Go to the Risks portal in the navigation sidebar.
- **Registering a Risk**: Click the **Add Risk** button to open the creation dialog. Provide a unique Risk ID (e.g. `R-101`), compile the target threat details, and identify the compliance asset.
- **Likelihood and Impact Assessment**: Set rating sliders from `1` (lowest) to `5` (highest).
- **Automated Score Mapping**: The system automatically computes the risk score ($Score = Likelihood \times Impact$). Risk severity levels are classified as:
  - **Low** (Scores 1-4): Stored under standard surveillance.
  - **Medium** (Scores 5-9): Requires scheduled review.
  - **High** (Scores 10-15): Requires formal mitigation plan.
  - **Critical** (Scores 16-25): Requires immediate escalation.

---

## 2. Compliance Tracker & Evidence Uploads

The Compliance module monitors security controls mapped directly to standard security frameworks: **SOC 2**, **ISO 27001**, and **PCI-DSS**.

### Workflows
- **Framework Navigation**: Use the tabs at the top of the interface to switch between different frameworks.
- **Updating Control Status**: For each control, change the implementation status using the dropdown selector:
  - **Not Started**: No actions taken.
  - **In Progress**: Controls are active but not completed.
  - **Implemented**: Verification complete and evidence uploaded.
- **Uploading Evidence Documentation**:
  1. Click **Manage** on the control card to open the evidence panel.
  2. Drag and drop a file or click to select a file from your machine.
  3. **Rules & Constraints**: Files must be **< 1MB** in size and carry a supported extension (**.pdf**, **.png**, **.jpg**, **.jpeg**, or **.csv**). Non-compliant uploads will be rejected.

---

## 3. Incident Management & Kanban Board

The Incident module logs, assigns, and tracks security incidents through their response lifecycles.

### Workflows
- **Creating Incidents**: Click the **Add Incident** button in the header toolbar, name the incident (e.g., *DDOS target API gateway*), select the severity, and enter a detailed logs description.
- **Lifecycle Lanes**: Incidents are organized into lanes: **Open**, **Contained**, **Resolved**, and **Closed**.
- **Interactive Drag-and-Drop**: Drag cards between columns to change their lifecycle status.
- **SLA Countdown Timer**: The system monitors elapsed minutes since detection against severity thresholds:
  - **Critical**: 2-hour SLA
  - **High**: 4-hour SLA
  - **Medium**: 8-hour SLA
  - **Low**: 24-hour SLA
  - Cards automatically display **SLA Compliant**, **SLA Warning** (at 80% duration elapsed), or **SLA Breached** tags.

---

## 4. Audits & Corrective Actions (CAPA)

The Audits module lists immutable system transaction logs and tracks Corrective and Preventive Actions (CAPA) resolving compliance findings.

### Workflows
- **Audit Logs (Admin Only)**: Displays logs of database modifications. Click **Inspect** on any log row to open the JSON Inspector modal, showing details for SIEM verification.
- **Filing Audit Findings**: Analysts can file compliance findings, mapping them to standard control IDs and indicating recommendations.
- **Initiating CAPAs**: Mapped to findings, CAPA cards display owner information, due date targets, and corrective action statements.
- **SLA Progress Indicators**: CAPA cards display progress bars indicating days remaining before the SLA target expires. If overdue, the progress bar turns red and flashes a warning tag.

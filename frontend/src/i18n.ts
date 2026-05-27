"use client";

import i18n from "i18next";
import { initReactI18next } from "react-i18next";

i18n.use(initReactI18next).init({
  lng: "en",
  fallbackLng: "en",
  interpolation: {
    escapeValue: false, // React already escapes by default
  },
  resources: {
    en: {
      translation: {
        // Audits page – Access denied
        "audits.accessDenied.title": "Access Denied",
        "audits.accessDenied.description":
          "You do not have the required permissions to view the system audit trails. Only administrators and GRC analysts can access this module.",

        // Audits page – KPI cards
        "audits.stats.totalOperations": "Total Operations",
        "audits.stats.activeUsers": "Active Users",
        "audits.stats.creations": "Creations",
        "audits.stats.deletions": "Deletions",

        // Audits page – Loading
        "audits.loading": "Loading activity logs...",

        // Audits page – Table headers
        "audits.table.timestamp": "Timestamp",
        "audits.table.user": "User",
        "audits.table.action": "Action",
        "audits.table.ipAddress": "IP Address",
        "audits.table.details": "Details",

        // Audits page – Table body / actions
        "audits.table.inspect": "Inspect",
        "audits.table.none": "None",
        "audits.table.noActivity": "No activity logged.",
        "audits.table.noMatch": "No logs match your filters.",
        "audits.table.internal": "Internal",
        "audits.table.searchPlaceholder":
          "Search by action, email, payload...",

        // Audits page – Inspector modal
        "audits.inspector.title": "Payload Inspector",
        "audits.inspector.close": "Close",
        "audits.inspector.noDetails": "No details recorded",

        // Risks page – KPI cards
        "risks.stats.totalRisks": "Total Risks",
        "risks.stats.criticalRisks": "Critical Risks",
        "risks.stats.highRisks": "High Risks",
        "risks.stats.averageRiskScore": "Average Risk Score",

        // Risks page – Actions & loading
        "risks.addRisk": "Add Risk",
        "risks.loading": "Loading risks...",
        "risks.searchPlaceholder": "Search risks, assets, threats...",

        // Risks page – Table headers
        "risks.table.riskId": "Risk ID",
        "risks.table.asset": "Asset",
        "risks.table.threat": "Threat",
        "risks.table.lxi": "L × I",
        "risks.table.score": "Score",
        "risks.table.severity": "Severity",
        "risks.table.owner": "Owner",
        "risks.table.status": "Status",
        "risks.table.actions": "Actions",

        // Risks page – Table body
        "risks.table.edit": "Edit",
        "risks.table.delete": "Delete",
        "risks.table.unassigned": "Unassigned",
        "risks.table.noRisks": "No risks registered.",
        "risks.table.noMatch": "No risks match your filter criteria.",

        // Risks page – Modal
        "risks.modal.editTitle": "Edit Risk: {{riskId}}",
        "risks.modal.createTitle": "Register New Risk",
        "risks.modal.cancel": "Cancel",
        "risks.modal.saveChanges": "Save Changes",
        "risks.modal.createRisk": "Create Risk",

        // Risks page – Form labels
        "risks.form.likelihoodLabel": "Likelihood (1-5)",
        "risks.form.impactLabel": "Impact (1-5)",
        "risks.form.mitigationLabel": "Mitigation Plan",
        "risks.form.statusLabel": "Status",
        "risks.form.statusOpen": "Open",
        "risks.form.statusMitigated": "Mitigated",
        "risks.form.mitigationPlaceholder":
          "Enforce encryption at rest, set up access reviews...",
      },
    },
  },
});

export default i18n;

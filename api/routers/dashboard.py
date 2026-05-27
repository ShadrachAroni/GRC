import csv
import io
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy import func
from sqlalchemy.orm import Session
from api.database import get_db
from api.dependencies import get_current_user
from api.models import User, Risk, Control, Incident, AuditFinding, Capa
from api.schemas import DashboardSummaryResponse

router = APIRouter()

@router.get("/summary", response_model=DashboardSummaryResponse)
def get_dashboard_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    tenant_id = current_user.tenant_id

    # 1. Risks Metrics
    total_risks = db.query(func.count(Risk.risk_id)).filter(Risk.tenant_id == tenant_id).scalar() or 0
    open_risks = db.query(func.count(Risk.risk_id)).filter(Risk.tenant_id == tenant_id, Risk.status == "Open").scalar() or 0
    avg_risk_score = db.query(func.avg(Risk.risk_score)).filter(Risk.tenant_id == tenant_id).scalar() or 0.0
    avg_risk_score = float(round(avg_risk_score, 2))

    risks_by_sev_raw = db.query(Risk.severity, func.count(Risk.risk_id)).filter(Risk.tenant_id == tenant_id).group_by(Risk.severity).all()
    risks_by_severity = {"Critical": 0, "High": 0, "Medium": 0, "Low": 0}
    for sev, count in risks_by_sev_raw:
        if sev in risks_by_severity:
            risks_by_severity[sev] = count

    # 2. Controls Metrics
    total_controls = db.query(func.count(Control.control_id)).filter(Control.tenant_id == tenant_id).scalar() or 0
    implemented_controls = db.query(func.count(Control.control_id)).filter(Control.tenant_id == tenant_id, Control.status == "Implemented").scalar() or 0
    in_progress_controls = db.query(func.count(Control.control_id)).filter(Control.tenant_id == tenant_id, Control.status == "In Progress").scalar() or 0
    not_started_controls = db.query(func.count(Control.control_id)).filter(Control.tenant_id == tenant_id, Control.status == "Not Started").scalar() or 0

    controls_by_status = {
        "Implemented": implemented_controls,
        "In Progress": in_progress_controls,
        "Not Started": not_started_controls
    }
    
    compliance_score = 0.0
    if total_controls > 0:
        compliance_score = float(round((implemented_controls / total_controls) * 100, 2))

    # Controls by framework
    controls_by_fw_raw = db.query(Control.framework, Control.status, func.count(Control.control_id)).filter(Control.tenant_id == tenant_id).group_by(Control.framework, Control.status).all()
    controls_by_framework = {}
    for fw, status_val, count in controls_by_fw_raw:
        if fw not in controls_by_framework:
            controls_by_framework[fw] = {"total": 0, "implemented": 0}
        controls_by_framework[fw]["total"] += count
        if status_val == "Implemented":
            controls_by_framework[fw]["implemented"] += count

    # Calculate compliance score per framework
    for fw in controls_by_framework:
        tot = controls_by_framework[fw]["total"]
        imp = controls_by_framework[fw]["implemented"]
        controls_by_framework[fw]["compliance_score"] = float(round((imp / tot) * 100, 2)) if tot > 0 else 0.0

    # 3. Incident Metrics
    total_incidents = db.query(func.count(Incident.incident_id)).filter(Incident.tenant_id == tenant_id).scalar() or 0
    open_incidents = db.query(func.count(Incident.incident_id)).filter(Incident.tenant_id == tenant_id, Incident.status == "Open").scalar() or 0
    active_incidents = db.query(func.count(Incident.incident_id)).filter(Incident.tenant_id == tenant_id, Incident.status.in_(["Open", "Contained"])).scalar() or 0
    avg_mttd = db.query(func.avg(Incident.mttd_minutes)).filter(Incident.tenant_id == tenant_id).scalar() or 0.0
    avg_mttr = db.query(func.avg(Incident.mttr_minutes)).filter(Incident.tenant_id == tenant_id).scalar() or 0.0
    avg_mttd = float(round(avg_mttd, 2))
    avg_mttr = float(round(avg_mttr, 2))

    incidents_by_sev_raw = db.query(Incident.severity, func.count(Incident.incident_id)).filter(Incident.tenant_id == tenant_id).group_by(Incident.severity).all()
    incidents_by_severity = {"Critical": 0, "High": 0, "Medium": 0, "Low": 0}
    for sev, count in incidents_by_sev_raw:
        if sev in incidents_by_severity:
            incidents_by_severity[sev] = count

    incidents_by_status_raw = db.query(Incident.status, func.count(Incident.incident_id)).filter(Incident.tenant_id == tenant_id).group_by(Incident.status).all()
    incidents_by_status = {"Open": 0, "Contained": 0, "Resolved": 0, "Closed": 0}
    for stat, count in incidents_by_status_raw:
        if stat in incidents_by_status:
            incidents_by_status[stat] = count

    # 4. Audit & CAPA Metrics
    open_findings = db.query(func.count(AuditFinding.finding_id)).filter(AuditFinding.tenant_id == tenant_id, AuditFinding.status == "Open").scalar() or 0
    total_findings = db.query(func.count(AuditFinding.finding_id)).filter(AuditFinding.tenant_id == tenant_id).scalar() or 0

    open_capas = db.query(func.count(Capa.capa_id)).filter(Capa.tenant_id == tenant_id, Capa.status == "Open").scalar() or 0
    total_capas = db.query(func.count(Capa.capa_id)).filter(Capa.tenant_id == tenant_id).scalar() or 0

    return {
        "open_risks_count": open_risks,
        "total_risks_count": total_risks,
        "avg_risk_score": avg_risk_score,
        "risks_by_severity": risks_by_severity,
        
        "implemented_controls_count": implemented_controls,
        "total_controls_count": total_controls,
        "compliance_score": compliance_score,
        "controls_by_status": controls_by_status,
        "controls_by_framework": controls_by_framework,
        
        "open_incidents_count": open_incidents,
        "active_incidents_count": active_incidents,
        "total_incidents_count": total_incidents,
        "avg_mttd_minutes": avg_mttd,
        "avg_mttr_minutes": avg_mttr,
        "incidents_by_severity": incidents_by_severity,
        "incidents_by_status": incidents_by_status,
        
        "open_findings_count": open_findings,
        "total_findings_count": total_findings,
        
        "open_capas_count": open_capas,
        "total_capas_count": total_capas
    }

@router.get("/export/risks")
def export_risks(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    tenant_id = current_user.tenant_id
    risks = db.query(Risk).filter(Risk.tenant_id == tenant_id).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Risk ID", "Asset", "Threat", "Likelihood", "Impact", "Risk Score", 
        "Severity", "Status", "Owner", "Department", "Review Date", "Created At"
    ])
    for risk in risks:
        writer.writerow([
            risk.risk_id,
            risk.asset,
            risk.threat,
            risk.likelihood,
            risk.impact,
            risk.risk_score,
            risk.severity,
            risk.status,
            risk.owner or "Unassigned",
            risk.department or "N/A",
            risk.review_date.isoformat() if risk.review_date else "N/A",
            risk.created_at.isoformat()
        ])
    output.seek(0)
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode("utf-8")),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=risk_register_export.csv"}
    )

@router.get("/export/capas")
def export_capas(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    tenant_id = current_user.tenant_id
    capas = db.query(Capa).filter(Capa.tenant_id == tenant_id).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "CAPA ID", "Finding ID", "Title", "Root Cause", "Action Plan", 
        "Owner", "Due Date", "Status", "Created At"
    ])
    for capa in capas:
        writer.writerow([
            capa.capa_id,
            capa.finding_id,
            capa.title,
            capa.root_cause or "N/A",
            capa.action,
            capa.owner or "Unassigned",
            capa.due_date.isoformat() if capa.due_date else "N/A",
            capa.status,
            capa.created_at.isoformat()
        ])
    output.seek(0)
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode("utf-8")),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=capa_tracker_export.csv"}
    )

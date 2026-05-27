from sqlalchemy import text
from sqlalchemy.orm import Session
from api.models import Risk, Control, Incident

def test_explain_query_plans(db_session: Session):
    # Verify index usage on Risk
    sql_risk = "EXPLAIN QUERY PLAN SELECT count(*) FROM risks WHERE tenant_id = :tenant_id AND status = :status"
    res_risk = db_session.execute(text(sql_risk), {"tenant_id": "tenant-A", "status": "Open"}).fetchall()
    
    # We expect the SQLite query planner to output a SEARCH detail mentioning our index
    details_risk = [row[3] for row in res_risk]
    assert any("idx_risks_tenant_status" in detail for detail in details_risk), f"Risk query did not use idx_risks_tenant_status: {details_risk}"
    
    # Verify index usage on Control status
    sql_control_status = "EXPLAIN QUERY PLAN SELECT count(*) FROM controls WHERE tenant_id = :tenant_id AND status = :status"
    res_control_status = db_session.execute(text(sql_control_status), {"tenant_id": "tenant-A", "status": "Implemented"}).fetchall()
    details_control_status = [row[3] for row in res_control_status]
    assert any("idx_controls_tenant_status" in detail for detail in details_control_status), f"Control status query did not use idx_controls_tenant_status: {details_control_status}"

    # Verify index usage on Control framework
    sql_control_framework = "EXPLAIN QUERY PLAN SELECT count(*) FROM controls WHERE tenant_id = :tenant_id AND framework = :framework"
    res_control_framework = db_session.execute(text(sql_control_framework), {"tenant_id": "tenant-A", "framework": "SOC2"}).fetchall()
    details_control_framework = [row[3] for row in res_control_framework]
    assert any("idx_controls_tenant_framework" in detail for detail in details_control_framework), f"Control framework query did not use idx_controls_tenant_framework: {details_control_framework}"

    # Verify index usage on Incident status
    sql_incident_status = "EXPLAIN QUERY PLAN SELECT count(*) FROM incidents WHERE tenant_id = :tenant_id AND status = :status"
    res_incident_status = db_session.execute(text(sql_incident_status), {"tenant_id": "tenant-A", "status": "Open"}).fetchall()
    details_incident_status = [row[3] for row in res_incident_status]
    assert any("idx_incidents_tenant_status" in detail for detail in details_incident_status), f"Incident status query did not use idx_incidents_tenant_status: {details_incident_status}"

    # Verify index usage on Incident severity
    sql_incident_severity = "EXPLAIN QUERY PLAN SELECT count(*) FROM incidents WHERE tenant_id = :tenant_id AND severity = :severity"
    res_incident_severity = db_session.execute(text(sql_incident_severity), {"tenant_id": "tenant-A", "severity": "Critical"}).fetchall()
    details_incident_severity = [row[3] for row in res_incident_severity]
    assert any("idx_incidents_tenant_severity" in detail for detail in details_incident_severity), f"Incident severity query did not use idx_incidents_tenant_severity: {details_incident_severity}"

import os
import sys
import uuid
import datetime

# Add the project root to sys.path so we can import from api
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from api.database import SessionLocal
from api.models import AuditFinding, Capa

def run_capa_assigner():
    db = SessionLocal()
    try:
        # Query for all open audit findings across all tenants
        open_findings = db.query(AuditFinding).filter(AuditFinding.status == "Open").all()
        capas_created = 0
        
        sla_mapping = {
            "Critical": 7,
            "High": 14,
            "Medium": 30,
            "Low": 90
        }
        
        for finding in open_findings:
            # Check if a CAPA already exists for this finding in the tenant
            existing_capa = db.query(Capa).filter(
                Capa.finding_id == finding.finding_id,
                Capa.tenant_id == finding.tenant_id
            ).first()
            
            if not existing_capa:
                capa_id = f"CAPA-{str(uuid.uuid4().hex[:8]).upper()}"
                
                # Determine SLA days based on severity
                severity = finding.severity
                sla_days = sla_mapping.get(severity, 30) # Default to 30 days if unrecognized
                
                due_date = datetime.date.today() + datetime.timedelta(days=sla_days)
                
                new_capa = Capa(
                    capa_id=capa_id,
                    tenant_id=finding.tenant_id,
                    finding_id=finding.finding_id,
                    title=f"CAPA: {finding.title}",
                    root_cause="Under investigation",
                    action=finding.recommendation or "Mitigate findings and implement long-term corrective action.",
                    owner="Unassigned",
                    due_date=due_date,
                    status="Open",
                    created_at=datetime.datetime.utcnow()
                )
                
                db.add(new_capa)
                print(f"Created CAPA '{capa_id}' for finding '{finding.finding_id}' (Severity: '{severity}', SLA: {sla_days} days)")
                capas_created += 1
            else:
                print(f"CAPA '{existing_capa.capa_id}' already exists for finding '{finding.finding_id}'")
                
        db.commit()
        print(f"CAPA Assigner complete. Created {capas_created} new CAPA items.")
        return capas_created
    except Exception as e:
        db.rollback()
        print(f"Error during CAPA assignment: {e}", file=sys.stderr)
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    run_capa_assigner()

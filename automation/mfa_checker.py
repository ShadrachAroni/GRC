import os
import sys
import uuid
import datetime

# Add the project root to sys.path so we can import from api
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from api.database import SessionLocal
from api.models import Control, AuditFinding

def run_mfa_checker():
    db = SessionLocal()
    try:
        # Query for all CC6.1 controls across all tenants
        cc61_controls = db.query(Control).filter(Control.control_id == "CC6.1").all()
        findings_created = 0
        
        for control in cc61_controls:
            if control.status != "Implemented":
                # Check if an open finding already exists for this tenant and control
                existing_finding = db.query(AuditFinding).filter(
                    AuditFinding.control_id == "CC6.1",
                    AuditFinding.tenant_id == control.tenant_id,
                    AuditFinding.status == "Open"
                ).first()
                
                if not existing_finding:
                    finding_id = f"AF-{str(uuid.uuid4().hex[:8]).upper()}"
                    new_finding = AuditFinding(
                        finding_id=finding_id,
                        tenant_id=control.tenant_id,
                        title="MFA Compliance Failure: CC6.1 is not Implemented",
                        severity="High",
                        control_id="CC6.1",
                        recommendation="Configure and enforce multi-factor authentication (MFA) for all administrative and employee accounts.",
                        status="Open",
                        detected_at=datetime.datetime.utcnow(),
                        created_at=datetime.datetime.utcnow()
                    )
                    db.add(new_finding)
                    print(f"Created open finding '{finding_id}' for tenant '{control.tenant_id}' (Control CC6.1 status is '{control.status}')")
                    findings_created += 1
                else:
                    print(f"Open finding '{existing_finding.finding_id}' already exists for tenant '{control.tenant_id}'")
            else:
                print(f"Control CC6.1 is compliant ('Implemented') for tenant '{control.tenant_id}'")
                
        db.commit()
        print(f"Checker complete. Created {findings_created} new findings.")
        return findings_created
    except Exception as e:
        db.rollback()
        print(f"Error during MFA check: {e}", file=sys.stderr)
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    run_mfa_checker()

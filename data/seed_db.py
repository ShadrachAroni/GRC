import os
import json
import datetime
from sqlalchemy.orm import Session
from api.database import SessionLocal, engine
from api.models import Base, Risk, Control, Notification

def seed_db():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        # Resolve seed file paths relative to this script
        base_dir = os.path.dirname(__file__)
        risks_path = os.path.join(base_dir, "seed_risks.json")
        controls_path = os.path.join(base_dir, "seed_controls.json")

        print("Seeding compliance controls...")
        if os.path.exists(controls_path):
            with open(controls_path, "r", encoding="utf-8") as f:
                controls_data = json.load(f)
            
            for item in controls_data:
                # Parse date if present
                last_reviewed = None
                if item.get("last_reviewed"):
                    last_reviewed = datetime.datetime.strptime(item["last_reviewed"], "%Y-%m-%d").date()

                control = db.query(Control).filter(
                    Control.control_id == item["control_id"],
                    Control.tenant_id == item["tenant_id"]
                ).first()

                if not control:
                    control = Control(
                        control_id=item["control_id"],
                        tenant_id=item["tenant_id"],
                        framework=item["framework"],
                        description=item["description"],
                        company_control=item.get("company_control"),
                        status=item.get("status", "Not Started"),
                        owner=item.get("owner"),
                        evidence_required=item.get("evidence_required"),
                        last_reviewed=last_reviewed
                    )
                    db.add(control)
                else:
                    # Update fields
                    control.framework = item["framework"]
                    control.description = item["description"]
                    control.company_control = item.get("company_control")
                    control.status = item.get("status", "Not Started")
                    control.owner = item.get("owner")
                    control.evidence_required = item.get("evidence_required")
                    control.last_reviewed = last_reviewed
            
            db.commit()
            print(f"Successfully seeded {len(controls_data)} controls.")
        else:
            print(f"Controls seed file not found at: {controls_path}")

        print("Seeding cybersecurity risks...")
        if os.path.exists(risks_path):
            with open(risks_path, "r", encoding="utf-8") as f:
                risks_data = json.load(f)

            for item in risks_data:
                # Parse date if present
                review_date = None
                if item.get("review_date"):
                    review_date = datetime.datetime.strptime(item["review_date"], "%Y-%m-%d").date()

                risk = db.query(Risk).filter(
                    Risk.risk_id == item["risk_id"],
                    Risk.tenant_id == item["tenant_id"]
                ).first()

                if not risk:
                    risk = Risk(
                        risk_id=item["risk_id"],
                        tenant_id=item["tenant_id"],
                        asset=item["asset"],
                        threat=item["threat"],
                        likelihood=item["likelihood"],
                        impact=item["impact"],
                        risk_score=item["risk_score"],
                        severity=item["severity"],
                        mitigation=item.get("mitigation"),
                        status=item.get("status", "Open"),
                        owner=item.get("owner"),
                        department=item.get("department"),
                        review_date=review_date
                    )
                    db.add(risk)
                else:
                    # Update fields
                    risk.asset = item["asset"]
                    risk.threat = item["threat"]
                    risk.likelihood = item["likelihood"]
                    risk.impact = item["impact"]
                    risk.risk_score = item["risk_score"]
                    risk.severity = item["severity"]
                    risk.mitigation = item.get("mitigation")
                    risk.status = item.get("status", "Open")
                    risk.owner = item.get("owner")
                    risk.department = item.get("department")
                    risk.review_date = review_date

            db.commit()
            print(f"Successfully seeded {len(risks_data)} risks.")
        else:
            print(f"Risks seed file not found at: {risks_path}")

        print("Seeding system notifications...")
        mock_notifications = [
            {
                "tenant_id": "tenant-A",
                "title": "MFA Compliance Failure",
                "message": "Control CC6.1 failed compliance checks. Please configure TOTP MFA for administrative accounts immediately.",
                "severity": "Critical",
                "type": "compliance",
                "channels": "toast,email,push"
            },
            {
                "tenant_id": "tenant-A",
                "title": "Incident Escalation SLA Breach",
                "message": "Incident #1004 is approaching its SLA response threshold. Action required by Assigned Owner.",
                "severity": "High",
                "type": "incident",
                "channels": "toast,email"
            },
            {
                "tenant_id": "tenant-A",
                "title": "System Audit Log Cleared Alert",
                "message": "User admin@securebank.com downloaded raw system audit logs.",
                "severity": "Info",
                "type": "audit",
                "channels": "toast"
            },
            {
                "tenant_id": "default-tenant",
                "title": "Welcome to SecureBank GRC",
                "message": "Get started by mapping controls and checking your enterprise risk posture.",
                "severity": "Info",
                "type": "system",
                "channels": "toast"
            }
        ]

        for item in mock_notifications:
            existing = db.query(Notification).filter(
                Notification.tenant_id == item["tenant_id"],
                Notification.title == item["title"]
            ).first()
            if not existing:
                notif = Notification(
                    tenant_id=item["tenant_id"],
                    title=item["title"],
                    message=item["message"],
                    severity=item["severity"],
                    type=item["type"],
                    channels=item["channels"],
                    is_read=False,
                    created_at=datetime.datetime.utcnow()
                )
                db.add(notif)
        db.commit()
        print("Successfully seeded system notifications.")

    except Exception as e:
        db.rollback()
        print(f"Error during seeding: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    seed_db()

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from api.database import get_db
from api.dependencies import get_current_user, RoleChecker
from api.models import User, Notification
from api.schemas import NotificationResponse, NotificationUpdate
from typing import List
import datetime

router = APIRouter()

@router.get("/", response_model=List[NotificationResponse])
def list_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieve all notifications scoped to the current user's tenant, ordered by creation date desc."""
    return db.query(Notification).filter(
        Notification.tenant_id == current_user.tenant_id
    ).order_by(Notification.created_at.desc()).all()

@router.patch("/{notification_id}", response_model=NotificationResponse)
def update_notification(
    notification_id: int,
    body: NotificationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a specific notification's status (e.g. marking it as read)."""
    notification = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.tenant_id == current_user.tenant_id
    ).first()
    
    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found"
        )
        
    update_data = body.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(notification, key, value)
        
    db.commit()
    db.refresh(notification)
    return notification

@router.post("/mark-all-read")
def mark_all_notifications_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Mark all notifications for the tenant as read."""
    unread_notifications = db.query(Notification).filter(
        Notification.tenant_id == current_user.tenant_id,
        Notification.is_read == False
    ).all()
    
    for notification in unread_notifications:
        notification.is_read = True
        
    db.commit()
    return {"message": f"Successfully marked {len(unread_notifications)} notifications as read"}

def dispatch_notification(
    db: Session,
    tenant_id: str,
    title: str,
    message: str,
    severity: str = "Info",
    type: str = "system",
    channels: str = "toast"
) -> Notification:
    """
    Utility function to create a new notification record in the database
    and log simulated dispatch messages for external channels (email, push).
    """
    new_notif = Notification(
        tenant_id=tenant_id,
        title=title,
        message=message,
        severity=severity,
        type=type,
        is_read=False,
        channels=channels,
        created_at=datetime.datetime.utcnow()
    )
    db.add(new_notif)
    db.commit()
    db.refresh(new_notif)
    
    # Simulate delivery channels
    channel_list = [c.strip().lower() for c in channels.split(",")]
    for channel in channel_list:
        if channel == "email":
            print(f"[SIMULATED EMAIL ALERT] To: administrator@tenant.com | Subject: {title} | Message: {message}")
        elif channel == "push":
            print(f"[SIMULATED PUSH NOTIFICATION] Title: {title} | Message: {message}")
            
    return new_notif

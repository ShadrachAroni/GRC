from fastapi import APIRouter, Depends, HTTPException, Request, Header, status
import stripe
from api.config import settings
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

@router.post("/webhook")
async def stripe_webhook(request: Request, stripe_signature: str = Header(None)):
    if not stripe_signature:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing stripe-signature header"
        )
    
    payload = await request.body()
    
    try:
        event = stripe.Webhook.construct_event(
            payload, stripe_signature, settings.STRIPE_WEBHOOK_SECRET
        )
    except ValueError as e:
        logger.error(f"Invalid payload for Stripe webhook: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid payload"
        )
    except stripe.error.SignatureVerificationError as e:
        logger.error(f"Invalid signature for Stripe webhook: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid signature"
        )
    
    logger.info(f"Received stripe event: {event['type']}")
    
    return {"status": "success"}


@router.post("/webhook/flutterwave")
async def flutterwave_webhook(request: Request, verif_hash: str = Header(None)):
    if not verif_hash:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing verif-hash header"
        )
    
    if verif_hash != settings.FLUTTERWAVE_WEBHOOK_SECRET:
        logger.error("Invalid signature for Flutterwave webhook")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid signature"
        )
    
    try:
        payload = await request.json()
    except Exception as e:
        logger.error(f"Invalid JSON payload for Flutterwave webhook: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid payload"
        )
    
    logger.info(f"Received Flutterwave event: {payload.get('event')}")
    
    return {"status": "success"}

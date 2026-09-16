import logging
from typing import Dict, Any
from twilio.rest import Client
from twilio.base.exceptions import TwilioRestException
from app.config import settings

logger = logging.getLogger(__name__)

def send_alert_sms(alert_doc: dict) -> Dict[str, Any]:
    """
    Sends an SMS notification for high/critical alerts.
    Supports mock mode to prevent sending real messages during development.
    """
    if not settings.SMS_ENABLED:
        return {"sms_sent": False, "sms_status": "Disabled"}

    # Format a concise SMS
    timestamp = alert_doc.get("created_at", "Unknown")
    if hasattr(timestamp, "isoformat"):
        timestamp = timestamp.strftime("%H:%M")
        
    message_body = (
        f"SHADOWPULSE ALERT\n"
        f"Severity: {alert_doc.get('severity', 'UNKNOWN')}\n"
        f"Threat Score: {alert_doc.get('threat_score', 0)}%\n"
        f"Time: {timestamp}\n\n"
        f"Suspicious activity detected. Check dashboard."
    )

    if settings.SMS_MODE.lower() == "mock":
        print("\n" + "="*40)
        print("[MOCK SMS]")
        print(f"To: {settings.ALERT_PHONE_NUMBER}")
        print(f"Message:\n{message_body}")
        print("="*40 + "\n")
        return {"sms_sent": True, "sms_status": "Mock SMS Sent"}

    # Live Mode
    try:
        client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
        message = client.messages.create(
            body=message_body,
            from_=settings.TWILIO_PHONE_NUMBER,
            to=settings.ALERT_PHONE_NUMBER
        )
        logger.info(f"SMS sent successfully. SID: {message.sid}")
        return {"sms_sent": True, "sms_status": "Sent"}
    except TwilioRestException as e:
        logger.error(f"Twilio API Error sending SMS: {str(e)}")
        return {"sms_sent": False, "sms_status": "Failed (API Error)"}
    except Exception as e:
        logger.error(f"Unexpected error sending SMS: {str(e)}")
        return {"sms_sent": False, "sms_status": "Failed (Internal Error)"}

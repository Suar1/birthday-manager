"""Gmail OAuth2 and App Password email sending utilities."""
import smtplib
import urllib.request
import urllib.parse
import urllib.error
import json
import base64
from typing import Tuple, Optional
from email.message import EmailMessage
from email.mime.multipart import MIMEMultipart


def fetch_access_token(client_id: str, client_secret: str, refresh_token: str) -> str:
    """
    Fetch OAuth2 access token from Google using refresh token.
    
    Args:
        client_id: Google OAuth2 client ID
        client_secret: Google OAuth2 client secret
        refresh_token: OAuth2 refresh token
        
    Returns:
        Access token string
        
    Raises:
        Exception: If token fetch fails
    """
    token_url = "https://oauth2.googleapis.com/token"
    
    data = urllib.parse.urlencode({
        "client_id": client_id,
        "client_secret": client_secret,
        "refresh_token": refresh_token,
        "grant_type": "refresh_token"
    }).encode("utf-8")
    
    req = urllib.request.Request(token_url, data=data, method="POST")
    req.add_header("Content-Type", "application/x-www-form-urlencoded")
    
    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            result = json.loads(response.read().decode("utf-8"))
            if "access_token" not in result:
                raise Exception(f"Token response missing access_token: {result.get('error', 'Unknown error')}")
            return result["access_token"]
    except urllib.error.HTTPError as e:
        error_body = e.read().decode("utf-8") if e.fp else "Unknown error"
        try:
            error_json = json.loads(error_body)
            error_msg = error_json.get("error_description", error_json.get("error", "Unknown error"))
        except:
            error_msg = error_body
        raise Exception(f"Failed to fetch access token: {error_msg}")
    except Exception as e:
        raise Exception(f"Failed to fetch access token: {str(e)}")


def build_xoauth2_string(email: str, access_token: str) -> str:
    """
    Build XOAUTH2 authentication string for SMTP.
    
    Args:
        email: Gmail address
        access_token: OAuth2 access token
        
    Returns:
        Base64-encoded XOAUTH2 string
    """
    auth_string = f"user={email}\x01auth=Bearer {access_token}\x01\x01"
    return base64.b64encode(auth_string.encode("utf-8")).decode("utf-8")


def send_gmail_app_password(
    smtp_server: str,
    smtp_port: int,
    smtp_email: str,
    smtp_password: str,
    msg,
    timeout: int = 20
) -> None:
    """
    Send email via Gmail SMTP using App Password authentication.
    Supports both STARTTLS (587) and SSL (465).
    
    Args:
        smtp_server: SMTP server address
        smtp_port: SMTP port (587 for STARTTLS, 465 for SSL)
        smtp_email: Gmail address
        smtp_password: Gmail App Password
        msg: EmailMessage or MIMEMultipart object to send
        timeout: Connection timeout in seconds
        
    Raises:
        smtplib.SMTPException: If sending fails
    """
    if smtp_port == 465:
        # Use SSL
        with smtplib.SMTP_SSL(smtp_server, smtp_port, timeout=timeout) as s:
            s.login(smtp_email, smtp_password)
            s.send_message(msg)
    else:
        # Use STARTTLS (default for 587)
        with smtplib.SMTP(smtp_server, smtp_port, timeout=timeout) as s:
            s.ehlo()
            s.starttls()
            s.ehlo()
            s.login(smtp_email, smtp_password)
            s.send_message(msg)


def send_gmail_oauth2(
    smtp_server: str,
    smtp_port: int,
    email: str,
    access_token: str,
    msg,
    timeout: int = 20
) -> None:
    """
    Send email via Gmail SMTP using XOAUTH2 authentication.
    
    Args:
        smtp_server: SMTP server address
        smtp_port: SMTP port
        email: Gmail address
        access_token: OAuth2 access token
        msg: EmailMessage or MIMEMultipart object to send
        timeout: Connection timeout in seconds
        
    Raises:
        smtplib.SMTPException: If sending fails
    """
    xoauth2_string = build_xoauth2_string(email, access_token)
    
    with smtplib.SMTP(smtp_server, smtp_port, timeout=timeout) as s:
        s.ehlo()
        s.starttls()
        s.ehlo()
        # Authenticate using XOAUTH2
        code, response = s.docmd("AUTH", "XOAUTH2 " + xoauth2_string)
        if code != 235:
            raise smtplib.SMTPAuthenticationError(code, response)
        s.send_message(msg)


def map_smtp_error(error: Exception) -> Tuple[str, int, str]:
    """
    Map SMTP exceptions to HTTP status codes and user-friendly messages.
    
    Returns:
        Tuple of (error_code, http_status, hint_message)
    """
    error_str = str(error)
    error_code = getattr(error, 'smtp_code', None)
    
    # Authentication errors
    if isinstance(error, smtplib.SMTPAuthenticationError) or error_code in [535, 534]:
        if error_code == 534 or "Application-specific password required" in error_str:
            return ("SMTP_AUTH_FAILED", 401, "Gmail requires an App Password or OAuth2. Use OAuth2 (recommended) or generate an App Password.")
        return ("SMTP_AUTH_FAILED", 401, "SMTP authentication failed. Check your credentials.")
    
    # Connection errors
    if isinstance(error, (smtplib.SMTPConnectError, smtplib.SMTPServerDisconnected, ConnectionError)):
        return ("SMTP_CONNECTION_FAILED", 502, "Failed to connect to SMTP server. Check server address and port.")
    
    # Recipient/sender errors
    if isinstance(error, smtplib.SMTPRecipientsRefused):
        return ("SMTP_RECIPIENT_REFUSED", 400, "Recipient email address was refused by the server.")
    if isinstance(error, smtplib.SMTPSenderRefused):
        return ("SMTP_SENDER_REFUSED", 400, "Sender email address was refused by the server.")
    
    # Generic SMTP errors
    if isinstance(error, smtplib.SMTPException):
        return ("SMTP_ERROR", 502, f"SMTP error: {error_str[:100]}")
    
    # Generic errors
    return ("INTERNAL_ERROR", 502, "An unexpected error occurred while sending email.")


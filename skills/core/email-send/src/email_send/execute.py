"""Email Send skill - sends emails via SMTP."""

from __future__ import annotations

import os
import smtplib
import uuid
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Any


def execute(
    to: str,
    subject: str,
    body: str,
    html: bool = False,
) -> dict[str, Any]:
    """Send an email via SMTP.

    Args:
        to: Recipient email address.
        subject: Email subject line.
        body: Email body content.
        html: If ``True``, send the body as HTML (default ``False``).

    Returns:
        A dict with ``success``, ``message_id``, and ``error``.
    """
    smtp_host = os.environ.get("SMTP_HOST")
    smtp_port = os.environ.get("SMTP_PORT")
    smtp_user = os.environ.get("SMTP_USER")
    smtp_password = os.environ.get("SMTP_PASSWORD")

    if not all([smtp_host, smtp_port, smtp_user, smtp_password]):
        return {
            "success": False,
            "message_id": "",
            "error": (
                "SMTP not configured. Set SMTP_HOST, SMTP_PORT, "
                "SMTP_USER, SMTP_PASSWORD env vars."
            ),
        }

    message_id = f"<{uuid.uuid4()}@{smtp_host}>"

    msg = MIMEMultipart("alternative")
    msg["From"] = smtp_user
    msg["To"] = to
    msg["Subject"] = subject
    msg["Message-ID"] = message_id

    content_type = "html" if html else "plain"
    msg.attach(MIMEText(body, content_type, "utf-8"))

    try:
        with smtplib.SMTP(smtp_host, int(smtp_port), timeout=30) as server:
            server.ehlo()
            server.starttls()
            server.ehlo()
            server.login(smtp_user, smtp_password)
            server.sendmail(smtp_user, [to], msg.as_string())

        return {
            "success": True,
            "message_id": message_id,
            "error": "",
        }
    except smtplib.SMTPException as exc:
        return {
            "success": False,
            "message_id": "",
            "error": f"SMTP error: {exc}",
        }
    except Exception as exc:
        return {
            "success": False,
            "message_id": "",
            "error": f"Error sending email: {exc}",
        }

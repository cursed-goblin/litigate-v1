"""Risk report delivery over Resend.

The report is built from findings the rule engine already proved, so an
email can never contain a claim that is not visible in the application.
Every interpolated value is HTML escaped: clause text is attacker-controlled
in the general case, and it is being placed straight into a mail body.
"""

import html
from datetime import datetime, timezone

import httpx

from .config import settings

RESEND_URL = "https://api.resend.com/emails"

_TIMEOUT = httpx.Timeout(20.0, connect=10.0)

# Executives do not read long tables. The rest stay in the app.
MAX_ROWS = 12

BAND_COLOUR = {
    "high": "#d92d20",
    "medium": "#dc6803",
    "low": "#039855",
}


class MailError(RuntimeError):
    pass


def configured() -> bool:
    """True when a key and a sender are both present."""
    return bool(settings.resend_api_key and settings.alert_from)


def _rupees(value) -> str:
    try:
        amount = int(value or 0)
    except (TypeError, ValueError):
        return "not stated"
    if amount <= 0:
        return "not stated"

    digits = str(amount)
    if len(digits) <= 3:
        return "INR " + digits

    head, tail = digits[:-3], digits[-3:]
    groups = []
    while len(head) > 2:
        groups.insert(0, head[-2:])
        head = head[:-2]
    if head:
        groups.insert(0, head)
    return "INR " + ",".join(groups) + "," + tail


def _cell(content: str, extra: str = "") -> str:
    base = "padding:10px 12px;border-bottom:1px solid #e6e8ec;font-size:13px;"
    return '<td style="' + base + extra + '">' + content + "</td>"


def _rows(findings: list[dict]) -> str:
    order = {"high": 3, "medium": 2, "low": 1}
    ranked = sorted(
        findings,
        key=lambda item: order.get(str(item.get("severity")), 0),
        reverse=True,
    )

    out = []
    for finding in ranked[:MAX_ROWS]:
        severity = str(finding.get("severity", "low"))
        colour = BAND_COLOUR.get(severity, "#667085")
        clause = str(finding.get("clauseNumber") or "missing")

        out.append(
            "<tr>"
            + _cell(
                '<strong style="color:'
                + colour
                + '">'
                + html.escape(severity.upper())
                + "</strong>",
                "width:80px;",
            )
            + _cell(html.escape(clause), "width:70px;color:#667085;")
            + _cell(
                "<strong>"
                + html.escape(str(finding.get("title", "")))
                + "</strong><br>"
                + '<span style="color:#667085">'
                + html.escape(str(finding.get("observed", "")))
                + "</span>"
            )
            + "</tr>"
        )

    return "".join(out)


def build_report(filename: str, summary: dict, findings: list[dict]) -> tuple[str, str]:
    """Return the subject line and HTML body for a contract."""
    band = str(summary.get("riskBand", "low"))
    colour = BAND_COLOUR.get(band, "#667085")
    high = int(summary.get("high", 0) or 0)
    total = int(summary.get("total", 0) or 0)
    safe_name = html.escape(filename or "contract")

    subject = (
        "["
        + band.upper()
        + " RISK] "
        + (filename or "Contract")
        + " - "
        + str(high)
        + " high severity issues"
    )

    stamp = datetime.now(timezone.utc).strftime("%d %b %Y, %H:%M UTC")
    hidden = max(0, total - MAX_ROWS)

    body = (
        '<div style="font-family:Helvetica,Arial,sans-serif;background:#f5f6f8;padding:24px">'
        + '<div style="max-width:640px;margin:0 auto;background:#ffffff;'
        + 'border:1px solid #e6e8ec;border-radius:12px;overflow:hidden">'
        + '<div style="padding:20px 24px;border-bottom:1px solid #e6e8ec">'
        + '<p style="margin:0;font-size:12px;color:#667085">Litigate contract review</p>'
        + '<h1 style="margin:6px 0 0;font-size:18px;color:#101828">'
        + safe_name
        + "</h1>"
        + '<p style="margin:6px 0 0;font-size:12px;color:#98a2b3">Analysed '
        + stamp
        + "</p>"
        + "</div>"
        + '<div style="padding:20px 24px;border-bottom:1px solid #e6e8ec">'
        + '<span style="display:inline-block;padding:6px 12px;border-radius:999px;'
        + "background:"
        + colour
        + ';color:#ffffff;font-size:12px;font-weight:bold">'
        + html.escape(band.upper())
        + " RISK &middot; SCORE "
        + html.escape(str(summary.get("riskScore", 0)))
        + "</span>"
        + '<table style="width:100%;margin-top:16px;border-collapse:collapse;font-size:13px">'
        + '<tr><td style="padding:4px 0;color:#667085">Contract value</td>'
        + '<td style="padding:4px 0;text-align:right"><strong>'
        + _rupees(summary.get("contractValue"))
        + "</strong></td></tr>"
        + '<tr><td style="padding:4px 0;color:#667085">Liability cap</td>'
        + '<td style="padding:4px 0;text-align:right;color:#d92d20"><strong>'
        + _rupees(summary.get("liabilityCap"))
        + "</strong></td></tr>"
        + '<tr><td style="padding:4px 0;color:#667085">Issues found</td>'
        + '<td style="padding:4px 0;text-align:right"><strong>'
        + str(total)
        + " ("
        + str(high)
        + " high)</strong></td></tr>"
        + '<tr><td style="padding:4px 0;color:#667085">Evidence verified</td>'
        + '<td style="padding:4px 0;text-align:right"><strong>'
        + str(summary.get("grounded", 0))
        + " of "
        + str(total)
        + "</strong></td></tr>"
        + "</table></div>"
        + '<table style="width:100%;border-collapse:collapse">'
        + _rows(findings)
        + "</table>"
        + '<div style="padding:16px 24px;font-size:12px;color:#98a2b3">'
        + (
            "Showing the " + str(MAX_ROWS) + " most severe of " + str(total) + " issues. "
            if hidden
            else ""
        )
        + "Every issue above was measured against "
        + html.escape(str(summary.get("playbook", "the playbook")))
        + " and quoted from the contract text."
        + "</div></div></div>"
    )

    return subject, body


async def send_report(
    recipients: list[str],
    filename: str,
    summary: dict,
    findings: list[dict],
) -> dict:
    if not configured():
        raise MailError("email is not configured on the server")
    if not recipients:
        raise MailError("no recipient was supplied")

    subject, body = build_report(filename, summary, findings)

    payload = {
        "from": settings.alert_from,
        "to": recipients,
        "subject": subject,
        "html": body,
    }

    async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
        response = await client.post(
            RESEND_URL,
            headers={"Authorization": "Bearer " + settings.resend_api_key},
            json=payload,
        )

    if response.status_code >= 400:
        detail = response.text[:240].replace("\n", " ")
        raise MailError("resend " + str(response.status_code) + ": " + detail)

    data = response.json() if response.content else {}
    return {"sent": True, "id": data.get("id"), "recipients": recipients}


async def send_quietly(
    recipients: list[str],
    filename: str,
    summary: dict,
    findings: list[dict],
) -> None:
    """Background variant. An email failure must never fail an upload."""
    try:
        await send_report(recipients, filename, summary, findings)
    except (MailError, httpx.HTTPError):
        return

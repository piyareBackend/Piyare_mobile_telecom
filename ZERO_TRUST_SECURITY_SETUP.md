# Zero-Trust Admin Security Setup

The admin flow is now credential -> OTP -> short-lived server-side session. No universal OTP or developer bypass exists.

## Required OTP delivery configuration

Set these Google Apps Script Script Properties before production use:

- `PMT_OTP_PEPPER`: long random secret used when hashing OTP challenges. Rotate only with planned invalidation of outstanding OTPs.
- `PMT_ADMIN_OTP_EMAIL`: trusted administrator email address. If set, OTP is delivered with Apps Script MailApp.

Alternative trusted delivery:

- `PMT_ADMIN_OTP_PHONE`: trusted 10-digit Indian mobile number.
- `PMT_WA_WEBHOOK_URL`: existing trusted WhatsApp webhook URL. It must be server-side only.

The backend never returns the OTP and never stores plaintext OTP values.

## Session policy

- Maximum session lifetime: 30 minutes.
- Inactivity timeout: 15 minutes.
- OTP lifetime: 5 minutes.
- OTP verification attempts: 5.
- OTP resend cooldown: 60 seconds.
- Credential failures: 8 attempts per username within 15 minutes.
- High-risk step-up grant: 5 minutes and one-time use.

## Storage

The backend creates these Sheets only when first used:

- `AdminSessions` — hashed session identifiers, administrator reference, timestamps and revocation state.
- `AdminAuditLog` — security events and safe metadata.

Existing `Users`, `StaffActivity`, business sheets and records are preserved.

## High-risk actions

The server requires a fresh OTP for destructive, backup, administrator-management and security-sensitive actions, including product deletion, backup restore, administrator creation/update, permission changes, security configuration changes and signing out all other sessions.

## Important deployment note

The Apps Script backend is deployed by the existing `pmt-production-sync.yml` workflow only when `CLASPRC_JSON` and `CLASP_JSON` secrets are configured. OTP delivery cannot be claimed as production-ready until one of the trusted delivery channels above is configured and a real OTP request/verification is tested.

The SMS Bridge is an administrative client. Its existing background token model remains compatible with server sessions while a valid token is present, but its initial credential enrollment must complete OTP verification. A new APK build/install should be treated as required before distributing the updated security flow to devices that need to enroll again.

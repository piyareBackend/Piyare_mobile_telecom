# Piyare Mobile Telecom — Backend Architecture

## Canonical architecture
- `backend/Code.gs` is the **only HTTP router** and contains the authoritative `doGet` / `doPost`.
- `backend/ZZZ_AccessControl.gs` contains staff identity, permissions and audit helpers only. It intentionally contains **no** `doGet` / `doPost`.
- `backend/ZZ_POSBillingV2.gs` contains the POS stock/idempotency implementation used by the canonical router.

This prevents Apps Script file-order/router collisions where a second `doGet` or `doPost` silently changes which API implementation is actually executed.

## Business rules
- Revenue uses only `Confirmed`, `Processing`, `Shipped`, `Delivered`, and `Completed` orders.
- Pending, Rejected and Cancelled orders do not count as revenue.
- Rejection/cancellation restores reserved stock once.
- Website order creation is rate-limited and stock reservation is protected by `LockService`.
- POS billing uses an idempotency key so retrying the same bill does not deduct stock twice.
- Staff actions are permission-checked server-side.
- `orders_edit` controls order status changes; `repairs` / `repairs_edit` control repair operations according to the active permission map.

## SMS bridge architecture
The free SMS transport remains the dedicated Android sender + shop SIM. The bridge stores its credentials/session material using Android Keystore and retries failed SMS operations. It does not use WhatsApp redirects as the customer SMS transport.

The server remains the source of truth for orders and repairs; the sender device is a transport worker, not the business database.

## Deployment
After backend changes, deploy a new Apps Script web-app version from the Apps Script editor and verify the deployed URL used by the website/worker still points to the current deployment.

Use Apps Script Executions to verify errors after deployment.

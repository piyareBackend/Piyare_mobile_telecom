# PMT SMS Bridge — ₹0 software cost

This companion Android app uses the shop phone's own SIM to send customer SMS. No paid SMS gateway is used.

## What it sends
- POS bill created: customer bill notification.
- Website order: customer notification when the order reaches `Confirmed`.
- Repair: customer notification when its status changes from `Pending` to an active status, plus later status changes such as `Ready` and `Completed`.

## Duplicate protection
Sent order IDs and repair ID/status pairs are stored locally on the bridge phone. Re-polling or refreshing the admin website does not resend the same event.

## Setup
1. Build/install the Android app from this `sms-bridge` folder (Android Studio, sideloaded APK is fine).
2. On the shop Android phone, grant SMS permission.
3. Sign in to PMT Admin and use an active admin session token in the bridge setup screen.
4. Tap `Save & Start` once. Keep the shop phone powered, connected to the internet, and allow the app to run in the background.
5. After setup, the bridge polls every 15 seconds and sends qualifying messages automatically.

## Important limitations
- The sender shown to the customer is the SIM's phone number. A custom sender name/hidden number requires a carrier/SMS provider and is not part of this ₹0 solution.
- Android background/battery restrictions can stop background work on some devices; disable battery optimization for this app on the shop phone.
- SMS charges, if any, are whatever the shop's mobile operator applies to the SIM plan. The software itself has no gateway/API fee.
- The PMT admin token is sensitive. Do not share it or publish it.

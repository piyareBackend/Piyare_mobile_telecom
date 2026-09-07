# PMT SMS Bridge — ₹0 software cost

This companion Android app uses the shop phone's own SIM to send customer SMS. No paid SMS gateway is used.

## What it sends
- POS bill created: customer bill notification.
- Website order: customer notification when the order reaches `Confirmed`.
- Repair: customer notification when its status changes from `Pending` to an active status, plus later status changes such as `Ready` and `Completed`.

## Automatic operation
- The bridge stores a dedicated PMT admin/staff username and password and refreshes the short-lived PMT session automatically, so the shop does not need to re-enter a session token every few hours.
- The first scan establishes a baseline and does not send old existing records. New POS bills and later order/repair state changes are sent automatically.
- Order and repair events are locally deduplicated so the same event is not repeatedly sent.
- The app starts as a foreground service and can restart after device reboot/package update on supported Android versions.

## Setup
1. Build/install the Android app from this `sms-bridge` folder (Android Studio or sideloaded APK).
2. On the shop Android phone, grant SMS permission (and notification permission when Android asks).
3. Enter a dedicated PMT Admin/Manager/Support account created for the bridge, then tap `Save & Start` once.
4. Keep the shop phone powered, connected to the internet, and allow the app to run without battery restrictions.
5. The bridge checks every 15 seconds and sends qualifying messages automatically.

## Important limitations
- The sender shown to the customer is the SIM's phone number. A custom sender name/hidden number requires a carrier/SMS provider and is not part of this ₹0 solution.
- Android background/battery restrictions can vary by device; the shop phone must allow the bridge to keep running.
- SMS charges, if any, are whatever the shop's mobile operator applies to the SIM plan. The software itself has no gateway/API fee.
- Use a dedicated PMT account for the bridge rather than the owner's everyday credentials. The credentials are stored locally on the shop phone.
- The APK targets Android 14 (API 34) so the dedicated bridge can keep using its foreground service on Android 15 devices without the Android 15 target-35 `dataSync` six-hour timeout. If this app is ever distributed through Google Play, its foreground-service declaration and target choice should be reviewed against current Play requirements.

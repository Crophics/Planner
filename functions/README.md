# Taskplus push digests

## One-time Firebase Console setup

1. **Cloud Messaging → Web Push certificates**  
   Generate a key pair and copy the **Key pair** string (VAPID).

2. Paste it into `js/fcm-config.js` as `vapidKey`.

3. **Blaze plan** is required for scheduled Cloud Functions.

4. Deploy:
   ```bash
   npm i -g firebase-tools
   firebase login
   firebase use planner-88ab8
   cd functions && npm i && cd ..
   firebase deploy --only functions
   ```

5. Enable **Cloud Messaging API** in Google Cloud if prompted.

The function runs hourly (aligned to the top of the hour) and sends a digest once per local day, at whichever hour the user picked in-app (`fcm.notifyHour`, default 08:00), based on the timezone stored with their FCM token.
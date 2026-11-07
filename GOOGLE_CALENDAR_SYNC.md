# Automatic hall booking calendar sync

The booking app can send only the booking function, hall, hall address, date, and time to a private Google Calendar event. Customer names, telephone numbers, and payments are not included. New bookings create an event; edits update the linked event; deleting a booking deletes its linked event. The app continues to save the booking if Calendar is temporarily unavailable and displays a sync warning.

## Connect the calendar

1. Sign in to [Google Apps Script](https://script.google.com/) with the same Google account used for the existing hall booking events.
2. Create a project and paste in `scripts/google-calendar-sync.gs`.
3. In **Project Settings → Script properties**, add `APH_SYNC_SECRET` with a new random value of at least 32 characters. Do not send or commit this value.
4. In **Project Settings**, set the time zone to `Asia/Kolkata`.
5. Select **Deploy → New deployment → Web app**. Choose **Execute as: Me** and the narrowest available access that lets the website reach the endpoint. Google will ask you to authorize calendar access; approve it for this project.
6. Copy the Web app URL. In the website hosting settings, add `GOOGLE_CALENDAR_WEBHOOK_URL` with that URL and `GOOGLE_CALENDAR_WEBHOOK_SECRET` with the same secret from step 3.
7. Restart/redeploy the website so it reads the settings. Make one test booking, edit its time, and delete it to verify create/update/delete sync.

The Apps Script matches the existing manually added booking events by their exact title, hall, date, and time when possible, then records the event ID privately for later changes. Do not enable public calendar sharing for the endpoint or place the secret in browser code.

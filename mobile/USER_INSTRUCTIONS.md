# CityFix Citizen Guide: Secure Hardware & Maps Configuration

This guide lists the exact steps required from your side to configure Google Maps securely, prepare your local dev environment, and test the new features without risking credentials leaks!

---

## 1. Google Maps API Key Setup (Securely Isolated)

To prevent security breaches, **we have set up secure API key injection**. Your private Google Maps API key is kept strictly in `local.properties` (which is in `.gitignore` and never committed to Git), and is dynamically injected by Gradle during compile time!

### Android Secure Configuration
1. Open the [mobile/android/local.properties](file:///c:/collage/Project/CityFix/mobile/android/local.properties) file.
2. Add a new line at the bottom with your key:
   ```properties
   MAPS_API_KEY=AIzaSyYourActualGoogleMapsKeyHere
   ```
3. Save the file! 

That's it! Gradle will automatically read `MAPS_API_KEY` from your local file during compilation and inject it securely as the `${mapsApiKey}` placeholder inside [AndroidManifest.xml](file:///c:/collage/Project/CityFix/mobile/android/app/src/main/AndroidManifest.xml). Your key will never be committed or exposed in git history!

### iOS Setup (For future iOS deployment)
If you build for iOS in the future:
1. Create a `Secrets.xcconfig` file under `ios/Flutter/` (ensure it is ignored in `.gitignore`).
2. Add your key: `MAPS_API_KEY=AIzaSyYourActualKey`.
3. Reference `$(MAPS_API_KEY)` inside `Info.plist` and load it inside `AppDelegate.swift` dynamically.

---

## 2. Dev Environment Preparation

Before launching the mobile app, make sure your backend is active:

1. **Start the Backend Server**:
   Ensure MongoDB and backend are running:
   ```powershell
   # In a separate terminal
   cd c:\collage\Project\CityFix\backend
   npm run dev
   ```
2. **Android Emulator Port Forwarding**:
   If testing on an Android Emulator, forward your localhost port so the emulator can access port `5000`:
   ```powershell
   adb reverse tcp:5000 tcp:5000
   ```

---

## 3. Graceful Windows Desktop Fallbacks (Built-in)

Because the standard Windows desktop runner does not have a real GPS hardware sensor or native Google Maps integration, **we built in elegant automatic fallbacks** so you can test 100% of the features on your PC without a physical phone!

* **GPS Capture on Windows**: 
  Clicking the **"Capture GPS Location"** button will instantly simulate GPS coordinates centering in **Bengaluru (12.9716, 77.5946)**, trigger a mock reverse-geocoding preview address, and render a beautiful, premium visual simulated map container.
* **Camera/Gallery Pickers on Windows**:
  Clicking **"Take Photo"** or **"Gallery"** on Windows will fall back to letting you select any image file from your PC or load pre-seeded mock images, letting you preview multiple images and test full multipart form uploads to the backend.

---

## 4. Git Synchronization

To clean up your remote GitHub repository's history and upload the changes securely:
```powershell
git push origin main --force
```
*(This forces the clean repository history—without credentials—up to your remote origin.)*

---

## 5. Completed Subsystems & Active Testing Flow

We have successfully finalized both **Phase 4 (History & Timeline)** and **Phase 5 (Notification Center & Live Push UX)**! 

Here is the checklist of what has been completely structured and what exact steps are needed from your side to test them.

### ✅ Completed Subsystems

* **Google Maps API Secure Injection:** Cradle configuration isolated in `local.properties` and injected into `AndroidManifest.xml` via `${mapsApiKey}` manifest placeholders.
* **Complaint History & Choice Pills:** Responsive index list displaying categories and custom filtered pill choice chips.
* **Detailed timeline logs stepper:** Decoupled audit steppers showing statuses, administrator remarks, and time stamps chronologically.
* **FCM Deep-linking & Navigation:** Triggers in-app SnackBar actions for foreground notifications, navigates directly on background clicks, and boots directly to complaint details on cold start launch from terminated states.
* **Notification Center Screen:** Display type-styled choice tiles (complaint status, assignment, general, broadcast) with unread teal badges.
* **Mark Read Patches:** Tap indicators marking notifications as read locally and syncing with MongoDB database collections.
* **Socket.IO Real-time Sync:** Instantly inserts incoming alerts at the top of the feed and reactively increments/decrements the dashboard's bell badge.

---

## 6. What Steps Are Needed From Your Side to Test

Follow this exact step-by-step workflow to test the newly completed real-time push alert lifecycle:

### Step 1: Secure Credentials File Setup
Ensure your private Maps key is loaded inside [mobile/android/local.properties](file:///c:/collage/Project/CityFix/mobile/android/local.properties):
```properties
MAPS_API_KEY=AIzaSyYourActualGoogleMapsKeyHere
```

### Step 2: Establish ADB USB Reverse Forwarding
Ensure your phone is plugged in over USB with debug options. Reverse forward Port 5000:
```powershell
adb reverse tcp:5000 tcp:5000
```
*(Crucial! Allows your phone over USB to hook into both REST endpoints and real-time Socket.IO servers running on your PC).*

### Step 3: Deploy Application
Run and deploy to your OnePlus 9 device:
```powershell
flutter run -d a908f4d
```

### Step 4: Login & Open Dashboard
Sign in. Look at the **AppBar**—you will see a gorgeous **Bell Icon** adorned with a red unread notification count badge!

### Step 5: Test Realtime Alerts Sync
Keep the app open in the foreground. Open your PC terminal, REST Client, or database to trigger a complaint status update:

**HTTP PATCH**: `http://localhost:5000/api/v1/complaints/YOUR_COMPLAINT_ID/status`  
**Body**:
```json
{
  "status": "In Progress",
  "remarks": "Technician crew has arrived at the location to inspect and repair the pavement."
}
```

* **Observe Phone Screen Foreground:** A premium in-app SnackBar banner slides in from the bottom with a pulsing bell icon, showing the title/body. Tap **VIEW** on the SnackBar action to slide directly into that complaint's detailed timeline stepper, which has already dynamically loaded the update in-memory!
* **Observe Badge Increment:** The Dashboard Bell count badge automatically increments by 1 instantly!

### Step 6: Test Notification Center Screen
1. Tap the **Bell Icon** on the Dashboard.
2. The **Notification Center Screen** opens. You will see the new status update listed as unread with a glowing teal dot.
3. Tap **Mark All as Read** or click the alert card. The card transitions to a read state visually, and the bell count badge decreases by 1 in real-time!

### Step 7: Test Background Clicks Deep-linking
1. Put the app in the background (press Home button on phone).
2. Trigger another status change PATCH from your PC REST client.
3. You will receive a native push notification banner at the top of your phone screen.
4. **Click the push banner.** The app will launch and immediately direct you to the corresponding complaint's timeline detail screen!


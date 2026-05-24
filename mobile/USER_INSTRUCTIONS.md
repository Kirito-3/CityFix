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

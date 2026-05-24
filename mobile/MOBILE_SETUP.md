# CityFix Mobile App Setup & Firebase Integration Guide

This guide provides a step-by-step walkthrough for local developers to configure their environments, set up Firebase files, boot emulators, and compile the **CityFix** Flutter mobile client.

---

## 1. Local Environment Pre-requisites

Ensure you have the following installed on your machine:
* **Flutter SDK:** Version `3.10.0` or higher (`flutter doctor` must report zero core tool errors).
* **Android Studio / SDK:** Installed with a configured Virtual Device (AVD) running API Level 30+.
* **Xcode (macOS only):** Installed for iOS compilation with Cocoapods deployed (`brew install cocoapods`).

---

## 2. Dynamic Firebase Integration Setup

To get push notifications functioning on emulators/devices, you must link your Firebase project to the mobile client by downloading configuration files:

### A. Android Setup
1. Create an Android App in the **Firebase Console** under your project with package ID: `com.cityfix.mobile`.
2. Download `google-services.json`.
3. Move `google-services.json` into:
   `mobile/android/app/google-services.json`
4. Add the Google Services classpath inside your root build gradle (`mobile/android/build.gradle`):
   ```gradle
   dependencies {
       classpath 'com.google.gms:google-services:4.3.15'
   }
   ```
5. Apply the plugin inside your app build gradle (`mobile/android/app/build.gradle`):
   ```gradle
   apply plugin: 'com.google.gms.google-services'
   ```

### B. iOS Setup
1. Create an iOS App in the **Firebase Console** with bundle ID: `com.cityfix.mobile`.
2. Download `GoogleService-Info.plist`.
3. Move `GoogleService-Info.plist` into your Xcode project root (`mobile/ios/Runner/GoogleService-Info.plist`).
4. Ensure target mappings are configured in Xcode to include this plist during the compile phase.

---

## 3. Quickstart Running Instructions

Once environment dependencies are met and Firebase plists/JSONs are in place, spin up the application:

### Step 1: Clone and Navigate
Navigate to the mobile app directory:
```bash
cd mobile
```

### Step 2: Fetch Libraries
Fetch the package dependencies declared inside `pubspec.yaml`:
```bash
flutter pub get
```

### Step 3: Launch Android / iOS Emulator
* Check active connected emulator targets:
  ```bash
  flutter devices
  ```
* Spin up a target:
  ```bash
  flutter emulators --launch <EMULATOR_ID>
  ```

### Step 4: Compile and Run the App
Launch the Flutter app under a dev environment:
```bash
flutter run
```
* Press `r` inside the console terminal for Hot Reload to instantly render screen layout changes.
* Press `R` for Hot Restart.

---

## 4. Local Emulator Network Redirection Notes

* **Android Emulator Network Mapping:** In our `lib/core/api_client.dart`, we configure the base URL as `http://10.0.2.2:5000/api/v1`. The Android emulator automatically routes the local address `10.0.2.2` onto the developer host machine's loopback interface `127.0.0.1`. No special port forwarding is required!
* **iOS Simulator Network Mapping:** The iOS Simulator shares the developer host machine's loopback network interface natively. If you compile and run on iOS, you can modify the baseUrl inside `api_client.dart` directly to point to `http://localhost:5000/api/v1`!

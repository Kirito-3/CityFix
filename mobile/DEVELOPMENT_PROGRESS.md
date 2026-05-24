# CityFix Mobile App - Development Progress & Roadmap

This progress tracker logs completed architectural milestones, starter features, configurations, and plans for the next phases of development.

---

## 1. Project Overview

* **Current Module:** Phase 1: Core Scaffolding & Setup
* **Current Status:** 🟢 Completed & Operational

---

## 2. Completed Milestones

### Foundations & Infrastructure
* [x] **Project Scaffolding:** Designed directories in `lib/` for a clean feature-first architecture (`core/`, `config/`, `features/`, `services/`, `providers/`, `models/`, `widgets/`, `routes/`).
* [x] **Package Configurations (`pubspec.yaml`):** Configured Riverpod, Dio, secure local storage, GoRouter, Firebase, Geolocator, Google Maps, and Image Picker.
* [x] **Premium Design Theme (`config/theme.dart`):** Defined harmonious brand primary blue, teal accents, light/dark mode properties, spacers, and custom font weights.
* [x] **Centralized Dio API Client (`core/api_client.dart`):** Formulated base options mapping to local loopbacks (`10.0.2.2`), request timeouts, and authorization headers injection.
* [x] **Secure Storage Interface (`core/secure_storage_service.dart`):** Wrapped hardware storage options to securely read, write, and delete authentication tokens.

### State & Navigation Orchestrators
* [x] **GoRouter guarded Router (`routes/router.dart`):** Registered path layouts with active auth redirects gating unauthenticated access and routing logged-in users away from guest signup screens.
* [x] **Riverpod auth Provider (`providers/auth_provider.dart`):** Built state notifier managing credentials login, signup, storage token registration, and session bootstraps.
* [x] **Brilliant 401 Session Eviction Hook:** Integrated Dio error interceptor callback inside `AuthNotifier` to automatically delete corrupt keys and force logout redirects.
* [x] **Riverpod complaint Provider (`providers/complaint_provider.dart`):** Formulated list retrieval, timeline timeline detail queries, and multipart file uploaders.
* [x] **Riverpod notification Provider (`providers/notification_provider.dart`):** Designed token registration posts sending device tokens to backend database collections.
* [x] **Firebase FCM Push receiver (`services/fcm_service.dart`):** Structured permission request triggers, token loaders, in-app SnackBar display banners, and background click handlers.

### Custom UI & Starter Screens
* [x] **Foundational Reusable Widgets (`widgets/foundations.dart`):** Created validated text inputs, custom circular loaders with text support, error retry badges, and animated buttons.
* [x] **Splash Screen (`features/auth/splash_screen.dart`):** Programmed fade-in animations, local storage boot checks, and post-frame router triggers.
* [x] **Login Screen (`features/auth/login_screen.dart`):** Implemented validated inputs, loading states, error SnackBar displays, and signup redirects.
* [x] **Signup Screen (`features/auth/signup_screen.dart`):** Collected citizen name, email, phone, and password with validations and submit actions.

---

## 3. Next Implementation Steps (Recommended Roadmap)

### Phase 2: Dashboard & Map Feed
1. **Google Maps Feed Integration:** Render the live Map view showing current user location using `Geolocator`.
2. **Interactive Map Pins:** Fetch nearby complaints (`GET /complaints?lat=...&lng=...`) and place custom color-coded map markers reflecting category or status.
3. **Dashboard Filters:** Render dynamic filter chips allowing citizens to filter lists by category (`pothole`, `garbage`, `drainage`) or priority.

### Phase 3: Camera Uploads & Complaint Filing
1. **Camera Image Selection:** Connect `image_picker` to the "File a Complaint" form to let users pick photos from their gallery or shoot live photos.
2. **Geo-tagging Automation:** Leverage Geolocator to pre-populate the exact latitude and longitude on the filing form the moment a photo is captured.
3. **Multipart Filing post:** Bind form submits to `ref.read(complaintProvider.notifier).createComplaint(...)` to upload images directly to Cloudinary and register status log timelines.

### Phase 4: History Timeline Details
1. **History Timeline Logs View:** Build a vertical chronological stepper on the complaint detail page, showing status transitions (e.g., from `Submitted` to `Under Review` to `Resolved`) with admin remarks.

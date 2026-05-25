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

### Phase 2, 3, & 4: Citizen Core Operations (Completed!)
* [x] **Citizen Dashboard (`features/dashboard/dashboard_screen.dart`):** Added dynamic user greetings, calculated pending/resolved/total statistics cards, reactively listed individual citizen reports in a premium list view with status/priority tags, and added FAB navigation.
* [x] **Complaint Reporting Screen (`features/complaints/report_issue_screen.dart`):** Implemented a production-ready filing form with coordinates pin marking and full transparent uploading spin overlays.
* [x] **Complaint History & Filtering (`features/complaints/complaint_history_screen.dart`):** Crafted highly responsive history index. Integrated status, category, and priority choice pills. Connected cursor pagination and pull-to-refresh to `complaintHistoryProvider`.
* [x] **Complaint Detail Sheet (`features/complaints/complaint_detail_screen.dart`):** Detailed card layouts displaying image slideshow lists, native coordinate map markers, Windows/Web fallback sheets, and citizen/authority metadata values.
* [x] **Real-Time Chronological Timeline Stepper:** Crafted customized vertical stepper lines displaying status shifts (Submitted ➜ Under Review ➜ Assigned ➜ In Progress ➜ Resolved ➜ Rejected) with active timestamps, role badges, and administrator remarks.
* [x] **Socket.IO Real-Time Syncing (`services/socket_service.dart` & `providers/realtime_provider.dart`):** Structured instant WebSocket synchronization. Listens to citizen alerts in private rooms to launch app-wide notification toasts and detail updates in real-time rooms.
* [x] **Notification Center Screen (`features/notifications/notification_center_screen.dart`):** Integrated paginated list notifications index showcasing read/unread unread visual dot marks and unread counters badge overlays inside Dashboard's Bell appbar.
* [x] **FCM Live Push Notification UX:** Housed foreground, background, and cold start terminated click actions. Leveraged `pushEventProvider` to trigger reactive GoRouter pushes safely redirecting citizens directly to timelines.

### Phase 6: Additional Extensions (Recommended Roadmap)
1. **Maps Feed Overlay Integration:** Build an interactive maps feed showcasing all nearby complaints matching latitude and longitude boundaries using color-coded marker category pins.
2. **Citizen Profile Customization:** Let citizens edit their profile pictures, change passwords, and configure push notifications.



# CityFix Mobile Application - Architecture & Project Structure Guide

This document catalogs the structural layout, design choices, and core coding conventions implemented inside the **CityFix** Flutter mobile application client.

---

## 1. Directory Scaffolding Blueprint

The application employs a highly scalable, testable, and cleanly separated **Feature-First Architecture** combined with the **Riverpod State Management** system:

```
lib/
├── config/
│   └── theme.dart                  <-- Centralized colors, typography, spacers, and light/dark ThemeData.
├── core/
│   ├── api_client.dart             <-- Dio HTTP engine with JWT header injects and 401 logout handlers.
│   └── secure_storage_service.dart <-- Hardware Keychain/Keystore secure token manager.
├── features/
│   └── auth/
│       ├── splash_screen.dart      <-- Logo animations and storage session bootstrap routing.
│       ├── login_screen.dart       <-- Email/Password validated input forms.
│       └── signup_screen.dart      <-- Citizen profile registration input forms.
├── models/
│   ├── complaint_model.dart        <-- Deserializes civic complaints, GeoJSON points, and StatusLog timeline logs.
│   └── user_model.dart             <-- Deserializes citizen user profiles.
├── providers/
│   ├── auth_provider.dart          <-- Manages reactive authenticated citizen session states.
│   ├── complaint_provider.dart     <-- Handles paginated complaint retrieval and multipart file uploads.
│   └── notification_provider.dart  <-- Posts FCM device tokens to backend API registries.
├── routes/
│   └── router.dart                 <-- Configures GoRouter path registries and auth guards redirects.
├── services/
│   └── fcm_service.dart            <-- FCM permissions handlers, token logs, and Snackbars overlays.
├── widgets/
│   └── foundations.dart            <-- Reusable Validated Text Fields, loaders, error boxes, and custom buttons.
└── main.dart                       <-- Widget binding bootstrapper mounting ProviderScope.
```

---

## 2. Core Architectural Subsystems

### A. Reactive State Management with Riverpod
We leverage **Riverpod's StateNotifierProvider** to decouple business logic from UI rendering:
* **Single Source of Truth:** Screens reactively watch (`ref.watch`) provider states (e.g. `authProvider` or `complaintProvider`). State modifications are executed strictly through notifiers (`ref.read(authProvider.notifier).login(...)`).
* **Immutability:** States are strictly immutable wrappers modified using copy-constructor conventions (`state = state.copyWith(...)`) to prevent side-effects across widgets.

### B. Network Layer (ApiClient & Secure Storage)
* **Dio Client Integration:** The centralized `ApiClient` instance handles timeouts and JSON headers. It injects a request interceptor that reactively extracts saved JWT tokens from `SecureStorageService.instance.readToken()` and appends them to authorization headers on every outbound HTTP request.
* **Brilliant 401 Session Eviction:** If an API endpoint replies with a `401 Unauthorized` (e.g., token expired), the Dio interceptor dynamically catches the error, deletes the saved credentials, and calls a static callback `ApiClient.onUnauthorized?.call()`. This callback is mapped by the `AuthNotifier` to instantly reset the auth state and redirect the GoRouter context to `/login`.

### C. GoRouter Guardians & Redirections
The navigation layer utilizes **GoRouter** to enforce route restrictions reactively based on the user's login state:
1. **Protected Paths Guard:** GoRouter watches `authProvider`. If the state resolves to unauthenticated, GoRouter intercepts the route request and redirects the user to `/login`.
2. **Backward Redirect Guard:** If the user is logged in, GoRouter intercepts attempts to visit `/login` or `/signup` and routes them directly to `/dashboard`.
3. **Frictionless Splash Boot:** On first load, `/` runs. The `SplashScreen` boots, reads `SecureStorage` for pre-existing JWTs, boots the user session reactive state, and transitions seamlessly to the dashboard or login screen after the logo animation finishes.

---

## 3. High-Performance API Integration Strategies

### Multipart FormData Image Uploads
Filing a complaint requires submitting coordinate strings and multiple binary files.
Our `ComplaintNotifier` translates this complex operation into a single high-performance `multipart/form-data` request:
```dart
final Map<String, dynamic> formMap = {
  'title': title,
  'description': description,
  'category': category,
  'longitude': longitude.toString(), // cast to string for multipart
  'latitude': latitude.toString(),
  'address': address,
};

final formData = FormData.fromMap(formMap);

// Append picked files dynamically
for (final path in localImagePaths) {
  formData.files.add(
    MapEntry(
      'images',
      await MultipartFile.fromFile(path, filename: path.split('/').last),
    ),
  );
}

final response = await _dio.post('/complaints', data: formData);
```
This is fully aligned with the backend **Zod preprocessors** which cast string-numbers back to float values!

---

## 4. Reusable Foundational UI Elements

Consistent styling and standard feedback shapes are backed by custom widgets in `widgets/foundations.dart`:
* **`CustomTextField`:** Wraps forms and input decors, providing custom icons, validation regexes, and security password show/hide icons.
* **`CustomButton`:** Features built-in elevated buttons configured with theme parameters. Automatically renders a circular loading indicator when state is loading.
* **`CustomLoader` / `CustomErrorWidget`:** Standardized full-screen loaders and stylized error cards containing built-in retry callback triggers.

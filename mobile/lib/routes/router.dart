import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../features/auth/splash_screen.dart';
import '../features/auth/login_screen.dart';
import '../features/auth/signup_screen.dart';
import '../features/dashboard/dashboard_screen.dart';
import '../features/complaints/report_issue_screen.dart';
import '../features/complaints/complaint_history_screen.dart';
import '../features/complaints/complaint_detail_screen.dart';
import '../features/complaints/nearby_map_screen.dart';
import '../features/notifications/notification_center_screen.dart';
import '../providers/auth_provider.dart';

/**
 * Custom ChangeNotifier wrapper that listens to Riverpod auth provider changes.
 * This triggers GoRouter's redirect logic without reconstructing the router.
 */
class RouterNotifier extends ChangeNotifier {
  final Ref _ref;

  RouterNotifier(this._ref) {
    // Listens to the authProvider state and notifies GoRouter if the login status transitions
    _ref.listen(
      authProvider,
      (previous, next) {
        if (previous?.isAuthenticated != next.isAuthenticated) {
          notifyListeners();
        }
      },
    );
  }
}

/**
 * Global GoRouter State Provider enabling clean, reactive, and protected routing.
 */
final routerProvider = Provider<GoRouter>((ref) {
  final notifier = RouterNotifier(ref);

  return GoRouter(
    initialLocation: '/',
    refreshListenable: notifier,
    redirect: (context, state) {
      final isLoggedIn = ref.read(authProvider).isAuthenticated;
      final isGoingToAuth = state.matchedLocation == '/login' || state.matchedLocation == '/signup';
      final isGoingToSplash = state.matchedLocation == '/';

      // Let the Splash Screen intro animation and storage checks execute uninterrupted
      if (isGoingToSplash) {
        return null;
      }

      // Guest Restriction: Force guest users back to Login
      if (!isLoggedIn && !isGoingToAuth) {
        return '/login';
      }

      // User Restriction: Prevent authenticated users from visiting Login/Signup
      if (isLoggedIn && isGoingToAuth) {
        return '/dashboard';
      }

      return null;
    },
    routes: [
      GoRoute(
        path: '/',
        builder: (context, state) => const SplashScreen(),
      ),
      GoRoute(
        path: '/login',
        builder: (context, state) => const LoginScreen(),
      ),
      GoRoute(
        path: '/signup',
        builder: (context, state) => const SignupScreen(),
      ),
      GoRoute(
        path: '/dashboard',
        builder: (context, state) => const DashboardScreen(),
      ),
      GoRoute(
        path: '/report',
        builder: (context, state) => const ReportIssueScreen(),
      ),
      GoRoute(
        path: '/history',
        builder: (context, state) => const ComplaintHistoryScreen(),
      ),
      GoRoute(
        path: '/complaints/:id',
        builder: (context, state) {
          final id = state.pathParameters['id'] ?? '';
          return ComplaintDetailScreen(complaintId: id);
        },
      ),
      GoRoute(
        path: '/notifications',
        builder: (context, state) => const NotificationCenterScreen(),
      ),
      GoRoute(
        path: '/nearby',
        builder: (context, state) => const NearbyComplaintsMapScreen(),
      ),
    ],
  );
});


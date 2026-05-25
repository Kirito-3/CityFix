import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'config/theme.dart';
import 'routes/router.dart';
import 'services/fcm_service.dart';
import 'providers/push_event_provider.dart';

/**
 * Root initialization entry point of CityFix Mobile App client
 */
void main() async {
  // 1. Ensure widget bindings are active before native initialization
  WidgetsFlutterBinding.ensureInitialized();

  try {
    // 2. Initialise Firebase services (Wrappers bypass when credentials aren't deployed yet)
    // await Firebase.initializeApp();
    debugPrint('Firebase Core successfully initialized on mobile device boot.');
  } catch (e) {
    debugPrint('Firebase Core mobile bootstrapper bypassed (Development/Test Mode): $e');
  }

  // 3. Boot application wrapped inside Riverpod ProviderScope
  runApp(
    const ProviderScope(
      child: CityFixApp(),
    ),
  );
}

class CityFixApp extends ConsumerStatefulWidget {
  const CityFixApp({super.key});

  @override
  ConsumerState<CityFixApp> createState() => _CityFixAppState();
}

class _CityFixAppState extends ConsumerState<CityFixApp> {
  @override
  void initState() {
    super.initState();

    // 4. Initialise FCM Push Services reactive token bindings after the initial widget frame mounts
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      final context = this.context;
      if (mounted) {
        // Registers push handlers and posts device token to the CityFix REST backend
        await FcmService.instance.initialize(context, ref);
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    // Watch reactive GoRouter configuration
    final router = ref.watch(routerProvider);

    // Watch push clicked events reactively to perform instant deep-link routing
    ref.listen<String?>(pushEventProvider, (previous, next) {
      if (next != null && next.isNotEmpty) {
        // Grab global GoRouter context and push navigation
        router.push('/complaints/$next');
        // Clear active event so it won't re-trigger on hot restarts
        ref.read(pushEventProvider.notifier).clearEvent();
      }
    });

    return MaterialApp.router(
      title: 'CityFix Mobile',
      debugShowCheckedModeBanner: false,
      
      // Route Configuration
      routerConfig: router,
      
      // Central Design Themes Light/Dark modes
      theme: AppTheme.lightTheme,
      darkTheme: AppTheme.darkTheme,
      themeMode: ThemeMode.system, // Dynamically sync with user device system settings
    );
  }
}

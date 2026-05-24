import 'package:dio/dio.dart';
import 'secure_storage_service.dart';

/**
 * High-performance centralized HTTP client wrapping Dio with advanced interceptors
 */
class ApiClient {
  // Singleton Pattern
  ApiClient._internal() {
    _dio = Dio(
      BaseOptions(
        baseUrl: baseUrl,
        connectTimeout: const Duration(seconds: 15),
        receiveTimeout: const Duration(seconds: 15),
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      ),
    );

    // Register active pipeline interceptors
    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          // Retrieve and inject JWT Bearer Auth Header from hardware secure storage
          final token = await SecureStorageService.instance.readToken();
          if (token != null) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          return handler.next(options);
        },
        onError: (DioException error, handler) async {
          // Intercept session expirations (401 Unauthorized)
          if (error.response?.statusCode == 401) {
            // Evict corrupt/expired JWT token from local memory
            await SecureStorageService.instance.deleteToken();
            
            // Trigger global session eviction callback (bridges Dio singleton to Riverpod state)
            onUnauthorized?.call();
          }
          return handler.next(error);
        },
      ),
    );
  }

  static final ApiClient instance = ApiClient._internal();
  late final Dio _dio;

  Dio get client => _dio;

  // Local development address pointing to 10.0.2.2 (which maps to localhost on Android emulator)
  static const String baseUrl = 'http://10.0.2.2:5000/api/v1';

  // Global Session Eviction Callback broker registered by Auth Notifier
  static Function()? onUnauthorized;
}

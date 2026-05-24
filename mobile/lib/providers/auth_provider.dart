import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/api_client.dart';
import '../core/secure_storage_service.dart';
import '../models/user_model.dart';

/**
 * Immutable State wrapper encapsulating active Authentication values
 */
class AuthState {
  final UserModel? user;
  final bool isLoading;
  final String? errorMessage;

  AuthState({
    this.user,
    this.isLoading = false,
    this.errorMessage,
  });

  bool get isAuthenticated => user != null;

  AuthState copyWith({
    UserModel? user,
    bool? isLoading,
    String? errorMessage,
  }) {
    return AuthState(
      user: user ?? this.user,
      isLoading: isLoading ?? this.isLoading,
      errorMessage: errorMessage, // Resets error if null is passed
    );
  }
}

/**
 * Notifier orchestration class executing API credentials posts
 */
class AuthNotifier extends StateNotifier<AuthState> {
  AuthNotifier() : super(AuthState()) {
    // Inject the global API client unauthorized callback to trigger auto session eviction
    ApiClient.onUnauthorized = () {
      logout();
    };
  }

  final Dio _dio = ApiClient.instance.client;

  /**
   * Initializes the application state by looking up any pre-existing JWT token in secure storage.
   * If found, loads the current citizen context from `/auth/me`.
   */
  Future<void> bootstrapSession() async {
    state = state.copyWith(isLoading: true);
    try {
      final savedToken = await SecureStorageService.instance.readToken();
      if (savedToken == null) {
        state = AuthState(); // Reset to guest state
        return;
      }

      // Fetch user profile from backend me details endpoint
      final response = await _dio.get('/auth/me');
      if (response.statusCode == 200 && response.data['success'] == true) {
        final userData = response.data['data'];
        state = AuthState(user: UserModel.fromJson(userData));
      } else {
        await SecureStorageService.instance.deleteToken();
        state = AuthState();
      }
    } catch (e) {
      // Gracefully handle boot connection failures
      await SecureStorageService.instance.deleteToken();
      state = AuthState();
    }
  }

  /**
   * Authenticates citizen credentials using email and password.
   */
  Future<bool> login(String email, String password) async {
    state = state.copyWith(isLoading: true);
    try {
      final response = await _dio.post('/auth/login', data: {
        'email': email,
        'password': password,
      });

      if (response.statusCode == 200 && response.data['success'] == true) {
        final data = response.data['data'];
        final token = data['token'];
        final userData = data['user'];

        // Persist token safely inside secure storage Keychain/Keystore
        await SecureStorageService.instance.writeToken(token);
        
        state = AuthState(user: UserModel.fromJson(userData));
        return true;
      } else {
        state = AuthState(errorMessage: response.data['message'] ?? 'Authentication failed.');
        return false;
      }
    } on DioException catch (e) {
      final errorMsg = e.response?.data['message'] ?? 'Connection error. Please try again.';
      state = AuthState(errorMessage: errorMsg);
      return false;
    } catch (e) {
      state = AuthState(errorMessage: 'An unexpected error occurred.');
      return false;
    }
  }

  /**
   * Registers a new citizen profile.
   */
  Future<bool> signup({
    required String name,
    required String email,
    required String phone,
    required String password,
  }) async {
    state = state.copyWith(isLoading: true);
    try {
      final response = await _dio.post('/auth/signup', data: {
        'name': name,
        'email': email,
        'phone': phone,
        'password': password,
        'role': 'citizen',
      });

      if (response.statusCode == 201 && response.data['success'] == true) {
        final data = response.data['data'];
        final token = data['token'];
        final userData = data['user'];

        await SecureStorageService.instance.writeToken(token);
        state = AuthState(user: UserModel.fromJson(userData));
        return true;
      } else {
        state = AuthState(errorMessage: response.data['message'] ?? 'Registration failed.');
        return false;
      }
    } on DioException catch (e) {
      final errorMsg = e.response?.data['message'] ?? 'Registration rejected. Please verify details.';
      state = AuthState(errorMessage: errorMsg);
      return false;
    } catch (e) {
      state = AuthState(errorMessage: 'An unexpected error occurred during registration.');
      return false;
    }
  }

  /**
   * Logs out the user by deleting the persisted JWT and resetting state.
   */
  Future<void> logout() async {
    state = state.copyWith(isLoading: true);
    await SecureStorageService.instance.deleteToken();
    state = AuthState(); // Reverts to clean Guest state
  }

  /**
   * Helper to clear errors
   */
  void clearError() {
    state = state.copyWith(errorMessage: null);
  }
}

/**
 * Globally available Riverpod StateNotifierProvider wrapping authentication sessions
 */
final authProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  return AuthNotifier();
});

import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/**
 * Service managing persistent cryptographically safe hardware secure storage
 */
class SecureStorageService {
  // Singleton Pattern
  SecureStorageService._internal();
  static final SecureStorageService instance = SecureStorageService._internal();

  final FlutterSecureStorage _storage = const FlutterSecureStorage(
    aOptions: AndroidOptions(encryptedSharedPreferences: true), // Force encryption on Android SharedPrefs
    iOptions: IOSOptions(accessibility: KeychainAccessibility.first_unlock), // ios Keychain accessibility rules
  );

  static const String _tokenKey = 'cityfix_jwt_token';

  /**
   * Persists the active session JWT token into hardware storage.
   */
  Future<void> writeToken(String token) async {
    await _storage.write(key: _tokenKey, value: token);
  }

  /**
   * Reads and retrieves the saved JWT token. Returns null if missing.
   */
  Future<String?> readToken() async {
    return await _storage.read(key: _tokenKey);
  }

  /**
   * Evicts/Deletes the saved token from secure storage.
   */
  Future<void> deleteToken() async {
    await _storage.delete(key: _tokenKey);
  }
}

import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/**
 * Service managing persistent cryptographically safe hardware secure storage
 */
class SecureStorageService {
  // Singleton Pattern
  SecureStorageService._internal();
  static final SecureStorageService instance = SecureStorageService._internal();

  final FlutterSecureStorage _storage = const FlutterSecureStorage(
    aOptions: AndroidOptions(encryptedSharedPreferences: false), // Disable encryptedSharedPreferences to prevent Android KeyStore infinite loop hang
    iOptions: IOSOptions(accessibility: KeychainAccessibility.first_unlock), // ios Keychain accessibility rules
  );

  // In-memory backup cache to prevent native KeyStore lock/corrupt crashes on physical devices
  final Map<String, String> _memoryBackup = {};
  static const String _tokenKey = 'cityfix_jwt_token';

  /**
   * Persists the active session JWT token into hardware storage.
   */
  Future<void> writeToken(String token) async {
    _memoryBackup[_tokenKey] = token;
    try {
      await _storage.write(key: _tokenKey, value: token);
    } catch (e) {
      // Graceful fallback to memory on corrupted KeyStore instances
    }
  }

  /**
   * Reads and retrieves the saved JWT token. Returns null if missing.
   */
  Future<String?> readToken() async {
    try {
      final value = await _storage.read(key: _tokenKey);
      if (value != null) {
        _memoryBackup[_tokenKey] = value;
      }
      return value ?? _memoryBackup[_tokenKey];
    } catch (e) {
      return _memoryBackup[_tokenKey];
    }
  }

  /**
   * Evicts/Deletes the saved token from secure storage.
   */
  Future<void> deleteToken() async {
    _memoryBackup.remove(_tokenKey);
    try {
      await _storage.delete(key: _tokenKey);
    } catch (e) {
      // Graceful bypass on deletion failure
    }
  }
}

import 'package:flutter_riverpod/flutter_riverpod.dart';

/**
 * Orchestrates incoming push notification click interactions.
 * Stores the targeted complaintId for programmatic routing shifts.
 */
class PushEventNotifier extends StateNotifier<String?> {
  PushEventNotifier() : super(null);

  /**
   * Dispatches a new navigation trigger from push events clicks.
   */
  void triggerNavigation(String complaintId) {
    state = complaintId;
  }

  /**
   * Resets the active event after navigation is fully processed.
   */
  void clearEvent() {
    state = null;
  }
}

/**
 * Global Riverpod provider monitoring push click triggers
 */
final pushEventProvider = StateNotifierProvider<PushEventNotifier, String?>((ref) {
  return PushEventNotifier();
});

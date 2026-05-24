// Basic Flutter smoke test verifying CityFixApp initialization
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:cityfix_mobile/main.dart';

void main() {
  testWidgets('CityFixApp smoke test', (WidgetTester tester) async {
    // Build our app and trigger a frame.
    await tester.pumpWidget(
      const ProviderScope(
        child: CityFixApp(),
      ),
    );

    // Verify splash elements exist or can initialize
    expect(find.byType(CityFixApp), findsOneWidget);
  });
}

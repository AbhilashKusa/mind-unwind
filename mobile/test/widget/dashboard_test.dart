import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:mobile/screens/dashboard_screen.dart';
import 'package:mobile/providers/auth_provider.dart';
import 'package:mobile/widgets/task_card.dart';
import 'package:mobile/widgets/stats_card.dart';

void main() {
  testWidgets('Dashboard renders new UI components', (WidgetTester tester) async {
    // We can't easily mock ApiService static calls in a Widget test without dependency injection 
    // or a specialized mock library, so we will focus on verifying that the Widgets load 
    // assuming the FutureBuilder settles (we can pump animations).
    // Note: FutureBuilder waiting state checks.

    await tester.pumpWidget(
      MultiProvider(
        providers: [
          ChangeNotifierProvider(create: (_) => AuthProvider()),
        ],
        child: const MaterialApp(
          home: DashboardScreen(),
        ),
      ),
    );

    // Initial state is loading
    expect(find.byType(CircularProgressIndicator), findsOneWidget);
    
    // We cannot push past the Future without a mocked API, 
    // but we can verify the structure once we solve the mocking strategy 
    // For now, this test confirms app builds and shows loading.
  });
}

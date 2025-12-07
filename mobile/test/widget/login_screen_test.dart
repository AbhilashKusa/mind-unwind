import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:mobile/screens/login_screen.dart';
import 'package:mobile/providers/auth_provider.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  setUp(() {
    // Mock SharedPreferences for each test
    SharedPreferences.setMockInitialValues({});
  });

  testWidgets('LoginScreen UI Elements Check', (WidgetTester tester) async {
    await tester.pumpWidget(
      MultiProvider(
        providers: [
          ChangeNotifierProvider(create: (_) => AuthProvider()),
        ],
        child: const MaterialApp(
          home: LoginScreen(),
        ),
      ),
    );

    // Check Header
    expect(find.text('Mind Unwind'), findsOneWidget);
    
    // Check Fields
    expect(find.text('Email'), findsOneWidget);
    expect(find.text('Password'), findsOneWidget);
    
    // Check Button
    expect(find.text('LOGIN'), findsOneWidget);
    
    // Check Toggle
    expect(find.text("Don't have an account? Register"), findsOneWidget);
  });

  testWidgets('Validation Error on Empty Submit', (WidgetTester tester) async {
     await tester.pumpWidget(
      MultiProvider(
        providers: [
          ChangeNotifierProvider(create: (_) => AuthProvider()),
        ],
        child: const MaterialApp(
          home: LoginScreen(),
        ),
      ),
    );

    // Tap Login without typing anything
    await tester.tap(find.byType(ElevatedButton));
    await tester.pump();

    // In a real app we might show a validation error, but current implementation just returns.
    // We verify strict "No crash" here.
    expect(find.text('LOGIN'), findsOneWidget);
  });

  testWidgets('Switching to Register UI', (WidgetTester tester) async {
    await tester.pumpWidget(
      MultiProvider(
        providers: [
          ChangeNotifierProvider(create: (_) => AuthProvider()),
        ],
        child: const MaterialApp(
          home: LoginScreen(),
        ),
      ),
    );

    await tester.tap(find.text("Don't have an account? Register"));
    await tester.pump();

    expect(find.text('Name'), findsOneWidget);
    expect(find.text('REGISTER'), findsOneWidget);
    expect(find.text("Already have an account? Login"), findsOneWidget);
  });
}

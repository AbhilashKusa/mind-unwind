import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:mobile/screens/profile_screen.dart';
import 'package:mobile/providers/auth_provider.dart';
import 'package:mobile/models/user.dart';
import 'package:mockito/mockito.dart';

class MockAuthProvider extends Mock implements AuthProvider {
  @override
  User? get user => User(id: 1, name: 'Test User', email: 'test@example.com');
  
  @override
  bool get isLoading => false;

  @override
  Future<bool> updateUser(String name, String? password) async {
    return true;
  }
}

void main() {
  testWidgets('ProfileScreen displays user details', (WidgetTester tester) async {
    final mockAuth = MockAuthProvider();

    await tester.pumpWidget(
      MaterialApp(
        home: ChangeNotifierProvider<AuthProvider>.value(
          value: mockAuth,
          child: const ProfileScreen(),
        ),
      ),
    );

    expect(find.text('Test User'), findsOneWidget); // In TextField
    expect(find.text('test@example.com'), findsOneWidget);
    expect(find.text('SAVE CHANGES'), findsOneWidget);
  });
  
  testWidgets('ProfileScreen verify input fields', (WidgetTester tester) async {
      final mockAuth = MockAuthProvider();

      await tester.pumpWidget(
        MaterialApp(
          home: ChangeNotifierProvider<AuthProvider>.value(
            value: mockAuth,
            child: const ProfileScreen(),
          ),
        ),
      );

      // Check Name Field
      expect(find.byType(TextField), findsNWidgets(2)); // Name and Password
      
      await tester.enterText(find.widgetWithText(TextField, 'NAME'), 'New Name');
      expect(find.text('New Name'), findsOneWidget);
  });
}

import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:mobile/services/api_service.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('ApiService Tests', () {
    test('Base URL should be localhost', () {
      expect(ApiService.baseUrl, contains('3001'));
    });

    test('Headers should contain content-type', () async {
      SharedPreferences.setMockInitialValues({});
      final headers = await ApiService.getHeaders();
      expect(headers['Content-Type'], 'application/json');
    });
  });
}

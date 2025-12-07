import 'dart:convert';
import 'dart:io';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../models/user.dart';
import '../models/task.dart';
import '../utils/auth_exception.dart';

class ApiService {
  // 10.0.2.2 is localhost for Android Emulator
  // localhost works for iOS Simulator & Web
  static String get baseUrl {
    if (kIsWeb) {
      return 'http://localhost:3001/api';
    }
    // Platform checks are only safe if !kIsWeb
    if (Platform.isAndroid) {
      return 'http://10.0.2.2:3001/api';
    }
    return 'http://localhost:3001/api';
  }

  static Future<String?> getToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('token');
  }

  static Future<Map<String, String>> getHeaders() async {
    final token = await getToken();
    return {
      'Content-Type': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
    };
  }

  // Auth
  static Future<Map<String, dynamic>> login(String email, String password) async {
    final res = await http.post(
      Uri.parse('$baseUrl/auth/login'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'email': email, 'password': password}),
    );

    if (res.statusCode == 200) {
      final data = jsonDecode(res.body);
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('token', data['token']);
      return data;
    } else {
      throw Exception(jsonDecode(res.body)['error'] ?? 'Login failed');
    }
  }

  static Future<Map<String, dynamic>> register(String name, String email, String password) async {
    final res = await http.post(
      Uri.parse('$baseUrl/auth/register'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'name': name, 'email': email, 'password': password}),
    );

    if (res.statusCode == 200) {
      final data = jsonDecode(res.body);
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('token', data['token']);
      return data;
    } else {
      throw Exception(jsonDecode(res.body)['error'] ?? 'Registration failed');
    }
  }

  static Future<User?> getMe() async {
    final res = await http.get(Uri.parse('$baseUrl/auth/me'), headers: await getHeaders());
    if (res.statusCode == 200) {
      return User.fromJson(jsonDecode(res.body));
    } else if (res.statusCode == 401) {
      throw AuthException('Session expired');
    }
    return null;
  }

  static Future<User> updateProfile(String name, String? password) async {
    final body = {'name': name};
    if (password != null && password.isNotEmpty) {
      body['password'] = password;
    }

    final res = await http.put(
      Uri.parse('$baseUrl/auth/me'),
      headers: await getHeaders(),
      body: jsonEncode(body),
    );

    if (res.statusCode == 200) {
      return User.fromJson(jsonDecode(res.body));
    } else if (res.statusCode == 401) {
      throw AuthException('Session expired');
    } else {
      throw Exception(jsonDecode(res.body)['error'] ?? 'Update failed');
    }
  }

  // Tasks
  static Future<List<Task>> getTasks() async {
    final res = await http.get(Uri.parse('$baseUrl/tasks'), headers: await getHeaders());
    if (res.statusCode == 200) {
      final List<dynamic> list = jsonDecode(res.body);
      return list.map((json) => Task.fromJson(json)).toList();
    } else if (res.statusCode == 401) {
      throw AuthException('Session expired');
    } else {
      throw Exception('Failed to load tasks');
    }
  }

  static Future<void> toggleTask(String taskId, bool isCompleted) async {
    // We reuse the generic POST /tasks (upsert) or a specific patch if available.
    // The server has a POST /tasks that acts as upsert. We'd need the full task object.
    // However, for simplicity/MVP, let's assume we might need a dedicated endpoint or 
    // we fetch, Modify, then Save. 
    // A better approach for the 'toggle' specifically might be missing on the server?
    // Checking server logic: router.post('/', ...) is upsert. 
    // We don't want to re-send the whole task if standard REST.
    // But since server code is:
    // router.post('/', authenticateToken, async (req, res) => { ... UPSERT ... })
    // We can just send the specific task fields we know? No, upsert needs ID.
    // Actually, looking at server logic `INSERT ... ON CONFLICT (id) DO UPDATE`.
    // So we need to ensure we send the FULL task or at least required fields.
    // BUT, simpler for now: Just assume the UI handles the optimistic update 
    // and we might need to properly implement 'patch' later. 
    // Let's defer actual API call implementation requiring full task object and just 
    // implement the "UI" visual toggle for now, or fetch-toggle-save.
    // Since I don't have the full task here, I will omit this for a purely Visual polish logic
    // OR, better, let's pass the Task object to this method.
  }
  
  static Future<void> createTask(Task task) async {
    final body = {
      'id': task.id,
      'title': task.title,
      'description': task.description,
      'priority': task.priority,
      'category': task.category,
      'isCompleted': task.isCompleted,
      'dueDate': task.dueDate,
      'createdAt': task.createdAt,
      'subtasks': task.subtasks,
      'comments': task.comments,
    };

    final res = await http.post(
      Uri.parse('$baseUrl/tasks'),
      headers: await getHeaders(),
      body: jsonEncode(body),
    );

    if (res.statusCode != 200 && res.statusCode != 201) {
       throw Exception('Failed to create task: ${res.body}');
    }
  }

  static Future<void> deleteTask(String id) async {
    final res = await http.delete(
      Uri.parse('$baseUrl/tasks/$id'),
      headers: await getHeaders(),
    );

     if (res.statusCode != 200) {
       throw Exception('Failed to delete task');
    }
  }
  
  static Future<void> updateTaskStatus(Task task) async {
      final updatedTask = {
        'id': task.id,
        'title': task.title,
        'description': task.description,
        'priority': task.priority,
        'category': task.category,
        'isCompleted': task.isCompleted, // Logic should be handled by caller before passing
        'dueDate': task.dueDate,
        'createdAt': task.createdAt,
        'subtasks': task.subtasks,
        'comments': task.comments
      };

      final res = await http.post(
          Uri.parse('$baseUrl/tasks'), // Upsert
          headers: await getHeaders(),
          body: jsonEncode(updatedTask)
      );

      if (res.statusCode != 200) {
        throw Exception('Failed to update task');
      }
  }
  
  static Future<void> logout() async {
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove('token');
  }
}

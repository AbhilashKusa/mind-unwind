import 'dart:convert';
import 'package:google_generative_ai/google_generative_ai.dart';
import '../models/task.dart';

class AiService {
  // TODO: Replace with your actual API Key or use --dart-define=API_KEY=...
  static const String _apiKey = 'AIzaSyAU0O_lgg708nbE4EdtLivgABgs8bYdP94'; 

  static Future<List<Task>> optimizeSchedule(List<Task> tasks) async {
    if (_apiKey.isEmpty) {
       print('AI Service: No API Key provided.');
       return tasks;
    }

    try {
      final model = GenerativeModel(
        model: 'gemini-2.5-flash',
        apiKey: _apiKey,
        generationConfig: GenerationConfig(responseMimeType: 'application/json'),
      );

      final simplifiedTasks = tasks.map((t) => {
        'id': t.id,
        'title': t.title,
        'priority': t.priority,
        'dueDate': t.dueDate,
        'isCompleted': t.isCompleted
      }).toList();

      final prompt = '''
        Current Date: ${DateTime.now().toIso8601String().split('T')[0]}
        Tasks: ${jsonEncode(simplifiedTasks)}
        
        You are an expert scheduler. Organize these tasks to maximize productivity.
        1. Assign due dates to tasks that don't have them, based on priority.
        2. If a task is High priority, it should probably be due sooner.
        3. Reorder the list so the most important things are first.
        
        Return the FULL list of tasks with updated dueDates and an idealized order.
        Return JSON Array of objects with properties: id, dueDate, priority.
      ''';

      final content = [Content.text(prompt)];
      final response = await model.generateContent(content);
      
      final text = response.text;
      if (text == null) return tasks;
      
      // Clean JSON if needed (though responseMimeType usually handles it)
      final cleanText = text.trim().replaceAll(RegExp(r'^```json\s*|```$'), '');
      
      final List<dynamic> updates = jsonDecode(cleanText);
      
      // Apply updates
      final Map<String, Task> taskMap = {for (var t in tasks) t.id: t};
      final List<Task> optimizedList = [];

      for (var update in updates) {
        final id = update['id'];
        final task = taskMap[id];
        if (task != null) {
          optimizedList.add(Task(
            id: task.id,
            title: task.title,
            description: task.description,
            priority: update['priority'] ?? task.priority,
            category: task.category,
            isCompleted: task.isCompleted,
            dueDate: update['dueDate'] ?? task.dueDate,
            createdAt: task.createdAt,
          ));
          taskMap.remove(id);
        }
      }
      
      // Add remaining (if any missed by AI)
      optimizedList.addAll(taskMap.values);
      
      return optimizedList;

    } catch (e) {
      print('AI Error: $e');
      return tasks;
    }
  }

  // Parses natural language commands to Add/Update/Delete tasks
  static Future<Map<String, dynamic>> processUserCommand(String input, List<Task> currentTasks) async {
    if (_apiKey.isEmpty) {
       return {'error': 'No API Key provided.'};
    }

    try {
      final model = GenerativeModel(
        model: 'gemini-2.5-flash',
        apiKey: _apiKey,
        generationConfig: GenerationConfig(responseMimeType: 'application/json'),
        systemInstruction: Content.system('''
          You are an advanced AI Task Orchestrator.
          Your goal is to manage the user's task list based on their natural language input.
          
          You will receive:
          1. The User's Input.
          2. A simplified list of Current Tasks.
          3. The Current Date.
        
          You must identify if the user wants to:
          - ADD new tasks.
          - UPDATE existing tasks (fuzzy match titles).
          - DELETE tasks.
          
          Strict JSON output structure:
          {
            "added": [{ "title": "...", "priority": "High/Medium/Low", "category": "...", "dueDate": "YYYY-MM-DD" }],
            "updated": [{ "id": "...", "updates": { "isCompleted": true, "priority": "High" } }],
            "deletedIds": ["..."],
            "aiResponse": "Short confirmation message"
          }
        '''),
      );

      final simplifiedTasks = currentTasks.map((t) => {
        'id': t.id,
        'title': t.title,
        'priority': t.priority,
        'dueDate': t.dueDate,
        'isCompleted': t.isCompleted
      }).toList();

      final prompt = '''
        Current Date: ${DateTime.now().toIso8601String().split('T')[0]}
        Current Tasks State: ${jsonEncode(simplifiedTasks)}
        User Input: "$input"
      ''';

      final content = [Content.text(prompt)];
      final response = await model.generateContent(content);
      
      final text = response.text;
      if (text == null) return {'error': 'No response from AI'};
      
      final cleanText = text.trim().replaceAll(RegExp(r'^```json\s*|```$'), '');
      return jsonDecode(cleanText);

    } catch (e) {
      print('AI Command Error: $e');
      return {'error': 'Failed to process command.'};
    }
  }

  static Future<List<Map<String, dynamic>>> brainstormIdeas(String goal) async {
    if (_apiKey.isEmpty) {
       return [];
    }

    try {
      final model = GenerativeModel(
        model: 'gemini-2.5-flash',
        apiKey: _apiKey,
        generationConfig: GenerationConfig(responseMimeType: 'application/json'),
      );

      final prompt = '''
        Goal: "$goal"
        
        You are a creative productivity expert. 
        Generate 5 to 8 specific, actionable tasks that would help achieve this goal.
        For each task, determine an appropriate Priority and Category.
        
        Return JSON Array of objects:
        [{ "title": "...", "description": "...", "priority": "High/Medium/Low", "category": "..." }]
      ''';

      final content = [Content.text(prompt)];
      final response = await model.generateContent(content);
      
      final text = response.text;
      if (text == null) return [];
      
      final cleanText = text.trim().replaceAll(RegExp(r'^```json\s*|```$'), '');
      final List<dynamic> json = jsonDecode(cleanText);
      return json.cast<Map<String, dynamic>>();

    } catch (e) {
      print('AI Brainstorm Error: $e');
      return [];
    }
  }

  static Future<List<Map<String, dynamic>>> generateSubtasks(String title, String description) async {
    if (_apiKey.isEmpty) {
       return [];
    }

    try {
      final model = GenerativeModel(
        model: 'gemini-2.5-flash',
        apiKey: _apiKey,
        generationConfig: GenerationConfig(responseMimeType: 'application/json'),
      );

      final prompt = '''
        Break down the task "$title" ($description) into 3-5 smaller, actionable subtasks.
        Return JSON Array of objects: [{ "title": "...", "isCompleted": false }]
      ''';

      final content = [Content.text(prompt)];
      final response = await model.generateContent(content);
      
      final text = response.text;
      if (text == null) return [];
      
      final cleanText = text.trim().replaceAll(RegExp(r'^```json\s*|```$'), '');
      final List<dynamic> json = jsonDecode(cleanText);
      return json.cast<Map<String, dynamic>>();

    } catch (e) {
      print('AI Subtask Error: $e');
      return [];
    }
  }
}

import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../models/task.dart';
import '../services/api_service.dart';
import '../services/ai_service.dart';

class CommandCenterScreen extends StatefulWidget {
  const CommandCenterScreen({super.key});

  @override
  State<CommandCenterScreen> createState() => _CommandCenterScreenState();
}

class _CommandCenterScreenState extends State<CommandCenterScreen> {
  final TextEditingController _controller = TextEditingController();
  bool _isProcessing = false;
  String? _aiResponse;
  String? _error;

  Future<void> _processCommand() async {
    final input = _controller.text.trim();
    if (input.isEmpty) return;

    setState(() {
      _isProcessing = true;
      _aiResponse = null;
      _error = null;
    });

    try {
      // Fetch current state
      final currentTasks = await ApiService.getTasks();
      
      // Call AI
      final result = await AiService.processUserCommand(input, currentTasks);
      
      if (result.containsKey('error')) {
        setState(() {
          _error = result['error'];
          _isProcessing = false;
        });
        return;
      }

      // Execute Changes
      // 1. Adds
      if (result['added'] != null) {
        for (var item in result['added']) {
          final newTask = Task(
            id: DateTime.now().millisecondsSinceEpoch.toString() + (item['title'].hashCode).toString(), // Temp ID
            title: item['title'],
            description: item['description'] ?? '',
            priority: item['priority'] ?? 'Medium',
            category: item['category'] ?? 'General',
            dueDate: item['dueDate'],
            isCompleted: false,
            createdAt: DateTime.now().millisecondsSinceEpoch,
          );
          await ApiService.createTask(newTask);
        }
      }

      // 2. Updates
      if (result['updated'] != null) {
        final taskMap = {for (var t in currentTasks) t.id: t};
        for (var update in result['updated']) {
          final id = update['id'];
          final existing = taskMap[id];
          if (existing != null) {
            final changes = update['updates'] as Map<String, dynamic>;
            final updatedTask = Task(
              id: existing.id,
              title: changes['title'] ?? existing.title,
              description: changes['description'] ?? existing.description,
              priority: changes['priority'] ?? existing.priority,
              category: changes['category'] ?? existing.category,
              isCompleted: changes['isCompleted'] ?? existing.isCompleted,
              dueDate: changes['dueDate'] ?? existing.dueDate,
              createdAt: existing.createdAt,
            );
            await ApiService.updateTaskStatus(updatedTask);
          }
        }
      }

      // 3. Deletes
      if (result['deletedIds'] != null) {
        for (var id in result['deletedIds']) {
          await ApiService.deleteTask(id);
        }
      }

      setState(() {
        _aiResponse = result['aiResponse'] ?? 'Command Executed.';
        _isProcessing = false;
        _controller.clear();
      });

    } catch (e) {
      setState(() {
        _error = 'Something went wrong: $e';
        _isProcessing = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        title: Text('COMMAND CENTER', style: GoogleFonts.poppins(fontWeight: FontWeight.bold, color: Colors.black, letterSpacing: 2)),
        centerTitle: true,
        backgroundColor: Colors.white,
        elevation: 0,
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(2.0),
          child: Container(color: Colors.black, height: 2.0),
        ),
      ),
      body: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          children: [
            // Status / Response Area
            if (_aiResponse != null)
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(16),
                margin: const EdgeInsets.only(bottom: 24),
                decoration: BoxDecoration(
                  color: Colors.grey[50],
                  border: Border.all(color: Colors.black, width: 2),
                  boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.1), offset: const Offset(4, 4), blurRadius: 0)],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                     const Text("AI RESPONSE:", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 10, letterSpacing: 1.5)),
                     const SizedBox(height: 8),
                     Text(_aiResponse!, style: GoogleFonts.poppins(fontWeight: FontWeight.w500)),
                  ],
                )
              ),
              
             if (_error != null)
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(16),
                margin: const EdgeInsets.only(bottom: 24),
                decoration: BoxDecoration(
                  color: Colors.red[50],
                  border: Border.all(color: Colors.red, width: 2),
                ),
                child: Text(_error!, style: GoogleFonts.poppins(color: Colors.red[800], fontWeight: FontWeight.bold)),
              ),

             const Spacer(),

             // Input Area
             Column(
               crossAxisAlignment: CrossAxisAlignment.stretch,
               children: [
                 Text(
                   "What can I do for you?", 
                   style: GoogleFonts.poppins(fontSize: 24, fontWeight: FontWeight.bold),
                 ),
                 const SizedBox(height: 16),
                 TextField(
                   controller: _controller,
                   maxLines: 3,
                   decoration: InputDecoration(
                     hintText: 'e.g., "Add a meeting at 2pm tomorrow" or "Clear all completed tasks"',
                     hintStyle: GoogleFonts.poppins(color: Colors.grey[400]),
                     filled: true,
                     fillColor: Colors.grey[50],
                     border: const OutlineInputBorder(
                       borderSide: BorderSide(color: Colors.black, width: 2),
                       borderRadius: BorderRadius.zero,
                     ),
                     focusedBorder: const OutlineInputBorder(
                       borderSide: BorderSide(color: Colors.black, width: 2),
                       borderRadius: BorderRadius.zero,
                     ),
                   ),
                 ),
                 const SizedBox(height: 16),
                 SizedBox(
                   height: 56,
                   child: ElevatedButton.icon(
                     onPressed: _isProcessing ? null : _processCommand,
                     icon: _isProcessing 
                       ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.black, strokeWidth: 2))
                       : const Icon(Icons.auto_awesome, color: Colors.white),
                     label: Text(
                       _isProcessing ? 'PROCESSING...' : 'EXECUTE',
                       style: GoogleFonts.poppins(fontWeight: FontWeight.bold, letterSpacing: 1.5),
                     ),
                     style: ElevatedButton.styleFrom(
                       backgroundColor: Colors.black,
                       foregroundColor: Colors.white,
                       shape: const RoundedRectangleBorder(borderRadius: BorderRadius.zero),
                       disabledBackgroundColor: Colors.grey[300],
                       disabledForegroundColor: Colors.grey[500],
                     ),
                   ),
                 ),
               ],
             ),
             const Spacer(), // Pin to center/bottom
          ],
        ),
      ),
    );
  }
}

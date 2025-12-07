import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../models/task.dart';
import '../services/api_service.dart';
import '../services/ai_service.dart';

class TaskDetailScreen extends StatefulWidget {
  final Task task;
  const TaskDetailScreen({super.key, required this.task});

  @override
  State<TaskDetailScreen> createState() => _TaskDetailScreenState();
}

class _TaskDetailScreenState extends State<TaskDetailScreen> {
  late TextEditingController _titleController;
  late TextEditingController _descController;
  late String _priority;
  bool _isGenerating = false;
  List<dynamic> _subtasks = [];

  @override
  void initState() {
    super.initState();
    _titleController = TextEditingController(text: widget.task.title);
    _descController = TextEditingController(text: widget.task.description);
    _priority = widget.task.priority;
    _subtasks = List.from(widget.task.subtasks);
  }

  Future<void> _save() async {
    final updatedTask = Task(
      id: widget.task.id,
      title: _titleController.text,
      description: _descController.text,
      priority: _priority,
      category: widget.task.category,
      isCompleted: widget.task.isCompleted,
      dueDate: widget.task.dueDate,
      createdAt: widget.task.createdAt,
      subtasks: _subtasks,
      comments: widget.task.comments,
    );

    try {
      await ApiService.updateTaskStatus(updatedTask);
      if (mounted) {
        Navigator.pop(context, true); // Return true to indicate update
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e')));
      }
    }
  }

  Future<void> _delete() async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete Task?'),
        content: const Text('This action cannot be undone.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
          TextButton(onPressed: () => Navigator.pop(context, true), child: const Text('Delete', style: TextStyle(color: Colors.red))),
        ],
      ),
    );

    if (confirm == true) {
      await ApiService.deleteTask(widget.task.id);
      if (mounted) {
        Navigator.pop(context, true);
      }
    }
  }

  Future<void> _breakDown() async {
    setState(() => _isGenerating = true);
    final subs = await AiService.generateSubtasks(_titleController.text, _descController.text);
    
    setState(() {
      _subtasks.addAll(subs);
      _isGenerating = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        title: Text('DETAILS', style: GoogleFonts.poppins(fontWeight: FontWeight.bold, letterSpacing: 2)),
        actions: [
          IconButton(onPressed: _delete, icon: const Icon(Icons.delete_outline, color: Colors.red)),
          IconButton(onPressed: _save, icon: const Icon(Icons.check, color: Colors.black)),
        ],
        backgroundColor: Colors.white,
        elevation: 0,
        bottom: PreferredSize(preferredSize: const Size.fromHeight(2.0), child: Container(color: Colors.black, height: 2.0)),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            TextField(
              controller: _titleController,
              decoration: const InputDecoration(
                labelText: 'TITLE',
                labelStyle: TextStyle(fontWeight: FontWeight.bold, letterSpacing: 1.5),
                border: InputBorder.none,
              ),
              style: GoogleFonts.poppins(fontSize: 24, fontWeight: FontWeight.bold),
            ),
            const Divider(color: Colors.black),
            const SizedBox(height: 16),
            
            // Priority Selector
            Row(
              children: ['High', 'Medium', 'Low'].map((p) => 
                Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: ChoiceChip(
                    label: Text(p.toUpperCase(), style: TextStyle(
                      color: _priority == p ? Colors.white : Colors.black,
                      fontWeight: FontWeight.bold
                    )),
                    selected: _priority == p,
                    onSelected: (selected) => setState(() => _priority = p),
                    selectedColor: Colors.black,
                    backgroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(4), side: const BorderSide(color: Colors.black)),
                    showCheckmark: false,
                  ),
                )
              ).toList(),
            ),
            const SizedBox(height: 24),

            TextField(
              controller: _descController,
              maxLines: 4,
              decoration: const InputDecoration(
                labelText: 'DESCRIPTION',
                labelStyle: TextStyle(fontWeight: FontWeight.bold, letterSpacing: 1.5),
                border: OutlineInputBorder(),
                focusedBorder: OutlineInputBorder(borderSide: BorderSide(color: Colors.black, width: 2)),
              ),
              style: GoogleFonts.poppins(),
            ),
            const SizedBox(height: 32),

            // Subtasks Section
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('SUBTASKS', style: TextStyle(fontWeight: FontWeight.bold, letterSpacing: 1.5, fontSize: 16)),
                if (_isGenerating)
                   const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.black, strokeWidth: 2))
                else
                   TextButton.icon(
                     onPressed: _breakDown,
                     icon: const Icon(Icons.auto_awesome, size: 16, color: Colors.black),
                     label: const Text('Break Down', style: TextStyle(color: Colors.black, fontWeight: FontWeight.bold)),
                   )
              ],
            ),
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                border: Border.all(color: Colors.black),
                borderRadius: BorderRadius.circular(8),
              ),
              child: _subtasks.isEmpty 
                ? Center(child: Text("No subtasks yet.", style: GoogleFonts.poppins(color: Colors.grey)))
                : Column(
                    children: _subtasks.asMap().entries.map((entry) {
                      final index = entry.key;
                      final sub = entry.value;
                      return Row(
                        children: [
                          Checkbox(
                            value: sub['isCompleted'] ?? false, 
                            onChanged: (val) => setState(() => _subtasks[index]['isCompleted'] = val),
                            activeColor: Colors.black,
                          ),
                          Expanded(
                            child: Text(
                              sub['title'], 
                              style: TextStyle(
                                decoration: (sub['isCompleted'] ?? false) ? TextDecoration.lineThrough : null
                              )
                            )
                          ),
                        ],
                      );
                    }).toList(),
                  ),
            ),
          ],
        ),
      ),
    );
  }
}

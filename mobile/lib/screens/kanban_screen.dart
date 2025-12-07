import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../models/task.dart';
import '../services/api_service.dart';
import '../widgets/task_card.dart';
import 'task_detail_screen.dart';

class KanbanScreen extends StatefulWidget {
  const KanbanScreen({super.key});

  @override
  State<KanbanScreen> createState() => _KanbanScreenState();
}

class _KanbanScreenState extends State<KanbanScreen> {
  late Future<List<Task>> _tasksFuture;

  @override
  void initState() {
    super.initState();
    _refreshTasks();
  }

  void _refreshTasks() {
    setState(() {
      _tasksFuture = ApiService.getTasks();
    });
  }

  Future<void> _toggleTask(Task task) async {
    try {
      final updated = Task(
        id: task.id,
        title: task.title,
        description: task.description,
        priority: task.priority,
        category: task.category,
        isCompleted: !task.isCompleted,
        dueDate: task.dueDate,
        createdAt: task.createdAt,
        subtasks: task.subtasks,
        comments: task.comments
      );
      await ApiService.updateTaskStatus(updated);
      _refreshTasks();
    } catch (e) {
      if (mounted) {
         ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Failed to update: $e')));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        title: Text('BOARD', style: GoogleFonts.poppins(fontWeight: FontWeight.bold, color: Colors.black, letterSpacing: 2)),
        centerTitle: true,
        backgroundColor: Colors.white,
        elevation: 0,
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(2.0),
          child: Container(
            color: Colors.black,
            height: 2.0,
          ),
        ),
      ),
      body: FutureBuilder<List<Task>>(
        future: _tasksFuture,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator(color: Colors.black));
          }
          final tasks = snapshot.data ?? [];
          final todoTasks = tasks.where((t) => !t.isCompleted).toList();
          final doneTasks = tasks.where((t) => t.isCompleted).toList();

          return RefreshIndicator(
            onRefresh: () async => _refreshTasks(),
            color: Colors.black,
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                _buildColumn('To Do', todoTasks),
                const SizedBox(height: 24),
                _buildColumn('Done', doneTasks),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _buildColumn(String title, List<Task> tasks) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.grey[50],
        border: Border.all(color: Colors.black),
        borderRadius: BorderRadius.zero, // Sharp edges
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.1),
            offset: const Offset(4, 4),
            blurRadius: 0,
          )
        ]
      ),
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                title.toUpperCase(),
                style: GoogleFonts.poppins(
                  fontWeight: FontWeight.bold,
                  color: Colors.black,
                  letterSpacing: 1.2
                )
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                decoration: BoxDecoration(
                  color: Colors.black,
                  borderRadius: BorderRadius.circular(0),
                ),
                child: Text(
                  '${tasks.length}',
                  style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          const Divider(color: Colors.black, thickness: 1),
          const SizedBox(height: 12),
           if (tasks.isEmpty)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 20),
                child: Center(
                  child: Text(
                    'Empty',
                    style: GoogleFonts.poppins(color: Colors.grey[400], fontStyle: FontStyle.italic),
                  )
                ),
              ),
          ...tasks.map((task) => TaskCard(
            task: task,
            onToggle: () => _toggleTask(task),
            onTap: () async {
               await Navigator.push(
                 context, 
                 MaterialPageRoute(builder: (_) => TaskDetailScreen(task: task))
               );
               _refreshTasks();
            },
          )),
        ],
      ),
    );
  }
}

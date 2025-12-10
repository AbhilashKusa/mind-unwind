import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:google_fonts/google_fonts.dart';
import '../providers/auth_provider.dart';
import '../services/api_service.dart';
import '../models/task.dart';
import '../widgets/task_card.dart';
import '../widgets/stats_card.dart';

import '../widgets/brainstorm_sheet.dart';
import 'task_detail_screen.dart';
import 'profile_screen.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
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
    // Note: User info is now accessed via Provider in MainScreen or here if needed for header.
    // For now, we'll keep the header here as part of the "Home" view.
    final auth = Provider.of<AuthProvider>(context);
    final user = auth.user;

    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: Column(
          children: [
            // Custom Header
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 20, 20, 10),
              child: Row(
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Good Afternoon,',
                        style: GoogleFonts.poppins(fontSize: 14, color: Colors.grey[600]),
                      ),
                      Text(
                        user?.name ?? 'User',
                        style: GoogleFonts.poppins(
                          fontSize: 24,
                          fontWeight: FontWeight.bold,
                          color: Colors.black,
                        ),
                      ),
                    ],
                  ),
                  const Spacer(),
                  GestureDetector(
                    onTap: () {
                      showModalBottomSheet(
                        context: context,
                        isScrollControlled: true,
                        backgroundColor: Colors.transparent,
                        builder: (context) => const BrainstormSheet(),
                      );
                    },
                    child: Container(
                      width: 40,
                      height: 40,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: Colors.white,
                        border: Border.all(color: Colors.black, width: 2),
                      ),
                      child: const Icon(Icons.lightbulb_outline, color: Colors.black),
                    ),
                  ),
                  const SizedBox(width: 12),
                  GestureDetector(
                    onTap: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(builder: (_) => const ProfileScreen()),
                      );
                    },
                    child: Container(
                      width: 40,
                      height: 40,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: Colors.grey[200],
                        border: Border.all(color: Colors.black, width: 2),
                      ),
                      child: const Icon(Icons.person, color: Colors.black),
                    ),
                  ),
                ],
              ),
            ),

            // Main Content
            Expanded(
              child: FutureBuilder<List<Task>>(
                future: _tasksFuture,
                builder: (context, snapshot) {
                   if (snapshot.connectionState == ConnectionState.waiting) {
                      return const Center(child: CircularProgressIndicator(color: Colors.black));
                   }

                   final tasks = snapshot.data ?? [];
                   final pendingCount = tasks.where((t) => !t.isCompleted).length;
                   final completedCount = tasks.where((t) => t.isCompleted).length;

                   return RefreshIndicator(
                     onRefresh: () async => _refreshTasks(),
                     color: Colors.black,
                     child: ListView(
                       padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
                       children: [
                         // Stats Row
                         SizedBox(
                           height: 140,
                           child: ListView(
                             scrollDirection: Axis.horizontal,
                             children: [
                               StatsCard(
                                 label: 'Pending Tasks',
                                 value: '$pendingCount',
                                 icon: Icons.pending_actions,
                                 isPrimary: true,
                               ),
                               StatsCard(
                                 label: 'Completed',
                                 value: '$completedCount',
                                 icon: Icons.check_circle_outline,
                                 isPrimary: false,
                               ),
                             ],
                           ),
                         ),
                         const SizedBox(height: 24),

                         // Quick Actions / AI Preview (can link to Command Center)
                         Container(
                           padding: const EdgeInsets.all(16),
                           decoration: BoxDecoration(
                             color: Colors.black,
                             borderRadius: BorderRadius.circular(12),
                           ),
                           child: Row(
                             children: [
                               const Icon(Icons.auto_awesome, color: Colors.white),
                               const SizedBox(width: 12),
                               Column(
                                 crossAxisAlignment: CrossAxisAlignment.start,
                                 children: [
                                   Text('Command Center', style: GoogleFonts.poppins(color: Colors.white, fontWeight: FontWeight.bold)),
                                   Text('Tap "AI" tab to optimize', style: GoogleFonts.poppins(color: Colors.grey[400], fontSize: 12)),
                                 ],
                               )
                             ],
                           ),
                         ),
                         
                         const SizedBox(height: 24),
                         
                         // Task List
                         Row(
                           mainAxisAlignment: MainAxisAlignment.spaceBetween,
                           children: [
                             const Text('My Tasks', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
                             Icon(Icons.filter_list, color: Colors.grey[600]),
                           ],
                         ),
                         const SizedBox(height: 16),

                         if (tasks.isEmpty)
                            const Padding(
                              padding: EdgeInsets.only(top: 40),
                              child: Center(child: Text("No tasks yet. Enjoy your day!")),
                            ),

                         ...tasks.map((task) => TaskCard(
                           task: task, 
                           onToggle: () => _toggleTask(task),
                           onTap: () async {
                              await Navigator.push(
                                context,
                                MaterialPageRoute(builder: (_) => TaskDetailScreen(task: task)),
                              );
                              _refreshTasks();
                           },
                         )),
                         
                         const SizedBox(height: 80),
                       ],
                     ),
                   );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}

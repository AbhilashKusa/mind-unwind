import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:table_calendar/table_calendar.dart';
import 'package:intl/intl.dart';
import '../models/task.dart';
import '../services/api_service.dart';
import '../widgets/task_card.dart';
import 'task_detail_screen.dart';

class CalendarScreen extends StatefulWidget {
  const CalendarScreen({super.key});

  @override
  State<CalendarScreen> createState() => _CalendarScreenState();
}

class _CalendarScreenState extends State<CalendarScreen> {
  DateTime _focusedDay = DateTime.now();
  DateTime? _selectedDay;
  late Future<List<Task>> _tasksFuture;
  List<Task> _allTasks = [];

  @override
  void initState() {
    super.initState();
    _selectedDay = _focusedDay;
    _refreshTasks();
  }

  void _refreshTasks() {
    setState(() {
      _tasksFuture = ApiService.getTasks().then((tasks) {
        _allTasks = tasks;
        return tasks;
      });
    });
  }

  List<Task> _getTasksForDay(DateTime day) {
    String dateStr = DateFormat('yyyy-MM-dd').format(day);
    return _allTasks.where((task) {
      return task.dueDate == dateStr;
    }).toList();
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
        title: Text('CALENDAR', style: GoogleFonts.poppins(fontWeight: FontWeight.bold, color: Colors.black, letterSpacing: 2)),
        centerTitle: true,
        backgroundColor: Colors.white,
        elevation: 0,
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(2.0),
          child: Container(color: Colors.black, height: 2.0),
        ),
      ),
      body: Column(
        children: [
          // Calendar Widget
          FutureBuilder<List<Task>>(
            future: _tasksFuture,
            builder: (context, snapshot) {
              // We just use this to trigger rebuilds when tasks load
              // The actual tasks are in _allTasks which _getTasksForDay uses
              
              return TableCalendar<Task>(
                firstDay: DateTime.utc(2020, 10, 16),
                lastDay: DateTime.utc(2030, 3, 14),
                focusedDay: _focusedDay,
                selectedDayPredicate: (day) => isSameDay(_selectedDay, day),
                calendarFormat: CalendarFormat.month,
                startingDayOfWeek: StartingDayOfWeek.monday,
                calendarStyle: CalendarStyle(
                  selectedDecoration: const BoxDecoration(
                    color: Colors.black,
                    shape: BoxShape.circle,
                  ),
                  todayDecoration: BoxDecoration(
                    color: Colors.transparent,
                    shape: BoxShape.circle,
                    border: Border.all(color: Colors.black, width: 2),
                  ),
                  todayTextStyle: const TextStyle(color: Colors.black, fontWeight: FontWeight.bold),
                  markerDecoration: const BoxDecoration(
                    color: Colors.grey,
                    shape: BoxShape.circle,
                  ),
                ),
                headerStyle: HeaderStyle(
                  titleCentered: true,
                  formatButtonVisible: false,
                  titleTextStyle: GoogleFonts.poppins(fontWeight: FontWeight.bold, fontSize: 16),
                  leftChevronIcon: const Icon(Icons.chevron_left, color: Colors.black),
                  rightChevronIcon: const Icon(Icons.chevron_right, color: Colors.black),
                ),
                eventLoader: _getTasksForDay,
                onDaySelected: (selectedDay, focusedDay) {
                  setState(() {
                    _selectedDay = selectedDay;
                    _focusedDay = focusedDay;
                  });
                },
                onPageChanged: (focusedDay) {
                  _focusedDay = focusedDay;
                },
              );
            }
          ),
          
          const Divider(color: Colors.black, thickness: 1),
          
          // Task List for Selected Day
          Expanded(
            child: ListView(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
              children: [
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 10),
                  child: Text(
                    DateFormat('EEEE, MMMM d').format(_selectedDay!),
                    style: GoogleFonts.poppins(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.grey[800]),
                  ),
                ),
                ..._getTasksForDay(_selectedDay!).map((task) => TaskCard(
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
                if (_getTasksForDay(_selectedDay!).isEmpty)
                   Padding(
                     padding: const EdgeInsets.only(top: 40),
                     child: Center(
                       child: Column(
                         children: [
                           Icon(Icons.event_available, size: 48, color: Colors.grey[300]),
                           const SizedBox(height: 16),
                           Text("No tasks for this day", style: GoogleFonts.poppins(color: Colors.grey[400])),
                         ],
                       )
                     ),
                   ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

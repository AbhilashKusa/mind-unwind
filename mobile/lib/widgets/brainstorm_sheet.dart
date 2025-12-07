import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../services/ai_service.dart';
import '../services/api_service.dart';
import '../models/task.dart';

class BrainstormSheet extends StatefulWidget {
  const BrainstormSheet({super.key});

  @override
  State<BrainstormSheet> createState() => _BrainstormSheetState();
}

class _BrainstormSheetState extends State<BrainstormSheet> {
  final _controller = TextEditingController();
  bool _isLoading = false;
  List<Map<String, dynamic>> _ideas = [];
  final Set<int> _addedIndices = {};

  Future<void> _generate() async {
    if (_controller.text.isEmpty) return;
    setState(() => _isLoading = true);
    
    final ideas = await AiService.brainstormIdeas(_controller.text);
    
    setState(() {
      _ideas = ideas;
      _isLoading = false;
    });
  }

  Future<void> _addIdea(int index) async {
    setState(() => _addedIndices.add(index));
    final idea = _ideas[index];
    
    final newTask = Task(
      id: DateTime.now().millisecondsSinceEpoch.toString(),
      title: idea['title'],
      description: idea['description'] ?? '',
      priority: idea['priority'] ?? 'Medium',
      category: idea['category'] ?? 'General',
      isCompleted: false,
      createdAt: DateTime.now().millisecondsSinceEpoch,
      dueDate: null,
    );
    
    await ApiService.createTask(newTask);
    
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text("Task Added!")));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.only(
        top: 24, 
        left: 24, 
        right: 24,
        bottom: MediaQuery.of(context).viewInsets.bottom + 24
      ),
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.lightbulb, color: Colors.yellow, size: 28),
              const SizedBox(width: 8),
              Text('Brainstorm', style: GoogleFonts.poppins(fontSize: 20, fontWeight: FontWeight.bold)),
              const Spacer(),
              IconButton(onPressed: () => Navigator.pop(context), icon: const Icon(Icons.close))
            ],
          ),
          const SizedBox(height: 16),
          if (_ideas.isEmpty) ...[
            Text("What's your goal?", style: GoogleFonts.poppins(color: Colors.grey[600])),
            const SizedBox(height: 8),
            TextField(
              controller: _controller,
              decoration: const InputDecoration(
                hintText: 'e.g., "Plan a marketing campaign" or "Learn Flutter"',
                border: OutlineInputBorder(),
              ),
              enabled: !_isLoading,
            ),
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              height: 50,
              child: ElevatedButton(
                onPressed: _isLoading ? null : _generate,
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.black,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                ),
                child: _isLoading 
                  ? const CircularProgressIndicator(color: Colors.white)
                  : const Text("GENERATE IDEAS"),
              ),
            )
          ] else ...[
            Text("Here are some ideas:", style: GoogleFonts.poppins(fontWeight: FontWeight.bold)),
            const SizedBox(height: 12),
            Flexible(
              child: Container(
                constraints: BoxConstraints(maxHeight: MediaQuery.of(context).size.height * 0.5),
                child: ListView.separated(
                  shrinkWrap: true,
                  itemCount: _ideas.length,
                  separatorBuilder: (_, __) => const Divider(),
                  itemBuilder: (context, index) {
                    final idea = _ideas[index];
                    final isAdded = _addedIndices.contains(index);
                    return ListTile(
                      title: Text(idea['title'], style: GoogleFonts.poppins(fontWeight: FontWeight.bold)),
                      subtitle: Text(idea['description'] ?? ''),
                      trailing: IconButton(
                        icon: Icon(isAdded ? Icons.check_circle : Icons.add_circle_outline, color: isAdded ? Colors.green : Colors.black),
                        onPressed: isAdded ? null : () => _addIdea(index),
                      ),
                    );
                  },
                ),
              ),
            ),
            const SizedBox(height: 16),
            TextButton(
              onPressed: () => setState(() => _ideas = []),
              child: const Text("Start Over"),
            )
          ]
        ],
      ),
    );
  }
}

class Task {
  final String id;
  final String title;
  final String description;
  final String priority;
  final String category;
  final bool isCompleted;
  final String? dueDate;
  final int createdAt;
  final List<dynamic> subtasks;
  final List<dynamic> comments;

  Task({
    required this.id,
    required this.title,
    required this.description,
    required this.priority,
    required this.category,
    required this.isCompleted,
    this.dueDate,
    required this.createdAt,
    this.subtasks = const [],
    this.comments = const [],
  });

  factory Task.fromJson(Map<String, dynamic> json) {
    return Task(
      id: json['id'] ?? '',
      title: json['title'] ?? '',
      description: json['description'] ?? '',
      priority: json['priority'] ?? 'Medium',
      category: json['category'] ?? 'General',
      isCompleted: json['isCompleted'] ?? false,
      dueDate: json['dueDate'],
      createdAt: json['createdAt'] ?? 0,
      subtasks: json['subtasks'] ?? [],
      comments: json['comments'] ?? [],
    );
  }
}

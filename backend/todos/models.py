from django.db import models
from django.contrib.auth.models import User

class Task(models.Model):
    STATUS_CHOICES = [('pending', 'Pending'), ('in_progress', 'In Progress'), ('done', 'Done')]

    todo=models.ForeignKey(Todo, on_delete=models.CASCADE, related_name='tasks')
    name=models.CharField(max_length=255)
    status=models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')








    
class Todo(models.Model):
    PRIORITY_CHOICES = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='todos')
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    due_date = models.DateField(null=True, blank=True)
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default='medium')
    completed = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title
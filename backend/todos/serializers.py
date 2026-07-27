from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Todo, Task


class TaskSerializer(serializers.ModelSerializer):
    elapsed_seconds = serializers.SerializerMethodField()

    class Meta:
        model = Task
        fields = [
            'id', 'todo', 'name', 'status',
            'accumulated_seconds', 'started_at', 'elapsed_seconds', 'created_at',
        ]
        read_only_fields = ['id', 'accumulated_seconds', 'started_at', 'created_at']

    def get_elapsed_seconds(self, obj):
        if obj.started_at is not None:
            from django.utils import timezone
            current_session = (timezone.now() - obj.started_at).total_seconds()
            return obj.accumulated_seconds + int(current_session)
        return obj.accumulated_seconds



class TodoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Todo
        fields = ['id', 'title', 'description', 'due_date', 'priority', 'completed', 'created_at','tasks']
        read_only_fields = ['id', 'created_at']


    
class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=6)

    class Meta:
        model = User
        fields = ['id', 'username', 'password', 'email']

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data.get('email', ''),
            password=validated_data['password'],
        )
        return user
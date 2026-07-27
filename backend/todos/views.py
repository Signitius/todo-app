from rest_framework import viewsets, generics, permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.contrib.auth.models import User
from django.utils import timezone
from .models import Todo, Task
from .serializers import TodoSerializer, RegisterSerializer, TaskSerializer


class TodoViewSet(viewsets.ModelViewSet):
    serializer_class = TodoSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Todo.objects.filter(user=self.request.user).order_by('due_date')

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]


class TaskListCreateView(generics.ListCreateAPIView):
    serializer_class = TaskSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Task.objects.filter(todo__user=self.request.user)


class TaskDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = TaskSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Task.objects.filter(todo__user=self.request.user)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def start_task(request, pk):
    try:
        task = Task.objects.get(pk=pk, todo__user=request.user)
    except Task.DoesNotExist:
        return Response({'error': 'Task not found.'}, status=status.HTTP_404_NOT_FOUND)

    if task.started_at is not None:
        return Response({'error': 'Task is already running.'}, status=status.HTTP_400_BAD_REQUEST)

    task.started_at = timezone.now()
    task.status = 'in_progress'
    task.save()
    return Response(TaskSerializer(task).data)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def pause_task(request, pk):
    try:
        task = Task.objects.get(pk=pk, todo__user=request.user)
    except Task.DoesNotExist:
        return Response({'error': 'Task not found.'}, status=status.HTTP_404_NOT_FOUND)

    if task.started_at is None:
        return Response({'error': 'Task is not currently running.'}, status=status.HTTP_400_BAD_REQUEST)

    elapsed = (timezone.now() - task.started_at).total_seconds()
    task.accumulated_seconds += int(elapsed)
    task.started_at = None
    task.status = 'pending'
    task.save()
    return Response(TaskSerializer(task).data)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def finish_task(request, pk):
    try:
        task = Task.objects.get(pk=pk, todo__user=request.user)
    except Task.DoesNotExist:
        return Response({'error': 'Task not found.'}, status=status.HTTP_404_NOT_FOUND)

    if task.started_at is not None:
        elapsed = (timezone.now() - task.started_at).total_seconds()
        task.accumulated_seconds += int(elapsed)
        task.started_at = None

    task.status = 'done'
    task.save()
    return Response(TaskSerializer(task).data)
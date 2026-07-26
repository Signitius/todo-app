from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import (
    TodoViewSet,
    TaskListCreateView,
    TaskDetailView,
    start_task,
    pause_task,
    finish_task,
)

router = DefaultRouter()
router.register(r'todos', TodoViewSet, basename='todo')

urlpatterns = router.urls + [
    path('tasks/', TaskListCreateView.as_view(), name='task-list-create'),
    path('tasks/<int:pk>/', TaskDetailView.as_view(), name='task-detail'),
    path('tasks/<int:pk>/start/', start_task, name='task-start'),
    path('tasks/<int:pk>/pause/', pause_task, name='task-pause'),
    path('tasks/<int:pk>/finish/', finish_task, name='task-finish'),
]
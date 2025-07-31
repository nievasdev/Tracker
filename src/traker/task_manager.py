from typing import List, Optional, Dict
from datetime import datetime
import json
from pathlib import Path

from .task import Task, TaskStatus

class TaskManager:
    def __init__(self, data_file: Optional[str] = None):
        self.tasks: Dict[str, Task] = {}
        self.data_file = data_file or str(Path.home() / ".traker_tasks.json")
        self.current_task: Optional[Task] = None
        self.load_tasks()
        
    def create_task(self, title: str, description: str = "") -> Task:
        task = Task(title, description)
        self.tasks[task.id] = task
        task.subdivide()
        self.save_tasks()
        return task
        
    def get_task(self, task_id: str) -> Optional[Task]:
        return self.tasks.get(task_id)
        
    def get_all_tasks(self) -> List[Task]:
        return [task for task in self.tasks.values() if task.parent_id is None]
        
    def get_subtasks(self, parent_id: str) -> List[Task]:
        parent = self.get_task(parent_id)
        return parent.subtasks if parent else []
        
    def start_task(self, task_id: str) -> bool:
        task = self.get_task(task_id)
        if task and task.status == TaskStatus.PENDING:
            if self.current_task:
                self.current_task.pause()
            task.start()
            self.current_task = task
            self.save_tasks()
            return True
        return False
        
    def resume_task(self, task_id: str) -> bool:
        task = self.get_task(task_id)
        if task and task.status == TaskStatus.PAUSED:
            if self.current_task and self.current_task != task:
                self.current_task.pause()
            task.resume()
            task.add_context_task()
            self.current_task = task
            self.save_tasks()
            return True
        return False
        
    def pause_current_task(self) -> bool:
        if self.current_task:
            self.current_task.pause()
            self.current_task = None
            self.save_tasks()
            return True
        return False
        
    def complete_task(self, task_id: str) -> bool:
        task = self.get_task(task_id)
        if task:
            task.complete()
            if self.current_task == task:
                self.current_task = None
            self.save_tasks()
            return True
        return False
        
    def delete_task(self, task_id: str) -> bool:
        if task_id in self.tasks:
            task = self.tasks[task_id]
            for subtask in task.subtasks:
                if subtask.id in self.tasks:
                    del self.tasks[subtask.id]
            del self.tasks[task_id]
            if self.current_task and self.current_task.id == task_id:
                self.current_task = None
            self.save_tasks()
            return True
        return False
        
    def add_subtask(self, parent_id: str, title: str, description: str = "", duration: int = 50) -> Optional[Task]:
        parent = self.get_task(parent_id)
        if parent:
            subtask = parent.create_subtask(title, description, duration)
            self.tasks[subtask.id] = subtask
            self.save_tasks()
            return subtask
        return None
        
    def log_time_block(self, task_id: str, duration: int, is_break: bool = False):
        task = self.get_task(task_id)
        if task:
            task.add_time_block(duration, is_break)
            self.save_tasks()
            
    def get_tasks_needing_break(self) -> List[Task]:
        return [task for task in self.tasks.values() if task.should_take_break()]
        
    def get_active_tasks(self) -> List[Task]:
        return [task for task in self.tasks.values() 
                if task.status in [TaskStatus.IN_PROGRESS, TaskStatus.PAUSED]]
        
    def get_completed_tasks(self) -> List[Task]:
        return [task for task in self.tasks.values() if task.status == TaskStatus.COMPLETED]
        
    def save_tasks(self):
        try:
            data = {}
            for task_id, task in self.tasks.items():
                data[task_id] = self._task_to_dict(task)
                
            with open(self.data_file, 'w') as f:
                json.dump(data, f, indent=2, default=str)
        except Exception as e:
            print(f"Error saving tasks: {e}")
            
    def load_tasks(self):
        try:
            if Path(self.data_file).exists():
                with open(self.data_file, 'r') as f:
                    data = json.load(f)
                    
                for task_id, task_data in data.items():
                    task = self._dict_to_task(task_data)
                    self.tasks[task_id] = task
                    
                self._rebuild_task_relationships()
        except Exception as e:
            print(f"Error loading tasks: {e}")
            
    def _task_to_dict(self, task: Task) -> dict:
        return {
            'id': task.id,
            'title': task.title,
            'description': task.description,
            'parent_id': task.parent_id,
            'status': task.status.value,
            'task_type': task.task_type.value,
            'created_at': task.created_at.isoformat(),
            'started_at': task.started_at.isoformat() if task.started_at else None,
            'completed_at': task.completed_at.isoformat() if task.completed_at else None,
            'estimated_duration': task.estimated_duration,
            'actual_duration': task.actual_duration,
            'time_blocks': task.time_blocks,
            'is_resumed': task.is_resumed
        }
        
    def _dict_to_task(self, data: dict) -> Task:
        task = Task(data['title'], data['description'], data.get('parent_id'))
        task.id = data['id']
        task.status = TaskStatus(data['status'])
        task.created_at = datetime.fromisoformat(data['created_at'])
        task.started_at = datetime.fromisoformat(data['started_at']) if data.get('started_at') else None
        task.completed_at = datetime.fromisoformat(data['completed_at']) if data.get('completed_at') else None
        task.estimated_duration = data['estimated_duration']
        task.actual_duration = data['actual_duration']
        task.time_blocks = data.get('time_blocks', [])
        task.is_resumed = data.get('is_resumed', False)
        return task
        
    def _rebuild_task_relationships(self):
        for task in self.tasks.values():
            if task.parent_id:
                parent = self.tasks.get(task.parent_id)
                if parent and task not in parent.subtasks:
                    parent.subtasks.append(task)
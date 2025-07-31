from datetime import datetime, timedelta
from typing import List, Optional
from enum import Enum
import uuid

class TaskStatus(Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    PAUSED = "paused"
    COMPLETED = "completed"

class TaskType(Enum):
    MAIN = "main"
    SUBTASK = "subtask"
    CONTEXT = "context"

class Task:
    def __init__(self, title: str, description: str = "", parent_id: Optional[str] = None):
        self.id = str(uuid.uuid4())
        self.title = title
        self.description = description
        self.parent_id = parent_id
        self.status = TaskStatus.PENDING
        self.task_type = TaskType.MAIN if parent_id is None else TaskType.SUBTASK
        self.created_at = datetime.now()
        self.started_at: Optional[datetime] = None
        self.completed_at: Optional[datetime] = None
        self.estimated_duration = 30  # minutes, starts at 30 for first tasks
        self.actual_duration = 0
        self.time_blocks: List[dict] = []
        self.subtasks: List['Task'] = []
        self.is_resumed = False
        
    def start(self):
        if self.status == TaskStatus.PENDING:
            self.status = TaskStatus.IN_PROGRESS
            self.started_at = datetime.now()
            
    def pause(self):
        if self.status == TaskStatus.IN_PROGRESS:
            self.status = TaskStatus.PAUSED
            
    def resume(self):
        if self.status == TaskStatus.PAUSED:
            self.status = TaskStatus.IN_PROGRESS
            self.is_resumed = True
            
    def complete(self):
        self.status = TaskStatus.COMPLETED
        self.completed_at = datetime.now()
        if self.started_at:
            self.actual_duration = (self.completed_at - self.started_at).total_seconds() / 60
            
    def add_time_block(self, duration: int, is_break: bool = False):
        block = {
            'duration': duration,
            'is_break': is_break,
            'timestamp': datetime.now()
        }
        self.time_blocks.append(block)
        
    def subdivide(self) -> List['Task']:
        if not self.subtasks:
            subdivision_task = Task(
                title=f"Subdivide: {self.title}",
                description="Break down this task into smaller subtasks",
                parent_id=self.id
            )
            subdivision_task.task_type = TaskType.SUBTASK
            subdivision_task.estimated_duration = 25
            self.subtasks.append(subdivision_task)
            
        return self.subtasks
        
    def add_context_task(self):
        if self.is_resumed and not any(st.task_type == TaskType.CONTEXT for st in self.subtasks):
            context_task = Task(
                title="Context Recovery",
                description="Get back into context of what was being done",
                parent_id=self.id
            )
            context_task.task_type = TaskType.CONTEXT
            context_task.estimated_duration = 25
            self.subtasks.insert(0, context_task)
            
    def create_subtask(self, title: str, description: str = "", duration: int = 50):
        subtask = Task(title=title, description=description, parent_id=self.id)
        subtask.task_type = TaskType.SUBTASK
        subtask.estimated_duration = min(duration, 50)  # Max 50 minutes
        self.subtasks.append(subtask)
        return subtask
        
    def get_total_estimated_time(self) -> int:
        total = self.estimated_duration
        for subtask in self.subtasks:
            total += subtask.get_total_estimated_time()
        return total
        
    def get_progress_percentage(self) -> float:
        if not self.subtasks:
            return 100.0 if self.status == TaskStatus.COMPLETED else 0.0
            
        completed_subtasks = sum(1 for st in self.subtasks if st.status == TaskStatus.COMPLETED)
        return (completed_subtasks / len(self.subtasks)) * 100 if self.subtasks else 0.0
        
    def should_take_break(self) -> bool:
        if not self.time_blocks:
            return False
            
        work_blocks = [b for b in self.time_blocks if not b['is_break']]
        if not work_blocks:
            return False
            
        last_break_index = -1
        for i, block in enumerate(reversed(self.time_blocks)):
            if block['is_break']:
                last_break_index = len(self.time_blocks) - 1 - i
                break
                
        work_since_break = 0
        for i in range(last_break_index + 1, len(self.time_blocks)):
            if not self.time_blocks[i]['is_break']:
                work_since_break += self.time_blocks[i]['duration']
                
        return work_since_break >= 50
        
    def __repr__(self):
        return f"Task('{self.title}', status={self.status.value}, type={self.task_type.value})"
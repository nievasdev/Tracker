const { v4: uuidv4 } = require('uuid');

// Task status enumeration
const TaskStatus = {
    PENDING: 'pending',
    IN_PROGRESS: 'in_progress',
    PAUSED: 'paused',
    COMPLETED: 'completed'
};

// Task type enumeration
const TaskType = {
    MAIN: 'main',
    SUBTASK: 'subtask',
    CONTEXT: 'context'
};

class Task {
    constructor(title, description = '', parentId = null) {
        this.id = uuidv4();
        this.title = title;
        this.description = description;
        this.parentId = parentId;
        this.workspaceId = null; // Will be set by TaskManager
        this.status = TaskStatus.PENDING;
        this.taskType = parentId === null ? TaskType.MAIN : TaskType.SUBTASK;
        this.createdAt = new Date();
        this.startedAt = null;
        this.completedAt = null;
        this.estimatedDuration = 30; // minutes, starts at 30 for first tasks
        this.actualDuration = 0;
        this.timeBlocks = [];
        this.subtasks = [];
        this.isResumed = false;
    }

    start() {
        if (this.status === TaskStatus.PENDING) {
            this.status = TaskStatus.IN_PROGRESS;
            this.startedAt = new Date();
        }
    }

    pause() {
        if (this.status === TaskStatus.IN_PROGRESS) {
            this.status = TaskStatus.PAUSED;
        }
    }

    resume() {
        if (this.status === TaskStatus.PAUSED) {
            this.status = TaskStatus.IN_PROGRESS;
            this.isResumed = true;
        }
    }

    complete() {
        this.status = TaskStatus.COMPLETED;
        this.completedAt = new Date();
        if (this.startedAt) {
            this.actualDuration = (this.completedAt - this.startedAt) / (1000 * 60); // minutes
        }
    }

    addTimeBlock(duration, isBreak = false) {
        const block = {
            duration: duration,
            isBreak: isBreak,
            timestamp: new Date()
        };
        this.timeBlocks.push(block);
    }

    subdivide() {
        if (this.subtasks.length === 0) {
            const subdivisionTask = new Task(
                `Subdivide: ${this.title}`,
                'Break down this task into smaller subtasks',
                this.id
            );
            subdivisionTask.taskType = TaskType.SUBTASK;
            subdivisionTask.estimatedDuration = 25;
            this.subtasks.push(subdivisionTask);
        }
        return this.subtasks;
    }

    addContextTask() {
        if (this.isResumed && !this.subtasks.some(st => st.taskType === TaskType.CONTEXT)) {
            const contextTask = new Task(
                'Context Recovery',
                'Get back into context of what was being done',
                this.id
            );
            contextTask.taskType = TaskType.CONTEXT;
            contextTask.estimatedDuration = 25;
            this.subtasks.unshift(contextTask);
        }
    }

    createSubtask(title, description = '', duration = 50) {
        const subtask = new Task(title, description, this.id);
        subtask.taskType = TaskType.SUBTASK;
        subtask.estimatedDuration = Math.min(duration, 50); // Max 50 minutes
        this.subtasks.push(subtask);
        return subtask;
    }

    getTotalEstimatedTime() {
        let total = this.estimatedDuration;
        for (const subtask of this.subtasks) {
            total += subtask.getTotalEstimatedTime();
        }
        return total;
    }

    getProgressPercentage() {
        if (this.subtasks.length === 0) {
            return this.status === TaskStatus.COMPLETED ? 100.0 : 0.0;
        }

        const completedSubtasks = this.subtasks.filter(st => st.status === TaskStatus.COMPLETED).length;
        return this.subtasks.length > 0 ? (completedSubtasks / this.subtasks.length) * 100 : 0.0;
    }

    shouldTakeBreak() {
        if (this.timeBlocks.length === 0) {
            return false;
        }

        const workBlocks = this.timeBlocks.filter(b => !b.isBreak);
        if (workBlocks.length === 0) {
            return false;
        }

        let lastBreakIndex = -1;
        for (let i = this.timeBlocks.length - 1; i >= 0; i--) {
            if (this.timeBlocks[i].isBreak) {
                lastBreakIndex = i;
                break;
            }
        }

        let workSinceBreak = 0;
        for (let i = lastBreakIndex + 1; i < this.timeBlocks.length; i++) {
            if (!this.timeBlocks[i].isBreak) {
                workSinceBreak += this.timeBlocks[i].duration;
            }
        }

        return workSinceBreak >= 50;
    }

    // Convert to plain object for JSON serialization
    toJSON() {
        return {
            id: this.id,
            title: this.title,
            description: this.description,
            parentId: this.parentId,
            workspaceId: this.workspaceId,
            status: this.status,
            taskType: this.taskType,
            createdAt: this.createdAt.toISOString(),
            startedAt: this.startedAt ? this.startedAt.toISOString() : null,
            completedAt: this.completedAt ? this.completedAt.toISOString() : null,
            estimatedDuration: this.estimatedDuration,
            actualDuration: this.actualDuration,
            timeBlocks: this.timeBlocks.map(block => ({
                ...block,
                timestamp: block.timestamp.toISOString()
            })),
            subtasks: this.subtasks.map(subtask => subtask.toJSON()),
            isResumed: this.isResumed
        };
    }

    // Create Task from plain object
    static fromJSON(data) {
        const task = new Task(data.title, data.description, data.parentId);
        task.id = data.id;
        task.workspaceId = data.workspaceId;
        task.status = data.status;
        task.taskType = data.taskType;
        task.createdAt = new Date(data.createdAt);
        task.startedAt = data.startedAt ? new Date(data.startedAt) : null;
        task.completedAt = data.completedAt ? new Date(data.completedAt) : null;
        task.estimatedDuration = data.estimatedDuration;
        task.actualDuration = data.actualDuration;
        task.timeBlocks = (data.timeBlocks || []).map(block => ({
            ...block,
            timestamp: new Date(block.timestamp)
        }));
        task.subtasks = (data.subtasks || []).map(subtaskData => Task.fromJSON(subtaskData));
        task.isResumed = data.isResumed || false;
        return task;
    }

    toString() {
        return `Task('${this.title}', status=${this.status}, type=${this.taskType})`;
    }
}

module.exports = { Task, TaskStatus, TaskType };
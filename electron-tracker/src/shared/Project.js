const { v4: uuidv4 } = require('uuid');

const ProjectStatus = {
    ACTIVE: 'active',
    ON_HOLD: 'on_hold',
    COMPLETED: 'completed',
    ARCHIVED: 'archived'
};

class Project {
    constructor(name, description = '', workspaceId = null) {
        this.id = uuidv4();
        this.name = name;
        this.description = description;
        this.workspaceId = workspaceId;
        this.status = ProjectStatus.ACTIVE;
        this.createdAt = new Date();
        this.updatedAt = new Date();
        this.color = '#81a1c1'; // Default Nordic blue
        this.tasks = []; // Array of task IDs
        this.priority = 'medium'; // low, medium, high
        this.deadline = null;
        this.progress = 0; // 0-100 percentage
    }

    // Update project progress based on completed tasks
    updateProgress(completedTasks, totalTasks) {
        if (totalTasks === 0) {
            this.progress = 0;
        } else {
            this.progress = Math.round((completedTasks / totalTasks) * 100);
        }
        this.updatedAt = new Date();
    }

    // Get project status color
    getStatusColor() {
        switch (this.status) {
            case ProjectStatus.ACTIVE:
                return '#a3be8c'; // Nordic green
            case ProjectStatus.ON_HOLD:
                return '#ebcb8b'; // Nordic yellow
            case ProjectStatus.COMPLETED:
                return '#88c0d0'; // Nordic cyan
            case ProjectStatus.ARCHIVED:
                return '#4c566a'; // Nordic gray
            default:
                return '#81a1c1'; // Nordic blue
        }
    }

    // Get priority color
    getPriorityColor() {
        switch (this.priority) {
            case 'high':
                return '#bf616a'; // Nordic red
            case 'medium':
                return '#ebcb8b'; // Nordic yellow
            case 'low':
                return '#88c0d0'; // Nordic cyan
            default:
                return '#81a1c1'; // Nordic blue
        }
    }

    // Check if project is overdue
    isOverdue() {
        if (!this.deadline) return false;
        return new Date() > new Date(this.deadline) && this.status !== ProjectStatus.COMPLETED;
    }

    // Add task to project
    addTask(taskId) {
        if (!this.tasks.includes(taskId)) {
            this.tasks.push(taskId);
            this.updatedAt = new Date();
        }
    }

    // Remove task from project
    removeTask(taskId) {
        const index = this.tasks.indexOf(taskId);
        if (index > -1) {
            this.tasks.splice(index, 1);
            this.updatedAt = new Date();
        }
    }

    // Convert to plain object for JSON serialization
    toJSON() {
        return {
            id: this.id,
            name: this.name,
            description: this.description,
            workspaceId: this.workspaceId,
            status: this.status,
            createdAt: this.createdAt.toISOString(),
            updatedAt: this.updatedAt.toISOString(),
            color: this.color,
            tasks: this.tasks,
            priority: this.priority,
            deadline: this.deadline ? this.deadline.toISOString() : null,
            progress: this.progress
        };
    }

    // Create Project from plain object
    static fromJSON(data) {
        const project = new Project(data.name, data.description, data.workspaceId);
        project.id = data.id;
        project.status = data.status;
        project.createdAt = new Date(data.createdAt);
        project.updatedAt = new Date(data.updatedAt);
        project.color = data.color || '#81a1c1';
        project.tasks = data.tasks || [];
        project.priority = data.priority || 'medium';
        project.deadline = data.deadline ? new Date(data.deadline) : null;
        project.progress = data.progress || 0;
        return project;
    }

    toString() {
        return `Project: ${this.name} (${this.status}) - ${this.progress}% complete`;
    }
}

module.exports = { Project, ProjectStatus };
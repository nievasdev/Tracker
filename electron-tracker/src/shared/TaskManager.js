const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const { Task, TaskStatus } = require('./Task');

class TaskManager {
    constructor(dataFile = null) {
        this.tasks = new Map();
        this.dataFile = dataFile || path.join(os.homedir(), '.tracker_tasks.json');
        this.currentTask = null;
    }

    async initialize() {
        await this.loadTasks();
    }

    createTask(title, description = '') {
        const task = new Task(title, description);
        this.tasks.set(task.id, task);
        task.subdivide();
        this.saveTasks();
        return task;
    }

    getTask(taskId) {
        return this.tasks.get(taskId) || null;
    }

    getAllTasks() {
        return Array.from(this.tasks.values()).filter(task => task.parentId === null);
    }

    getSubtasks(parentId) {
        const parent = this.getTask(parentId);
        return parent ? parent.subtasks : [];
    }

    startTask(taskId) {
        const task = this.getTask(taskId);
        if (task && task.status === TaskStatus.PENDING) {
            if (this.currentTask) {
                this.currentTask.pause();
            }
            task.start();
            this.currentTask = task;
            this.saveTasks();
            return true;
        }
        return false;
    }

    resumeTask(taskId) {
        const task = this.getTask(taskId);
        if (task && task.status === TaskStatus.PAUSED) {
            if (this.currentTask && this.currentTask !== task) {
                this.currentTask.pause();
            }
            task.resume();
            task.addContextTask();
            this.currentTask = task;
            this.saveTasks();
            return true;
        }
        return false;
    }

    pauseCurrentTask() {
        if (this.currentTask) {
            this.currentTask.pause();
            this.currentTask = null;
            this.saveTasks();
            return true;
        }
        return false;
    }

    completeTask(taskId) {
        const task = this.getTask(taskId);
        if (task) {
            task.complete();
            if (this.currentTask === task) {
                this.currentTask = null;
            }
            this.saveTasks();
            return true;
        }
        return false;
    }

    deleteTask(taskId) {
        const task = this.getTask(taskId);
        if (task) {
            // Delete all subtasks first
            for (const subtask of task.subtasks) {
                this.tasks.delete(subtask.id);
            }
            this.tasks.delete(taskId);
            if (this.currentTask && this.currentTask.id === taskId) {
                this.currentTask = null;
            }
            this.saveTasks();
            return true;
        }
        return false;
    }

    addSubtask(parentId, title, description = '', duration = 50) {
        const parent = this.getTask(parentId);
        if (parent) {
            const subtask = parent.createSubtask(title, description, duration);
            this.tasks.set(subtask.id, subtask);
            this.saveTasks();
            return subtask;
        }
        return null;
    }

    logTimeBlock(taskId, duration, isBreak = false) {
        const task = this.getTask(taskId);
        if (task) {
            task.addTimeBlock(duration, isBreak);
            this.saveTasks();
        }
    }

    getTasksNeedingBreak() {
        return Array.from(this.tasks.values()).filter(task => task.shouldTakeBreak());
    }

    getActiveTasks() {
        return Array.from(this.tasks.values()).filter(task => 
            task.status === TaskStatus.IN_PROGRESS || task.status === TaskStatus.PAUSED
        );
    }

    getCompletedTasks() {
        return Array.from(this.tasks.values()).filter(task => task.status === TaskStatus.COMPLETED);
    }

    async saveTasks() {
        try {
            const data = {};
            for (const [taskId, task] of this.tasks) {
                data[taskId] = task.toJSON();
            }
            await fs.writeFile(this.dataFile, JSON.stringify(data, null, 2));
        } catch (error) {
            console.error('Error saving tasks:', error);
        }
    }

    async loadTasks() {
        try {
            const fileExists = await fs.access(this.dataFile).then(() => true).catch(() => false);
            if (fileExists) {
                const data = await fs.readFile(this.dataFile, 'utf8');
                const tasksData = JSON.parse(data);
                
                this.tasks.clear();
                for (const [taskId, taskData] of Object.entries(tasksData)) {
                    const task = Task.fromJSON(taskData);
                    this.tasks.set(taskId, task);
                }
                
                this.rebuildTaskRelationships();
            }
        } catch (error) {
            console.error('Error loading tasks:', error);
        }
    }

    rebuildTaskRelationships() {
        // Rebuild parent-child relationships
        for (const task of this.tasks.values()) {
            if (task.parentId) {
                const parent = this.tasks.get(task.parentId);
                if (parent && !parent.subtasks.some(st => st.id === task.id)) {
                    parent.subtasks.push(task);
                }
            }
        }
    }

    // Get task statistics
    getStatistics() {
        const allTasks = Array.from(this.tasks.values());
        const mainTasks = allTasks.filter(task => task.parentId === null);
        
        return {
            totalTasks: mainTasks.length,
            completedTasks: mainTasks.filter(task => task.status === TaskStatus.COMPLETED).length,
            activeTasks: mainTasks.filter(task => 
                task.status === TaskStatus.IN_PROGRESS || task.status === TaskStatus.PAUSED
            ).length,
            pendingTasks: mainTasks.filter(task => task.status === TaskStatus.PENDING).length,
            totalTimeSpent: allTasks.reduce((total, task) => total + task.actualDuration, 0)
        };
    }
}

module.exports = { TaskManager };
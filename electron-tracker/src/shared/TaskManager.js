const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const { Task, TaskStatus } = require('./Task');
const { Workspace } = require('./Workspace');

class TaskManager {
    constructor(dataFile = null) {
        this.tasks = new Map();
        this.workspaces = new Map();
        this.currentWorkspaceId = null;
        this.dataFile = dataFile || path.join(os.homedir(), '.tracker_tasks.json');
        this.workspacesFile = dataFile ? dataFile.replace('.json', '_workspaces.json') : path.join(os.homedir(), '.tracker_workspaces.json');
        this.currentTask = null;
    }

    async initialize() {
        await this.loadWorkspaces();
        await this.loadTasks();
        
        // Create default workspaces if none exist
        if (this.workspaces.size === 0) {
            await this.createDefaultWorkspaces();
        }
        
        // Set current workspace to first available if none set
        if (!this.currentWorkspaceId && this.workspaces.size > 0) {
            this.currentWorkspaceId = Array.from(this.workspaces.keys())[0];
        }
    }

    createTask(title, description = '', workspaceId = null) {
        const task = new Task(title, description);
        task.workspaceId = workspaceId || this.currentWorkspaceId;
        this.tasks.set(task.id, task);
        task.subdivide();
        this.saveTasks();
        return task;
    }

    getTask(taskId) {
        return this.tasks.get(taskId) || null;
    }

    getAllTasks(workspaceId = null) {
        const targetWorkspace = workspaceId || this.currentWorkspaceId;
        return Array.from(this.tasks.values()).filter(task => 
            task.parentId === null && task.workspaceId === targetWorkspace
        );
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

    // Workspace management methods
    async createDefaultWorkspaces() {
        const workWorkspace = new Workspace('Work', '#81a1c1');
        workWorkspace.isDefault = true;
        const personalWorkspace = new Workspace('Personal', '#a3be8c');
        
        this.workspaces.set(workWorkspace.id, workWorkspace);
        this.workspaces.set(personalWorkspace.id, personalWorkspace);
        this.currentWorkspaceId = workWorkspace.id;
        
        await this.saveWorkspaces();
    }

    createWorkspace(name, color = '#81a1c1') {
        const workspace = new Workspace(name, color);
        this.workspaces.set(workspace.id, workspace);
        this.saveWorkspaces();
        return workspace;
    }

    deleteWorkspace(workspaceId) {
        if (this.workspaces.size <= 1) {
            return false; // Cannot delete the last workspace
        }
        
        const workspace = this.workspaces.get(workspaceId);
        if (!workspace) return false;
        
        // Delete all tasks in this workspace
        const tasksToDelete = Array.from(this.tasks.values()).filter(task => task.workspaceId === workspaceId);
        for (const task of tasksToDelete) {
            this.deleteTask(task.id);
        }
        
        this.workspaces.delete(workspaceId);
        
        // Switch to another workspace if current was deleted
        if (this.currentWorkspaceId === workspaceId) {
            this.currentWorkspaceId = Array.from(this.workspaces.keys())[0];
        }
        
        this.saveWorkspaces();
        return true;
    }

    switchWorkspace(workspaceId) {
        if (this.workspaces.has(workspaceId)) {
            this.currentWorkspaceId = workspaceId;
            // Pause current task when switching workspaces
            if (this.currentTask) {
                this.currentTask.pause();
                this.currentTask = null;
            }
            return true;
        }
        return false;
    }

    getAllWorkspaces() {
        return Array.from(this.workspaces.values());
    }

    getCurrentWorkspace() {
        return this.workspaces.get(this.currentWorkspaceId);
    }

    async saveWorkspaces() {
        try {
            const data = {};
            for (const [workspaceId, workspace] of this.workspaces) {
                data[workspaceId] = workspace.toJSON();
            }
            const workspaceData = {
                workspaces: data,
                currentWorkspaceId: this.currentWorkspaceId
            };
            await fs.writeFile(this.workspacesFile, JSON.stringify(workspaceData, null, 2));
        } catch (error) {
            console.error('Error saving workspaces:', error);
        }
    }

    async loadWorkspaces() {
        try {
            const fileExists = await fs.access(this.workspacesFile).then(() => true).catch(() => false);
            if (fileExists) {
                const data = await fs.readFile(this.workspacesFile, 'utf8');
                const workspaceData = JSON.parse(data);
                
                this.workspaces.clear();
                for (const [workspaceId, wsData] of Object.entries(workspaceData.workspaces || {})) {
                    const workspace = Workspace.fromJSON(wsData);
                    this.workspaces.set(workspaceId, workspace);
                }
                
                this.currentWorkspaceId = workspaceData.currentWorkspaceId;
            }
        } catch (error) {
            console.error('Error loading workspaces:', error);
        }
    }

    // Get task statistics
    getStatistics(workspaceId = null) {
        const targetWorkspace = workspaceId || this.currentWorkspaceId;
        const allTasks = Array.from(this.tasks.values()).filter(task => task.workspaceId === targetWorkspace);
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
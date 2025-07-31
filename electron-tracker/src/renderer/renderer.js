// Renderer process for Traker Electron app
const { ipcRenderer } = require('electron');

class TrakerUI {
    constructor() {
        this.tasks = [];
        this.workspaces = [];
        this.currentWorkspace = null;
        this.currentTask = null;
        this.timerState = {
            running: false,
            timeRemaining: 0,
            isBreakTime: false,
            intervalId: null
        };
        this.currentSubtaskParent = null;

        this.initializeElements();
        this.attachEventListeners();
        this.loadWorkspaces();
        this.loadTasks();
    }

    initializeElements() {
        // Header elements
        this.addTaskBtn = document.getElementById('add-task-btn');
        this.refreshBtn = document.getElementById('refresh-btn');

        // Workspace elements
        this.workspaceTabsContainer = document.getElementById('workspace-tabs-container');
        this.addWorkspaceBtn = document.getElementById('add-workspace-btn');

        // Timer elements
        this.currentTaskTitle = document.getElementById('current-task-title');
        this.currentTaskStatus = document.getElementById('current-task-status');
        this.timerDisplay = document.getElementById('timer-display');
        this.timerStatus = document.getElementById('timer-status');
        this.start25Btn = document.getElementById('start-25-btn');
        this.start50Btn = document.getElementById('start-50-btn');
        this.startBreakBtn = document.getElementById('start-break-btn');
        this.pauseTimerBtn = document.getElementById('pause-timer-btn');
        this.stopTimerBtn = document.getElementById('stop-timer-btn');
        this.customDuration = document.getElementById('custom-duration');
        this.startCustomBtn = document.getElementById('start-custom-btn');

        // Task list
        this.taskList = document.getElementById('task-list');

        // Modals
        this.addTaskModal = document.getElementById('add-task-modal');
        this.addSubtaskModal = document.getElementById('add-subtask-modal');
        this.addWorkspaceModal = document.getElementById('add-workspace-modal');
        this.closeModalBtn = document.getElementById('close-modal-btn');
        this.closeSubtaskModalBtn = document.getElementById('close-subtask-modal-btn');
        this.closeWorkspaceModalBtn = document.getElementById('close-workspace-modal-btn');

        // Forms
        this.addTaskForm = document.getElementById('add-task-form');
        this.addSubtaskForm = document.getElementById('add-subtask-form');
        this.addWorkspaceForm = document.getElementById('add-workspace-form');
        this.taskTitle = document.getElementById('task-title');
        this.taskDescription = document.getElementById('task-description');
        this.subtaskTitle = document.getElementById('subtask-title');
        this.subtaskDuration = document.getElementById('subtask-duration');
        this.workspaceName = document.getElementById('workspace-name');
        this.workspaceColor = document.getElementById('workspace-color');

        // Notification container
        this.notificationContainer = document.getElementById('notification-container');
    }

    attachEventListeners() {
        // Header actions
        this.addTaskBtn.addEventListener('click', () => this.showAddTaskModal());
        this.refreshBtn.addEventListener('click', () => this.loadTasks());

        // Workspace actions
        this.addWorkspaceBtn.addEventListener('click', () => this.showAddWorkspaceModal());

        // Timer controls
        this.start25Btn.addEventListener('click', () => this.startTimer(25));
        this.start50Btn.addEventListener('click', () => this.startTimer(50));
        this.startBreakBtn.addEventListener('click', () => this.startBreakTimer());
        this.pauseTimerBtn.addEventListener('click', () => this.pauseTimer());
        this.stopTimerBtn.addEventListener('click', () => this.stopTimer());
        this.startCustomBtn.addEventListener('click', () => {
            const duration = parseInt(this.customDuration.value);
            this.startTimer(duration);
        });

        // Modal controls
        this.closeModalBtn.addEventListener('click', () => this.hideAddTaskModal());
        this.closeSubtaskModalBtn.addEventListener('click', () => this.hideAddSubtaskModal());
        this.closeWorkspaceModalBtn.addEventListener('click', () => this.hideAddWorkspaceModal());
        document.getElementById('cancel-task-btn').addEventListener('click', () => this.hideAddTaskModal());
        document.getElementById('cancel-subtask-btn').addEventListener('click', () => this.hideAddSubtaskModal());
        document.getElementById('cancel-workspace-btn').addEventListener('click', () => this.hideAddWorkspaceModal());

        // Form submissions
        this.addTaskForm.addEventListener('submit', (e) => this.handleAddTask(e));
        this.addSubtaskForm.addEventListener('submit', (e) => this.handleAddSubtask(e));
        this.addWorkspaceForm.addEventListener('submit', (e) => this.handleAddWorkspace(e));

        // Close modals on outside click
        this.addTaskModal.addEventListener('click', (e) => {
            if (e.target === this.addTaskModal) this.hideAddTaskModal();
        });
        this.addSubtaskModal.addEventListener('click', (e) => {
            if (e.target === this.addSubtaskModal) this.hideAddSubtaskModal();
        });
        this.addWorkspaceModal.addEventListener('click', (e) => {
            if (e.target === this.addWorkspaceModal) this.hideAddWorkspaceModal();
        });

        // Color preset handling
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('color-preset')) {
                const color = e.target.dataset.color;
                this.workspaceColor.value = color;
                
                // Update selected state
                document.querySelectorAll('.color-preset').forEach(preset => {
                    preset.classList.remove('selected');
                });
                e.target.classList.add('selected');
            }
        });

        // IPC listeners
        ipcRenderer.on('tasks-updated', (event, tasks) => {
            this.tasks = tasks;
            this.renderTasks();
        });

        ipcRenderer.on('timer-notification', (event, message, type) => {
            this.showNotification(message, type);
        });

        ipcRenderer.on('workspaces-updated', (event, workspaces, currentWorkspace) => {
            this.workspaces = workspaces;
            this.currentWorkspace = currentWorkspace;
            this.renderWorkspaceTabs();
        });
    }

    // Workspace Management
    async loadWorkspaces() {
        try {
            const workspaces = await ipcRenderer.invoke('get-all-workspaces');
            const currentWorkspace = await ipcRenderer.invoke('get-current-workspace');
            this.workspaces = workspaces;
            this.currentWorkspace = currentWorkspace;
            this.renderWorkspaceTabs();
        } catch (error) {
            this.showNotification('Error loading workspaces', 'error');
            console.error('Error loading workspaces:', error);
        }
    }

    async handleAddWorkspace(e) {
        e.preventDefault();
        const name = this.workspaceName.value.trim();
        const color = this.workspaceColor.value;

        if (!name) return;

        try {
            await ipcRenderer.invoke('create-workspace', name, color);
            this.hideAddWorkspaceModal();
            this.addWorkspaceForm.reset();
            this.showNotification('Workspace created successfully', 'success');
        } catch (error) {
            this.showNotification('Error creating workspace', 'error');
            console.error('Error creating workspace:', error);
        }
    }

    async switchToWorkspace(workspaceId) {
        try {
            await ipcRenderer.invoke('switch-workspace', workspaceId);
            this.loadTasks(); // Reload tasks for new workspace
            this.showNotification('Switched workspace', 'success');
        } catch (error) {
            this.showNotification('Error switching workspace', 'error');
            console.error('Error switching workspace:', error);
        }
    }

    async deleteWorkspace(workspaceId) {
        if (this.workspaces.length <= 1) {
            this.showNotification('Cannot delete the last workspace', 'warning');
            return;
        }

        if (confirm('Are you sure you want to delete this workspace? All tasks in it will be deleted.')) {
            try {
                await ipcRenderer.invoke('delete-workspace', workspaceId);
                this.showNotification('Workspace deleted', 'info');
            } catch (error) {
                this.showNotification('Error deleting workspace', 'error');
                console.error('Error deleting workspace:', error);
            }
        }
    }

    renderWorkspaceTabs() {
        this.workspaceTabsContainer.innerHTML = '';

        this.workspaces.forEach(workspace => {
            const tab = document.createElement('div');
            tab.className = `workspace-tab ${workspace.id === this.currentWorkspace?.id ? 'active' : ''}`;
            tab.addEventListener('click', () => this.switchToWorkspace(workspace.id));

            const color = document.createElement('div');
            color.className = 'tab-color';
            color.style.backgroundColor = workspace.color;

            const name = document.createElement('span');
            name.className = 'tab-name';
            name.textContent = workspace.name;

            const closeBtn = document.createElement('button');
            closeBtn.className = 'tab-close';
            closeBtn.textContent = '×';
            closeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.deleteWorkspace(workspace.id);
            });

            tab.appendChild(color);
            tab.appendChild(name);
            if (this.workspaces.length > 1) {
                tab.appendChild(closeBtn);
            }

            this.workspaceTabsContainer.appendChild(tab);
        });
    }

    // Task Management
    async loadTasks() {
        try {
            const tasks = await ipcRenderer.invoke('get-all-tasks');
            this.tasks = tasks;
            this.renderTasks();
        } catch (error) {
            this.showNotification('Error loading tasks', 'error');
            console.error('Error loading tasks:', error);
        }
    }

    async handleAddTask(e) {
        e.preventDefault();
        const title = this.taskTitle.value.trim();
        const description = this.taskDescription.value.trim();

        if (!title) return;

        try {
            await ipcRenderer.invoke('create-task', title, description);
            this.hideAddTaskModal();
            this.addTaskForm.reset();
            this.loadTasks();
            this.showNotification('Task created successfully', 'success');
        } catch (error) {
            this.showNotification('Error creating task', 'error');
            console.error('Error creating task:', error);
        }
    }

    async handleAddSubtask(e) {
        e.preventDefault();
        const title = this.subtaskTitle.value.trim();
        const duration = parseInt(this.subtaskDuration.value);

        if (!title || !this.currentSubtaskParent) return;

        try {
            await ipcRenderer.invoke('add-subtask', this.currentSubtaskParent, title, '', duration);
            this.hideAddSubtaskModal();
            this.addSubtaskForm.reset();
            this.loadTasks();
            this.showNotification('Subtask added successfully', 'success');
        } catch (error) {
            this.showNotification('Error adding subtask', 'error');
            console.error('Error adding subtask:', error);
        }
    }

    async startTask(taskId) {
        try {
            const success = await ipcRenderer.invoke('start-task', taskId);
            if (success) {
                const task = await ipcRenderer.invoke('get-task', taskId);
                this.setCurrentTask(task);
                this.loadTasks();
                this.showNotification('Task started', 'success');
            }
        } catch (error) {
            this.showNotification('Error starting task', 'error');
            console.error('Error starting task:', error);
        }
    }

    async resumeTask(taskId) {
        try {
            const success = await ipcRenderer.invoke('resume-task', taskId);
            if (success) {
                const task = await ipcRenderer.invoke('get-task', taskId);
                this.setCurrentTask(task);
                this.loadTasks();
                this.showNotification('Task resumed', 'success');
            }
        } catch (error) {
            this.showNotification('Error resuming task', 'error');
            console.error('Error resuming task:', error);
        }
    }

    async pauseTask(taskId) {
        try {
            await ipcRenderer.invoke('pause-current-task');
            this.clearCurrentTask();
            this.loadTasks();
            this.showNotification('Task paused', 'info');
        } catch (error) {
            this.showNotification('Error pausing task', 'error');
            console.error('Error pausing task:', error);
        }
    }

    async completeTask(taskId) {
        try {
            await ipcRenderer.invoke('complete-task', taskId);
            if (this.currentTask && this.currentTask.id === taskId) {
                this.clearCurrentTask();
            }
            this.loadTasks();
            this.showNotification('Task completed', 'success');
        } catch (error) {
            this.showNotification('Error completing task', 'error');
            console.error('Error completing task:', error);
        }
    }

    async deleteTask(taskId) {
        if (confirm('Are you sure you want to delete this task?')) {
            try {
                await ipcRenderer.invoke('delete-task', taskId);
                if (this.currentTask && this.currentTask.id === taskId) {
                    this.clearCurrentTask();
                }
                this.loadTasks();
                this.showNotification('Task deleted', 'info');
            } catch (error) {
                this.showNotification('Error deleting task', 'error');
                console.error('Error deleting task:', error);
            }
        }
    }

    // Timer Management
    startTimer(minutes) {
        if (!this.currentTask && !this.timerState.isBreakTime) {
            this.showNotification('Please select a task first', 'warning');
            return;
        }

        this.timerState.timeRemaining = minutes * 60;
        this.timerState.isBreakTime = false;
        this.timerState.running = true;

        this.updateTimerDisplay();
        this.updateTimerControls();

        this.timerState.intervalId = setInterval(() => {
            this.timerTick();
        }, 1000);

        this.timerStatus.textContent = `Working - ${minutes} minutes`;
        this.showNotification(`Started ${minutes}-minute work session`, 'info');
    }

    startBreakTimer() {
        this.timerState.timeRemaining = 10 * 60; // 10 minutes
        this.timerState.isBreakTime = true;
        this.timerState.running = true;

        this.updateTimerDisplay();
        this.updateTimerControls();

        this.timerState.intervalId = setInterval(() => {
            this.timerTick();
        }, 1000);

        this.timerStatus.textContent = 'Break time - 10 minutes';
        this.showNotification('Started 10-minute break', 'info');
    }

    pauseTimer() {
        if (this.timerState.intervalId) {
            clearInterval(this.timerState.intervalId);
            this.timerState.intervalId = null;
            this.timerState.running = false;
            this.timerStatus.textContent = 'Timer paused';
            this.updateTimerControls();
            this.showNotification('Timer paused', 'info');
        }
    }

    stopTimer() {
        if (this.timerState.intervalId) {
            clearInterval(this.timerState.intervalId);
            this.timerState.intervalId = null;
        }

        this.timerState.running = false;
        this.timerState.timeRemaining = 0;
        this.timerState.isBreakTime = false;
        this.updateTimerDisplay();
        this.timerStatus.textContent = 'Timer stopped';
        this.updateTimerControls();
        this.showNotification('Timer stopped', 'info');
    }

    timerTick() {
        if (this.timerState.timeRemaining > 0) {
            this.timerState.timeRemaining--;
            this.updateTimerDisplay();
        } else {
            this.timerFinished();
        }
    }

    async timerFinished() {
        this.timerState.running = false;
        this.timerState.intervalId = null;

        if (this.timerState.isBreakTime) {
            this.timerStatus.textContent = 'Break finished!';
            this.showNotification('Break time is over! Ready to get back to work.', 'success');
            if (this.currentTask) {
                await ipcRenderer.invoke('log-time-block', this.currentTask.id, 10, true);
            }
        } else {
            this.timerStatus.textContent = 'Work session finished!';
            this.showNotification('Work session complete! Time for a break?', 'success');
            if (this.currentTask) {
                const workMinutes = Math.ceil((Date.now() - this.timerStartTime) / (1000 * 60));
                await ipcRenderer.invoke('log-time-block', this.currentTask.id, workMinutes, false);
                
                // Check if break is needed
                const task = await ipcRenderer.invoke('get-task', this.currentTask.id);
                if (task && task.shouldTakeBreak && task.shouldTakeBreak()) {
                    this.showNotification('Time for a break!', 'warning');
                }
            }
        }

        this.timerState.isBreakTime = false;
        this.updateTimerControls();
    }

    updateTimerDisplay() {
        const minutes = Math.floor(this.timerState.timeRemaining / 60);
        const seconds = this.timerState.timeRemaining % 60;
        const timeStr = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

        this.timerDisplay.textContent = timeStr;
        this.timerDisplay.className = `timer-display ${this.timerState.isBreakTime ? 'break-time' : 'work-time'}`;
    }

    updateTimerControls() {
        const hasCurrentTask = this.currentTask !== null;
        const isRunning = this.timerState.running;

        this.start25Btn.disabled = isRunning || !hasCurrentTask;
        this.start50Btn.disabled = isRunning || !hasCurrentTask;
        this.startBreakBtn.disabled = isRunning;
        this.startCustomBtn.disabled = isRunning || !hasCurrentTask;
        this.pauseTimerBtn.disabled = !isRunning;
        this.stopTimerBtn.disabled = !isRunning && this.timerState.timeRemaining === 0;
    }

    // UI Management
    setCurrentTask(task) {
        this.currentTask = task;
        this.currentTaskTitle.textContent = `Task: ${task.title}`;
        this.currentTaskStatus.textContent = `Status: ${task.status}`;
        this.updateTimerControls();
    }

    clearCurrentTask() {
        this.currentTask = null;
        this.currentTaskTitle.textContent = 'No task selected';
        this.currentTaskStatus.textContent = '';
        this.updateTimerControls();
    }

    renderTasks() {
        this.taskList.innerHTML = '';

        this.tasks.forEach(task => {
            const taskElement = this.createTaskElement(task);
            this.taskList.appendChild(taskElement);
        });
    }

    createTaskElement(task) {
        const taskDiv = document.createElement('div');
        taskDiv.className = 'task-item';

        const taskHeader = document.createElement('div');
        taskHeader.className = 'task-header';

        const taskInfo = document.createElement('div');
        taskInfo.className = 'task-info';

        const taskTitle = document.createElement('div');
        taskTitle.className = 'task-title';
        taskTitle.textContent = task.title;

        const taskStatus = document.createElement('div');
        taskStatus.className = `task-status status-${task.status.replace('_', '-')}`;
        taskStatus.textContent = `Status: ${task.status}`;

        const taskProgress = document.createElement('div');
        taskProgress.className = 'task-progress';
        taskProgress.textContent = `Progress: ${task.progressPercentage?.toFixed(1) || 0}%`;

        taskInfo.appendChild(taskTitle);
        taskInfo.appendChild(taskStatus);

        if (task.description) {
            const taskDescription = document.createElement('div');
            taskDescription.className = 'task-description';
            taskDescription.textContent = task.description;
            taskInfo.appendChild(taskDescription);
        }

        taskInfo.appendChild(taskProgress);

        const taskActions = document.createElement('div');
        taskActions.className = 'task-actions';

        // Task action buttons
        if (task.status === 'pending') {
            const startBtn = this.createButton('Start', 'btn-start', () => this.startTask(task.id));
            taskActions.appendChild(startBtn);
        } else if (task.status === 'paused') {
            const resumeBtn = this.createButton('Resume', 'btn-start', () => this.resumeTask(task.id));
            taskActions.appendChild(resumeBtn);
        } else if (task.status === 'in_progress') {
            const pauseBtn = this.createButton('Pause', 'btn-pause', () => this.pauseTask(task.id));
            taskActions.appendChild(pauseBtn);
        }

        if (task.status !== 'completed') {
            const completeBtn = this.createButton('Complete', 'btn-complete', () => this.completeTask(task.id));
            taskActions.appendChild(completeBtn);
        }

        const addSubtaskBtn = this.createButton('Add Subtask', 'btn-start', () => this.showAddSubtaskModal(task.id));
        const deleteBtn = this.createButton('Delete', 'btn-delete', () => this.deleteTask(task.id));

        taskActions.appendChild(addSubtaskBtn);
        taskActions.appendChild(deleteBtn);

        taskHeader.appendChild(taskInfo);
        taskHeader.appendChild(taskActions);
        taskDiv.appendChild(taskHeader);

        // Render subtasks
        if (task.subtasks && task.subtasks.length > 0) {
            const subtasksDiv = this.createSubtasksElement(task.subtasks);
            taskDiv.appendChild(subtasksDiv);
        }

        return taskDiv;
    }

    createSubtasksElement(subtasks) {
        const subtasksDiv = document.createElement('div');
        subtasksDiv.className = 'subtasks';

        const subtasksTitle = document.createElement('div');
        subtasksTitle.className = 'subtasks-title';
        subtasksTitle.textContent = 'Subtasks:';
        subtasksDiv.appendChild(subtasksTitle);

        subtasks.forEach(subtask => {
            const subtaskDiv = document.createElement('div');
            subtaskDiv.className = `subtask-item ${subtask.taskType === 'context' ? 'context-task' : ''}`;

            const subtaskHeader = document.createElement('div');
            subtaskHeader.className = 'subtask-header';

            const subtaskInfo = document.createElement('div');
            subtaskInfo.className = `subtask-info status-${subtask.status.replace('_', '-')}`;
            subtaskInfo.textContent = `• ${subtask.title} (${subtask.status})`;

            const subtaskActions = document.createElement('div');
            subtaskActions.className = 'subtask-actions';

            if (subtask.status === 'pending') {
                const startBtn = this.createButton('Start', 'btn-start', () => this.startTask(subtask.id), true);
                subtaskActions.appendChild(startBtn);
            } else if (subtask.status === 'in_progress') {
                const pauseBtn = this.createButton('Pause', 'btn-pause', () => this.pauseTask(subtask.id), true);
                subtaskActions.appendChild(pauseBtn);
            }

            if (subtask.status !== 'completed') {
                const completeBtn = this.createButton('Complete', 'btn-complete', () => this.completeTask(subtask.id), true);
                subtaskActions.appendChild(completeBtn);
            }

            subtaskHeader.appendChild(subtaskInfo);
            subtaskHeader.appendChild(subtaskActions);
            subtaskDiv.appendChild(subtaskHeader);
            subtasksDiv.appendChild(subtaskDiv);
        });

        return subtasksDiv;
    }

    createButton(text, className, onclick, small = false) {
        const button = document.createElement('button');
        button.className = `btn ${className}`;
        button.textContent = text;
        button.addEventListener('click', onclick);
        if (small) {
            button.style.fontSize = '12px';
            button.style.padding = '4px 8px';
        }
        return button;
    }

    // Modal Management
    showAddTaskModal() {
        this.addTaskModal.classList.remove('hidden');
        this.taskTitle.focus();
    }

    hideAddTaskModal() {
        this.addTaskModal.classList.add('hidden');
        this.addTaskForm.reset();
    }

    showAddSubtaskModal(parentId) {
        this.currentSubtaskParent = parentId;
        this.addSubtaskModal.classList.remove('hidden');
        this.subtaskTitle.focus();
    }

    hideAddSubtaskModal() {
        this.addSubtaskModal.classList.add('hidden');
        this.addSubtaskForm.reset();
        this.currentSubtaskParent = null;
    }

    showAddWorkspaceModal() {
        this.addWorkspaceModal.classList.remove('hidden');
        this.workspaceName.focus();
        
        // Reset color presets selection
        document.querySelectorAll('.color-preset').forEach(preset => {
            preset.classList.remove('selected');
        });
        document.querySelector('.color-preset[data-color="#81a1c1"]')?.classList.add('selected');
    }

    hideAddWorkspaceModal() {
        this.addWorkspaceModal.classList.add('hidden');
        this.addWorkspaceForm.reset();
        
        // Reset color presets selection
        document.querySelectorAll('.color-preset').forEach(preset => {
            preset.classList.remove('selected');
        });
    }

    // Notification System
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;

        this.notificationContainer.appendChild(notification);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 5000);
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.trackerUI = new TrakerUI();
});
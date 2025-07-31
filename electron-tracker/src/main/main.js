const { app, BrowserWindow, ipcMain, Menu, dialog, shell } = require('electron');
const path = require('path');
const { TaskManager } = require('../shared/TaskManager');

class TrakerApp {
    constructor() {
        this.mainWindow = null;
        this.taskManager = new TaskManager();
        this.isDev = process.argv.includes('--dev');
        
        this.setupApp();
        this.setupIPC();
    }

    setupApp() {
        // Handle app ready
        app.whenReady().then(() => {
            this.createWindow();
            this.createMenu();
            this.initializeTaskManager();
        });

        // Handle window closed
        app.on('window-all-closed', () => {
            if (process.platform !== 'darwin') {
                app.quit();
            }
        });

        // Handle app activation (macOS)
        app.on('activate', () => {
            if (BrowserWindow.getAllWindows().length === 0) {
                this.createWindow();
            }
        });

        // Security: Prevent new window creation
        app.on('web-contents-created', (event, contents) => {
            contents.on('new-window', (event, navigationUrl) => {
                event.preventDefault();
                shell.openExternal(navigationUrl);
            });
        });
    }

    async createWindow() {
        // Create the browser window
        this.mainWindow = new BrowserWindow({
            width: 1200,
            height: 800,
            minWidth: 800,
            minHeight: 600,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false,
                enableRemoteModule: false
            },
            icon: path.join(__dirname, '../../assets/icon.png'),
            show: false,
            titleBarStyle: 'default'
        });

        // Load the app
        await this.mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

        // Show window when ready
        this.mainWindow.once('ready-to-show', () => {
            this.mainWindow.show();
            
            if (this.isDev) {
                this.mainWindow.webContents.openDevTools();
            }
        });

        // Handle window closed
        this.mainWindow.on('closed', () => {
            this.mainWindow = null;
        });
    }

    createMenu() {
        // Remove the application menu completely
        Menu.setApplicationMenu(null);
    }

    async initializeTaskManager() {
        try {
            await this.taskManager.initialize();
            console.log('TaskManager initialized successfully');
        } catch (error) {
            console.error('Failed to initialize TaskManager:', error);
            dialog.showErrorBox('Initialization Error', 'Failed to initialize task manager. The application may not work correctly.');
        }
    }

    setupIPC() {
        // Task Management IPC handlers
        ipcMain.handle('get-all-tasks', async () => {
            try {
                return this.taskManager.getAllTasks();
            } catch (error) {
                console.error('Error getting all tasks:', error);
                throw error;
            }
        });

        ipcMain.handle('get-task', async (event, taskId) => {
            try {
                return this.taskManager.getTask(taskId);
            } catch (error) {
                console.error('Error getting task:', error);
                throw error;
            }
        });

        ipcMain.handle('create-task', async (event, title, description) => {
            try {
                const task = this.taskManager.createTask(title, description);
                this.notifyTasksUpdated();
                return task;
            } catch (error) {
                console.error('Error creating task:', error);
                throw error;
            }
        });

        ipcMain.handle('start-task', async (event, taskId) => {
            try {
                const success = this.taskManager.startTask(taskId);
                if (success) {
                    this.notifyTasksUpdated();
                }
                return success;
            } catch (error) {
                console.error('Error starting task:', error);
                throw error;
            }
        });

        ipcMain.handle('resume-task', async (event, taskId) => {
            try {
                const success = this.taskManager.resumeTask(taskId);
                if (success) {
                    this.notifyTasksUpdated();
                }
                return success;
            } catch (error) {
                console.error('Error resuming task:', error);
                throw error;
            }
        });

        ipcMain.handle('pause-current-task', async () => {
            try {
                const success = this.taskManager.pauseCurrentTask();
                if (success) {
                    this.notifyTasksUpdated();
                }
                return success;
            } catch (error) {
                console.error('Error pausing task:', error);
                throw error;
            }
        });

        ipcMain.handle('complete-task', async (event, taskId) => {
            try {
                const success = this.taskManager.completeTask(taskId);
                if (success) {
                    this.notifyTasksUpdated();
                }
                return success;
            } catch (error) {
                console.error('Error completing task:', error);
                throw error;
            }
        });

        ipcMain.handle('delete-task', async (event, taskId) => {
            try {
                const success = this.taskManager.deleteTask(taskId);
                if (success) {
                    this.notifyTasksUpdated();
                }
                return success;
            } catch (error) {
                console.error('Error deleting task:', error);
                throw error;
            }
        });

        ipcMain.handle('add-subtask', async (event, parentId, title, description, duration) => {
            try {
                const subtask = this.taskManager.addSubtask(parentId, title, description, duration);
                if (subtask) {
                    this.notifyTasksUpdated();
                }
                return subtask;
            } catch (error) {
                console.error('Error adding subtask:', error);
                throw error;
            }
        });

        ipcMain.handle('log-time-block', async (event, taskId, duration, isBreak) => {
            try {
                this.taskManager.logTimeBlock(taskId, duration, isBreak);
                return true;
            } catch (error) {
                console.error('Error logging time block:', error);
                throw error;
            }
        });

        ipcMain.handle('get-statistics', async () => {
            try {
                return this.taskManager.getStatistics();
            } catch (error) {
                console.error('Error getting statistics:', error);
                throw error;
            }
        });

        // Workspace Management IPC handlers
        ipcMain.handle('get-all-workspaces', async () => {
            try {
                return this.taskManager.getAllWorkspaces();
            } catch (error) {
                console.error('Error getting workspaces:', error);
                throw error;
            }
        });

        ipcMain.handle('get-current-workspace', async () => {
            try {
                return this.taskManager.getCurrentWorkspace();
            } catch (error) {
                console.error('Error getting current workspace:', error);
                throw error;
            }
        });

        ipcMain.handle('create-workspace', async (event, name, color) => {
            try {
                const workspace = this.taskManager.createWorkspace(name, color);
                this.notifyWorkspacesUpdated();
                return workspace;
            } catch (error) {
                console.error('Error creating workspace:', error);
                throw error;
            }
        });

        ipcMain.handle('switch-workspace', async (event, workspaceId) => {
            try {
                const success = this.taskManager.switchWorkspace(workspaceId);
                if (success) {
                    this.notifyWorkspacesUpdated();
                    this.notifyProjectsUpdated();
                    this.notifyTasksUpdated();
                }
                return success;
            } catch (error) {
                console.error('Error switching workspace:', error);
                throw error;
            }
        });

        ipcMain.handle('delete-workspace', async (event, workspaceId) => {
            try {
                const success = this.taskManager.deleteWorkspace(workspaceId);
                if (success) {
                    this.notifyWorkspacesUpdated();
                    this.notifyProjectsUpdated();
                    this.notifyTasksUpdated();
                }
                return success;
            } catch (error) {
                console.error('Error deleting workspace:', error);
                throw error;
            }
        });

        // Project Management IPC handlers
        ipcMain.handle('get-all-projects', async () => {
            try {
                return this.taskManager.getAllProjects();
            } catch (error) {
                console.error('Error getting projects:', error);
                throw error;
            }
        });

        ipcMain.handle('get-current-project', async () => {
            try {
                return this.taskManager.getCurrentProject();
            } catch (error) {
                console.error('Error getting current project:', error);
                throw error;
            }
        });

        ipcMain.handle('create-project', async (event, name, description, priority, color) => {
            try {
                const project = this.taskManager.createProject(name, description, priority, color);
                this.notifyProjectsUpdated();
                return project;
            } catch (error) {
                console.error('Error creating project:', error);
                throw error;
            }
        });

        ipcMain.handle('switch-project', async (event, projectId) => {
            try {
                const success = this.taskManager.switchProject(projectId);
                if (success) {
                    this.notifyProjectsUpdated();
                    this.notifyTasksUpdated();
                }
                return success;
            } catch (error) {
                console.error('Error switching project:', error);
                throw error;
            }
        });

        ipcMain.handle('delete-project', async (event, projectId) => {
            try {
                const success = this.taskManager.deleteProject(projectId);
                if (success) {
                    this.notifyProjectsUpdated();
                    this.notifyTasksUpdated();
                }
                return success;
            } catch (error) {
                console.error('Error deleting project:', error);
                throw error;
            }
        });

        // Application IPC handlers
        ipcMain.handle('show-save-dialog', async () => {
            try {
                const result = await dialog.showSaveDialog(this.mainWindow, {
                    title: 'Export Tasks',
                    defaultPath: 'traker-tasks.json',
                    filters: [
                        { name: 'JSON Files', extensions: ['json'] },
                        { name: 'All Files', extensions: ['*'] }
                    ]
                });
                return result;
            } catch (error) {
                console.error('Error showing save dialog:', error);
                throw error;
            }
        });

        ipcMain.handle('show-open-dialog', async () => {
            try {
                const result = await dialog.showOpenDialog(this.mainWindow, {
                    title: 'Import Tasks',
                    filters: [
                        { name: 'JSON Files', extensions: ['json'] },
                        { name: 'All Files', extensions: ['*'] }
                    ],
                    properties: ['openFile']
                });
                return result;
            } catch (error) {
                console.error('Error showing open dialog:', error);
                throw error;
            }
        });
    }

    notifyTasksUpdated() {
        if (this.mainWindow && !this.mainWindow.isDestroyed()) {
            const tasks = this.taskManager.getAllTasks();
            this.mainWindow.webContents.send('tasks-updated', tasks);
        }
    }

    notifyWorkspacesUpdated() {
        if (this.mainWindow && !this.mainWindow.isDestroyed()) {
            const workspaces = this.taskManager.getAllWorkspaces();
            const currentWorkspace = this.taskManager.getCurrentWorkspace();
            this.mainWindow.webContents.send('workspaces-updated', workspaces, currentWorkspace);
        }
    }

    notifyProjectsUpdated() {
        if (this.mainWindow && !this.mainWindow.isDestroyed()) {
            const projects = this.taskManager.getAllProjects();
            const currentProject = this.taskManager.getCurrentProject();
            this.mainWindow.webContents.send('projects-updated', projects, currentProject);
        }
    }

    sendTimerNotification(message, type = 'info') {
        if (this.mainWindow && !this.mainWindow.isDestroyed()) {
            this.mainWindow.webContents.send('timer-notification', message, type);
        }
    }
}

// Initialize the app
new TrakerApp();
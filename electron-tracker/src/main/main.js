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
        const template = [
            {
                label: 'File',
                submenu: [
                    {
                        label: 'New Task',
                        accelerator: 'CmdOrCtrl+N',
                        click: () => {
                            this.mainWindow.webContents.send('show-add-task-modal');
                        }
                    },
                    { type: 'separator' },
                    {
                        label: 'Refresh',
                        accelerator: 'CmdOrCtrl+R',
                        click: () => {
                            this.mainWindow.webContents.send('refresh-tasks');
                        }
                    },
                    { type: 'separator' },
                    {
                        label: 'Quit',
                        accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
                        click: () => {
                            app.quit();
                        }
                    }
                ]
            },
            {
                label: 'Timer',
                submenu: [
                    {
                        label: 'Start 25min',
                        accelerator: 'CmdOrCtrl+1',
                        click: () => {
                            this.mainWindow.webContents.send('start-timer', 25);
                        }
                    },
                    {
                        label: 'Start 50min',
                        accelerator: 'CmdOrCtrl+2',
                        click: () => {
                            this.mainWindow.webContents.send('start-timer', 50);
                        }
                    },
                    {
                        label: 'Start Break',
                        accelerator: 'CmdOrCtrl+B',
                        click: () => {
                            this.mainWindow.webContents.send('start-break-timer');
                        }
                    },
                    { type: 'separator' },
                    {
                        label: 'Pause Timer',
                        accelerator: 'CmdOrCtrl+P',
                        click: () => {
                            this.mainWindow.webContents.send('pause-timer');
                        }
                    },
                    {
                        label: 'Stop Timer',
                        accelerator: 'CmdOrCtrl+S',
                        click: () => {
                            this.mainWindow.webContents.send('stop-timer');
                        }
                    }
                ]
            },
            {
                label: 'View',
                submenu: [
                    { role: 'reload' },
                    { role: 'forceReload' },
                    { role: 'toggleDevTools' },
                    { type: 'separator' },
                    { role: 'resetZoom' },
                    { role: 'zoomIn' },
                    { role: 'zoomOut' },
                    { type: 'separator' },
                    { role: 'togglefullscreen' }
                ]
            },
            {
                label: 'Help',
                submenu: [
                    {
                        label: 'About Traker',
                        click: () => {
                            dialog.showMessageBox(this.mainWindow, {
                                type: 'info',
                                title: 'About Traker',
                                message: 'Traker - Task Manager',
                                detail: 'A productivity-focused task management application with built-in time tracking.\n\nVersion: 1.0.0\nBuilt with Electron and Nordic Dark Theme'
                            });
                        }
                    },
                    {
                        label: 'Keyboard Shortcuts',
                        click: () => {
                            dialog.showMessageBox(this.mainWindow, {
                                type: 'info',
                                title: 'Keyboard Shortcuts',
                                message: 'Traker Shortcuts',
                                detail: 'Ctrl+N - New Task\nCtrl+R - Refresh\nCtrl+1 - Start 25min timer\nCtrl+2 - Start 50min timer\nCtrl+B - Start break\nCtrl+P - Pause timer\nCtrl+S - Stop timer'
                            });
                        }
                    }
                ]
            }
        ];

        // macOS specific menu adjustments
        if (process.platform === 'darwin') {
            template.unshift({
                label: app.getName(),
                submenu: [
                    { role: 'about' },
                    { type: 'separator' },
                    { role: 'services' },
                    { type: 'separator' },
                    { role: 'hide' },
                    { role: 'hideOthers' },
                    { role: 'unhide' },
                    { type: 'separator' },
                    { role: 'quit' }
                ]
            });

            // Window menu
            template[4].submenu = [
                { role: 'close' },
                { role: 'minimize' },
                { role: 'zoom' },
                { type: 'separator' },
                { role: 'front' }
            ];
        }

        const menu = Menu.buildFromTemplate(template);
        Menu.setApplicationMenu(menu);
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

    sendTimerNotification(message, type = 'info') {
        if (this.mainWindow && !this.mainWindow.isDestroyed()) {
            this.mainWindow.webContents.send('timer-notification', message, type);
        }
    }
}

// Initialize the app
new TrakerApp();
# Tracker Electron - Task Tracking Application

A cross-platform task management application built with Electron, featuring Nordic Dark theme and productivity-focused time management.

## Features

- **Task Management**: Create, edit, and manage tasks with automatic subdivision
- **Subtask Creation**: Break down tasks into smaller, manageable pieces (max 50 minutes each)
- **Context Recovery**: Automatic 25-minute "context" tasks when resuming paused work
- **Time Blocks**: Work sessions of 25 or 50 minutes with 10-minute breaks
- **Break Management**: Built-in break timer with notifications
- **Task Persistence**: Tasks are automatically saved to `~/.tracker_tasks.json`
- **Progress Tracking**: Visual progress indicators for tasks and subtasks
- **Nordic Dark Theme**: Beautiful dark theme matching polybar configuration
- **Cross-Platform**: Works on Windows, macOS, and Linux

## Requirements

- Node.js 16+ 
- npm or yarn

## Installation

### Development Setup

1. Clone or download the project
2. Install dependencies:
   ```bash
   npm install
   ```

### Running the Application

#### Development Mode
```bash
npm run dev
```

#### Production Mode
```bash
npm start
```

#### Global Terminal Access

You can make Tracker available globally in your terminal:

**For Development (creates symlink):**
```bash
npm run link-global
```

**For Production Installation:**
```bash
npm run install-global
```

After installation, you can run:
```bash
tracker          # Production mode
tracker --dev    # Development mode
```

**Manual Installation:**
```bash
./scripts/install.sh
```

**Note:** Make sure `$HOME/.local/bin` is in your PATH. Add this to your `~/.bashrc` or `~/.zshrc`:
```bash
export PATH="$HOME/.local/bin:$PATH"
```

### Building for Distribution

#### Build for Current Platform
```bash
npm run build
```

#### Build for Specific Platforms
```bash
npm run build-linux    # Linux AppImage and deb
npm run build-windows  # Windows installer
npm run build-mac      # macOS dmg
```

## Usage

### Basic Workflow

1. **Create a Task**: Click "Add Task" or use Ctrl+N
2. **Automatic Subdivision**: Every new task gets a "subdivision" subtask to plan your work
3. **Start Working**: Click "Start" on a task to begin timing
4. **Use Timer**: Choose 25-minute or 50-minute work sessions
5. **Take Breaks**: Use the 10-minute break timer when needed
6. **Track Progress**: Complete subtasks to update overall progress

### Key Concepts

#### Task Subdivision
- Every new task automatically gets a "subdivision" subtask
- This forces you to break down work into smaller pieces
- Maximum subtask duration is 50 minutes

#### Context Recovery
- When resuming a paused task, a 25-minute "Context Recovery" subtask is automatically added
- This helps you get back into the flow of interrupted work

#### Time Management
- Work sessions can be 25 or 50 minutes
- Break timer is always 10 minutes
- The system tracks when you need breaks based on work time

### Keyboard Shortcuts

- **Ctrl+N** - New Task
- **Ctrl+R** - Refresh tasks
- **Ctrl+1** - Start 25-minute timer
- **Ctrl+2** - Start 50-minute timer
- **Ctrl+B** - Start break timer
- **Ctrl+P** - Pause timer
- **Ctrl+S** - Stop timer

## Architecture

### Project Structure
```
electron-tracker/
├── src/
│   ├── main/
│   │   └── main.js           # Electron main process
│   ├── renderer/
│   │   ├── index.html        # Application UI
│   │   ├── styles.css        # Nordic Dark theme
│   │   └── renderer.js       # Frontend logic
│   └── shared/
│       ├── Task.js           # Task model and logic
│       └── TaskManager.js    # Task management operations
├── assets/                   # Icons and resources
├── dist/                     # Built applications
├── package.json
└── README.md
```

### Technology Stack

- **Electron**: Cross-platform desktop framework
- **Node.js**: Backend runtime
- **Vanilla JavaScript**: Frontend (no frameworks)
- **CSS3**: Nordic Dark theme styling
- **JSON**: Data persistence

### Nordic Dark Theme Colors

Based on the polybar configuration:
- Background: `#2e3440` (dark blue-gray)
- Alt Background: `#3b4252` (lighter containers)
- Accent: `#434c5e` (UI accents)
- Foreground: `#eceff4` (light text)
- Primary: `#81a1c1` (blue highlights)
- Success: `#a3be8c` (green for start/complete)
- Warning: `#ebcb8b` (yellow for pause)
- Alert: `#bf616a` (red for delete/stop)
- Info: `#88c0d0` (cyan-blue for active elements)

## Data Storage

Tasks are automatically saved to `~/.tracker_tasks.json` and restored when the application starts.

### Task Data Structure
```javascript
{
  "id": "uuid",
  "title": "Task title",
  "description": "Optional description", 
  "status": "pending|in_progress|paused|completed",
  "taskType": "main|subtask|context",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "estimatedDuration": 30,
  "subtasks": [...],
  "timeBlocks": [...]
}
```

## Development

### Adding Features
1. Update models in `src/shared/`
2. Add IPC handlers in `src/main/main.js`
3. Update UI in `src/renderer/`
4. Test across platforms

### Building
The application uses `electron-builder` for packaging:
- Linux: Creates AppImage and .deb packages
- Windows: Creates NSIS installer
- macOS: Creates .dmg disk image

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test on multiple platforms
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Acknowledgments

- Nordic color palette for the beautiful dark theme
- Electron community for the cross-platform framework
- Productivity methodology inspirations for task management features
# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Tracker is a **cross-platform Electron task management application** focused on productivity principles. It implements time-boxed work sessions (25-50 minutes) with automatic subtask creation and context recovery features. The application features a Nordic Dark theme that matches polybar configuration.

**Note**: The original Python GTK version is available in the root directory, but the main development has moved to the Electron version in the `electron-tracker/` directory.

## Development Commands (Electron Version)

### Running the Application
```bash
cd electron-tracker
npm run dev          # Development mode with DevTools
npm start           # Production mode
```

### Installing Dependencies
```bash
cd electron-tracker
npm install
```

### Building for Distribution
```bash
cd electron-tracker
npm run build        # Build for current platform
npm run build-linux  # Linux AppImage and deb
npm run build-windows # Windows NSIS installer  
npm run build-mac    # macOS dmg
```

### Global Terminal Access
```bash
cd electron-tracker
npm run link-global      # For development (creates symlink)
npm run install-global   # For production installation
./scripts/install.sh     # Manual installation
```

**After installation, you can run:**
```bash
tracker          # Production mode
tracker --dev    # Development mode
```

**Note:** Make sure `$HOME/.local/bin` is in your PATH:
```bash
export PATH="$HOME/.local/bin:$PATH"  # Add to ~/.bashrc or ~/.zshrc
```

**IMPORTANT: After Making Code Changes**
For Electron version, changes are reflected immediately in development mode (`npm run dev`). For production builds, you need to rebuild:
```bash
npm run build
```

## Architecture Overview (Electron Version)

### Core Components

**Task Model (`src/shared/Task.js`)**
- `Task` class with status management (PENDING, IN_PROGRESS, PAUSED, COMPLETED)
- Automatic subtask creation via `subdivide()` method
- Context recovery tasks for resumed work (`addContextTask()`)
- Time block tracking and break suggestions  
- Maximum subtask duration is 50 minutes
- JSON serialization/deserialization methods

**Task Manager (`src/shared/TaskManager.js`)**
- Centralized task operations and persistence
- JSON-based storage in `~/.tracker_tasks.json`
- Handles task relationships and state transitions
- Automatic saving after operations
- Statistics and reporting methods

**Main Process (`src/main/main.js`)**
- Electron main process with BrowserWindow management
- IPC handlers for all task operations
- Menu system with keyboard shortcuts
- Application lifecycle management
- Security configurations

**Renderer Process (`src/renderer/`)**
- `index.html`: Application structure with Nordic theme
- `styles.css`: Complete Nordic Dark CSS with CSS variables
- `renderer.js`: Frontend logic with TrakerUI class
- Modal system for task/subtask creation
- Timer functionality with notifications

### Key Productivity Features

**Automatic Task Subdivision**
- Every new task gets a "subdivision" subtask to force planning
- Encourages breaking work into manageable pieces

**Context Recovery**
- 25-minute context tasks automatically added when resuming paused work
- Helps users get back into the flow of interrupted tasks

**Time Management**
- Work sessions: 25 or 50 minutes
- Break timer: Fixed 10 minutes
- System tracks when breaks are needed (after 50+ minutes of work)

### Data Flow (Electron)
1. **Main Process** (`main.js`) initializes TaskManager and creates BrowserWindow
2. **Renderer Process** (`renderer.js`) handles UI interactions and sends IPC messages
3. **IPC Communication** between main and renderer for all task operations
4. **TaskManager** persists all changes to JSON file automatically
5. **Timer System** runs in renderer with notifications sent to main process

### Important Implementation Details

- **Cross-Platform**: Works on Windows, macOS, and Linux
- **IPC Security**: Proper isolation between main and renderer processes
- **Tasks use UUID** for identification via `uuid` package
- **Parent-child relationships** maintained in memory and storage
- **Time blocks** stored with timestamps for break calculation
- **Electron Builder** for distribution packages
- **Menu System** with keyboard shortcuts for all major functions
- **Automatic persistence** prevents data loss
- **CSS Variables** for maintainable Nordic theme
- **Responsive Design** adapts to different window sizes

### Theming

The application uses a **Nordic Dark theme** that matches the polybar configuration:

**Color Scheme:**
- Background: `#2e3440` (dark blue-gray)
- Background Alt: `#3b4252` (lighter blue-gray for containers)
- Background Accent: `#434c5e` (accent containers)
- Foreground: `#eceff4` (light text)
- Primary: `#81a1c1` (blue highlights)
- Nordic Blue: `#88c0d0` (cyan-blue for active elements)
- Nordic Green: `#a3be8c` (success/start buttons)
- Nordic Yellow: `#ebcb8b` (warning/pause buttons)
- Alert: `#bf616a` (red for delete/error)

**CSS Classes:**
- `.start-button`, `.complete-button` - Green themed buttons
- `.pause-button` - Yellow themed buttons  
- `.delete-button` - Red themed buttons
- `.timer-display.work-time` - Blue timer text
- `.timer-display.break-time` - Green timer text
- `.status-pending`, `.status-in-progress`, etc. - Status-specific colors
- `.subtask-container` - Indented subtask styling
- `.context-task` - Purple accent for context recovery tasks

## UI Development Guidelines

**CRITICAL: When adding new UI components, you MUST follow these theming rules:**

### Button Color Guidelines
Every `Gtk.Button` must have a CSS class applied immediately after creation:

```python
# ✅ CORRECT - Always add CSS class
button = Gtk.Button(label="My Button")
button.add_css_class("start-button")  # Choose appropriate class
button.connect("clicked", self.callback)

# ❌ WRONG - Missing CSS class
button = Gtk.Button(label="My Button")  # Will appear white!
button.connect("clicked", self.callback)
```

**Button CSS Classes by Function:**
- **Green buttons** (`.start-button`): Start, Resume, Add, Create, Submit actions
- **Yellow buttons** (`.pause-button`): Pause, Suspend, Wait actions  
- **Red buttons** (`.delete-button`): Delete, Remove, Stop, Cancel destructive actions
- **Default** (no class): Cancel, Close, neutral actions

### Container Guidelines
Major containers should have background classes:
```python
# Main containers
main_box.add_css_class("background")

# Secondary containers  
panel_box.add_css_class("background-alt")

# Accent containers
header_box.add_css_class("background-accent")
```

### Label Guidelines
Apply semantic classes to labels:
```python
title_label.add_css_class("title")           # Blue, bold
status_label.add_css_class("status")         # Gray
desc_label.add_css_class("description")      # Light gray
progress_label.add_css_class("progress-label") # Blue accent
```

### Status-Specific Classes
For dynamic status display:
```python
# Apply status-specific colors
status_label.add_css_class(f"status-{task.status.value.replace('_', '-')}")
# Results in: status-pending, status-in-progress, status-completed, etc.
```

### After Adding Components
**MANDATORY**: After any UI changes, update the installed version:

**For Electron version:**
```bash
cd electron-tracker
npm run dev  # Changes are immediately reflected in development
# OR for global installation:
npm run install-global
```

**For Python GTK version (legacy):**
```bash
./install.sh
```

### Testing Checklist
Before considering UI changes complete:
1. ✅ All buttons have appropriate CSS classes
2. ✅ All containers have background classes  
3. ✅ All labels have semantic classes
4. ✅ No white/light backgrounds visible
5. ✅ Installation command executed (`npm run install-global` or `./install.sh`)
6. ✅ `tracker` command tested from terminal

## Git Workflow

**CRITICAL: After completing each task, you MUST ALWAYS create a commit and push to main:**

```bash
# After finishing any task or significant change
git add .
git commit -m "feat: describe what was completed

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>"
git push origin main
```

**MANDATORY RULE: COMMIT AND PUSH AFTER EVERY REQUEST**
- **ALWAYS** commit and push after completing ANY user request
- **NO EXCEPTIONS** - this applies to ALL tasks, big or small
- Every completed request = 1 commit + 1 push
- This is automatic and should be done without being asked

**Task Completion Requirements:**
- Every completed task = 1 commit
- Use descriptive commit messages
- Always push to main branch
- Include Claude Code signature
- Example commit messages:
  - `feat: add Nordic Dark theme to GTK application`
  - `fix: eliminate CSS parser warnings`
  - `refactor: convert Python GTK to Electron`
  - `feat: add workspace tabs system`
  - `ui: remove application menu bar`

## File Structure

### Electron Version (Primary)
```
electron-tracker/
├── src/
│   ├── main/
│   │   └── main.js           # Electron main process
│   ├── renderer/
│   │   ├── index.html        # Application UI structure  
│   │   ├── styles.css        # Nordic Dark theme CSS
│   │   └── renderer.js       # Frontend logic and UI management
│   └── shared/
│       ├── Task.js           # Task model with JSON serialization
│       └── TaskManager.js    # Task operations and persistence
├── bin/
│   └── tracker               # Terminal executable script
├── scripts/
│   ├── install.sh           # Global installation script
│   └── link-global.sh       # Development symlink script
├── assets/                   # Icons and resources
├── dist/                     # Built applications
├── package.json             # Dependencies and build config
├── README.md                # Electron version documentation
└── .gitignore
```

### Python GTK Version (Legacy)
```
src/tracker/
├── main.py           # Application entry point and GTK app
├── task.py           # Task model with status/time management  
├── task_manager.py   # Task operations and JSON persistence
└── ui/
    ├── main_window.py    # Main interface and task dialogs
    ├── timer_widget.py   # Timer controls and display
    └── style.css         # Nordic Dark theme CSS
```

### Development Priority
- **Primary Development**: `electron-tracker/` directory
- **Legacy Support**: Root directory Python version maintained for reference
- **New Features**: Should be added to Electron version first
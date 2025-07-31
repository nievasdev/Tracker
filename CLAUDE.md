# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Traker is a Python GTK 4 task management application focused on productivity principles. It implements time-boxed work sessions (25-50 minutes) with automatic subtask creation and context recovery features.

## Development Commands

### Running the Application
```bash
python run.py
# OR
python3 run.py
# OR after making executable
chmod +x run.py
./run.py
```

### Installing Dependencies
```bash
pip install -r requirements.txt
```

### Installing Globally (Optional)
```bash
./install.sh
```

### Package Installation
```bash
pip install -e .
# Then run via entry point:
traker
```

**IMPORTANT: After Making Code Changes**
When you make any changes to the codebase, you MUST reinstall the global version for the `traker` terminal command to reflect the changes:
```bash
./install.sh
```
This copies the updated files from `src/traker/` to `~/.local/share/traker/` so the installed command uses the latest version. Without this step, running `traker` from terminal will use the old cached version without your changes.

## Architecture Overview

### Core Components

**Task Model (`src/traker/task.py`)**
- `Task` class with status management (PENDING, IN_PROGRESS, PAUSED, COMPLETED)
- Automatic subtask creation via `subdivide()` method
- Context recovery tasks for resumed work (`add_context_task()`)
- Time block tracking and break suggestions
- Maximum subtask duration is 50 minutes

**Task Manager (`src/traker/task_manager.py`)**
- Centralized task operations and persistence
- JSON-based storage in `~/.traker_tasks.json`
- Handles task relationships and state transitions
- Automatic saving after operations

**UI Framework (`src/traker/ui/`)**
- GTK 4 application using PyGObject
- `MainWindow`: Primary interface with task list and controls
- `TimerWidget`: Pomodoro-style timer (25/50 min work, 10 min breaks)
- Modal dialogs for task/subtask creation

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

### Data Flow
1. `TrakerApp` (main.py) initializes `TaskManager` and `MainWindow`
2. `MainWindow` displays tasks and handles user interactions
3. `TaskManager` persists all changes to JSON file
4. `TimerWidget` manages work/break sessions and logs time blocks

### Important Implementation Details

- Tasks use UUID for identification
- Parent-child relationships maintained in memory and storage
- Time blocks stored with timestamps for break calculation
- GTK 4 widget hierarchy with proper signal handling
- Automatic persistence prevents data loss

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
```bash
./install.sh
```

### Testing Checklist
Before considering UI changes complete:
1. ✅ All buttons have appropriate CSS classes
2. ✅ All containers have background classes  
3. ✅ All labels have semantic classes
4. ✅ No white/light backgrounds visible
5. ✅ `./install.sh` executed
6. ✅ `traker` command tested

## File Structure
```
src/traker/
├── main.py           # Application entry point and GTK app
├── task.py           # Task model with status/time management
├── task_manager.py   # Task operations and JSON persistence
└── ui/
    ├── main_window.py    # Main interface and task dialogs
    ├── timer_widget.py   # Timer controls and display
    └── style.css         # Nordic Dark theme CSS
```
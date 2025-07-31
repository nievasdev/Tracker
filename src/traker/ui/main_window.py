import gi
gi.require_version('Gtk', '4.0')
from gi.repository import Gtk, GLib, Gio

from ..task import TaskStatus, TaskType
from ..task_manager import TaskManager
from .timer_widget import TimerWidget

class MainWindow(Gtk.ApplicationWindow):
    def __init__(self, app, task_manager: TaskManager):
        super().__init__(application=app)
        self.task_manager = task_manager
        self.set_title("Traker - Task Manager")
        self.set_default_size(800, 600)
        
        self.setup_ui()
        self.refresh_task_list()
        
    def setup_ui(self):
        main_box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=10)
        main_box.set_margin_start(10)
        main_box.set_margin_end(10)
        main_box.set_margin_top(10)
        main_box.set_margin_bottom(10)
        main_box.add_css_class("background")
        
        # Header with add task button
        header_box = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=10)
        header_box.add_css_class("background-alt")
        
        add_task_btn = Gtk.Button(label="Add Task")
        add_task_btn.add_css_class("start-button")
        add_task_btn.connect("clicked", self.on_add_task_clicked)
        header_box.append(add_task_btn)
        
        refresh_btn = Gtk.Button(label="Refresh")
        refresh_btn.add_css_class("start-button")
        refresh_btn.connect("clicked", lambda x: self.refresh_task_list())
        header_box.append(refresh_btn)
        
        main_box.append(header_box)
        
        # Timer widget
        self.timer_widget = TimerWidget(self.task_manager)
        main_box.append(self.timer_widget)
        
        # Task list in scrolled window
        scrolled = Gtk.ScrolledWindow()
        scrolled.set_policy(Gtk.PolicyType.AUTOMATIC, Gtk.PolicyType.AUTOMATIC)
        scrolled.set_vexpand(True)
        scrolled.add_css_class("background")
        
        self.task_list_box = Gtk.ListBox()
        self.task_list_box.set_selection_mode(Gtk.SelectionMode.SINGLE)
        self.task_list_box.add_css_class("background")
        scrolled.set_child(self.task_list_box)
        
        main_box.append(scrolled)
        
        self.set_child(main_box)
        
    def refresh_task_list(self):
        # Clear existing items
        while True:
            row = self.task_list_box.get_first_child()
            if row is None:
                break
            self.task_list_box.remove(row)
            
        # Add all main tasks
        for task in self.task_manager.get_all_tasks():
            self.add_task_row(task)
            
    def add_task_row(self, task):
        row = Gtk.ListBoxRow()
        
        task_box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=5)
        task_box.set_margin_start(10)
        task_box.set_margin_end(10)
        task_box.set_margin_top(5)
        task_box.set_margin_bottom(5)
        task_box.add_css_class("background-alt")
        
        # Main task info
        main_info_box = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=10)
        
        # Task title and status
        task_info_box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=2)
        task_info_box.add_css_class("background-alt")
        
        title_label = Gtk.Label(label=task.title)
        title_label.set_halign(Gtk.Align.START)
        title_label.set_markup(f"<b>{task.title}</b>")
        title_label.add_css_class("title")
        task_info_box.append(title_label)
        
        status_label = Gtk.Label(label=f"Status: {task.status.value}")
        status_label.set_halign(Gtk.Align.START)
        status_label.add_css_class("status")
        status_label.add_css_class(f"status-{task.status.value.replace('_', '-')}")
        task_info_box.append(status_label)
        
        if task.description:
            desc_label = Gtk.Label(label=task.description)
            desc_label.set_halign(Gtk.Align.START)
            desc_label.set_wrap(True)
            desc_label.add_css_class("description")
            task_info_box.append(desc_label)
            
        progress_label = Gtk.Label(label=f"Progress: {task.get_progress_percentage():.1f}%")
        progress_label.set_halign(Gtk.Align.START)
        progress_label.add_css_class("progress-label")
        task_info_box.append(progress_label)
        
        main_info_box.append(task_info_box)
        
        # Buttons
        btn_box = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=5)
        
        if task.status == TaskStatus.PENDING:
            start_btn = Gtk.Button(label="Start")
            start_btn.add_css_class("start-button")
            start_btn.connect("clicked", lambda x, t=task: self.on_start_task(t))
            btn_box.append(start_btn)
        elif task.status == TaskStatus.PAUSED:
            resume_btn = Gtk.Button(label="Resume")
            resume_btn.add_css_class("start-button")
            resume_btn.connect("clicked", lambda x, t=task: self.on_resume_task(t))
            btn_box.append(resume_btn)
        elif task.status == TaskStatus.IN_PROGRESS:
            pause_btn = Gtk.Button(label="Pause")
            pause_btn.add_css_class("pause-button")
            pause_btn.connect("clicked", lambda x, t=task: self.on_pause_task(t))
            btn_box.append(pause_btn)
            
        if task.status != TaskStatus.COMPLETED:
            complete_btn = Gtk.Button(label="Complete")
            complete_btn.add_css_class("complete-button")
            complete_btn.connect("clicked", lambda x, t=task: self.on_complete_task(t))
            btn_box.append(complete_btn)
            
        add_subtask_btn = Gtk.Button(label="Add Subtask")
        add_subtask_btn.add_css_class("start-button")
        add_subtask_btn.connect("clicked", lambda x, t=task: self.on_add_subtask(t))
        btn_box.append(add_subtask_btn)
        
        delete_btn = Gtk.Button(label="Delete")
        delete_btn.add_css_class("delete-button")
        delete_btn.connect("clicked", lambda x, t=task: self.on_delete_task(t))
        btn_box.append(delete_btn)
        
        main_info_box.append(btn_box)
        task_box.append(main_info_box)
        
        # Subtasks
        if task.subtasks:
            subtask_label = Gtk.Label(label="Subtasks:")
            subtask_label.set_halign(Gtk.Align.START)
            subtask_label.set_markup("<b>Subtasks:</b>")
            subtask_label.add_css_class("title")
            task_box.append(subtask_label)
            
            for subtask in task.subtasks:
                subtask_box = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=10)
                subtask_box.set_margin_start(20)
                subtask_box.add_css_class("subtask-container")
                if subtask.task_type == TaskType.CONTEXT:
                    subtask_box.add_css_class("context-task")
                
                subtask_info = Gtk.Label(label=f"• {subtask.title} ({subtask.status.value})")
                subtask_info.set_halign(Gtk.Align.START)
                subtask_info.add_css_class("subtask-label")
                subtask_info.add_css_class(f"status-{subtask.status.value.replace('_', '-')}")
                subtask_box.append(subtask_info)
                
                subtask_btn_box = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=5)
                
                if subtask.status == TaskStatus.PENDING:
                    start_subtask_btn = Gtk.Button(label="Start")
                    start_subtask_btn.add_css_class("start-button")
                    start_subtask_btn.connect("clicked", lambda x, st=subtask: self.on_start_task(st))
                    subtask_btn_box.append(start_subtask_btn)
                elif subtask.status == TaskStatus.IN_PROGRESS:
                    pause_subtask_btn = Gtk.Button(label="Pause")
                    pause_subtask_btn.add_css_class("pause-button")
                    pause_subtask_btn.connect("clicked", lambda x, st=subtask: self.on_pause_task(st))
                    subtask_btn_box.append(pause_subtask_btn)
                    
                if subtask.status != TaskStatus.COMPLETED:
                    complete_subtask_btn = Gtk.Button(label="Complete")
                    complete_subtask_btn.add_css_class("complete-button")
                    complete_subtask_btn.connect("clicked", lambda x, st=subtask: self.on_complete_task(st))
                    subtask_btn_box.append(complete_subtask_btn)
                    
                subtask_box.append(subtask_btn_box)
                task_box.append(subtask_box)
        
        row.set_child(task_box)
        self.task_list_box.append(row)
        
    def on_add_task_clicked(self, button):
        dialog = TaskCreationDialog(self)
        dialog.present()
        
    def on_add_subtask(self, task):
        dialog = SubtaskCreationDialog(self, task)
        dialog.present()
        
    def on_start_task(self, task):
        self.task_manager.start_task(task.id)
        self.timer_widget.set_current_task(task)
        self.refresh_task_list()
        
    def on_resume_task(self, task):
        self.task_manager.resume_task(task.id)
        self.timer_widget.set_current_task(task)
        self.refresh_task_list()
        
    def on_pause_task(self, task):
        self.task_manager.pause_current_task()
        self.timer_widget.clear_current_task()
        self.refresh_task_list()
        
    def on_complete_task(self, task):
        self.task_manager.complete_task(task.id)
        if self.task_manager.current_task == task:
            self.timer_widget.clear_current_task()
        self.refresh_task_list()
        
    def on_delete_task(self, task):
        self.task_manager.delete_task(task.id)
        if self.task_manager.current_task == task:
            self.timer_widget.clear_current_task()
        self.refresh_task_list()

class TaskCreationDialog(Gtk.Window):
    def __init__(self, parent):
        super().__init__()
        self.parent_window = parent
        self.set_title("Create New Task")
        self.set_modal(True)
        self.set_transient_for(parent)
        self.set_default_size(400, 300)
        
        box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=10)
        box.set_margin_start(20)
        box.set_margin_end(20)
        box.set_margin_top(20)
        box.set_margin_bottom(20)
        box.add_css_class("background")
        
        # Title entry
        title_label = Gtk.Label(label="Task Title:")
        title_label.set_halign(Gtk.Align.START)
        box.append(title_label)
        
        self.title_entry = Gtk.Entry()
        self.title_entry.set_placeholder_text("Enter task title...")
        box.append(self.title_entry)
        
        # Description entry
        desc_label = Gtk.Label(label="Description (optional):")
        desc_label.set_halign(Gtk.Align.START)
        box.append(desc_label)
        
        scrolled = Gtk.ScrolledWindow()
        scrolled.set_policy(Gtk.PolicyType.AUTOMATIC, Gtk.PolicyType.AUTOMATIC)
        scrolled.set_min_content_height(100)
        
        self.desc_text = Gtk.TextView()
        self.desc_text.set_wrap_mode(Gtk.WrapMode.WORD)
        scrolled.set_child(self.desc_text)
        box.append(scrolled)
        
        # Buttons
        btn_box = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=10)
        btn_box.set_halign(Gtk.Align.END)
        
        cancel_btn = Gtk.Button(label="Cancel")
        cancel_btn.connect("clicked", lambda x: self.close())
        btn_box.append(cancel_btn)
        
        create_btn = Gtk.Button(label="Create")
        create_btn.add_css_class("start-button")
        create_btn.connect("clicked", self.on_create_clicked)
        btn_box.append(create_btn)
        
        box.append(btn_box)
        self.set_child(box)
        
    def on_create_clicked(self, button):
        title = self.title_entry.get_text().strip()
        if not title:
            return
            
        buffer = self.desc_text.get_buffer()
        start, end = buffer.get_bounds()
        description = buffer.get_text(start, end, False)
        
        self.parent_window.task_manager.create_task(title, description)
        self.parent_window.refresh_task_list()
        self.close()

class SubtaskCreationDialog(Gtk.Window):
    def __init__(self, parent, task):
        super().__init__()
        self.parent_window = parent
        self.task = task
        self.set_title(f"Add Subtask to '{task.title}'")
        self.set_modal(True)
        self.set_transient_for(parent)
        self.set_default_size(400, 250)
        
        box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=10)
        box.set_margin_start(20)
        box.set_margin_end(20)
        box.set_margin_top(20)
        box.set_margin_bottom(20)
        box.add_css_class("background")
        
        # Title entry
        title_label = Gtk.Label(label="Subtask Title:")
        title_label.set_halign(Gtk.Align.START)
        box.append(title_label)
        
        self.title_entry = Gtk.Entry()
        self.title_entry.set_placeholder_text("Enter subtask title...")
        box.append(self.title_entry)
        
        # Duration spin button
        duration_label = Gtk.Label(label="Estimated Duration (minutes):")
        duration_label.set_halign(Gtk.Align.START)
        box.append(duration_label)
        
        self.duration_spin = Gtk.SpinButton()
        self.duration_spin.set_range(5, 50)  # 5 min to 50 min max
        self.duration_spin.set_value(30)
        self.duration_spin.set_increments(5, 10)
        box.append(self.duration_spin)
        
        # Buttons
        btn_box = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=10)
        btn_box.set_halign(Gtk.Align.END)
        
        cancel_btn = Gtk.Button(label="Cancel")
        cancel_btn.connect("clicked", lambda x: self.close())
        btn_box.append(cancel_btn)
        
        create_btn = Gtk.Button(label="Create")
        create_btn.add_css_class("start-button")
        create_btn.connect("clicked", self.on_create_clicked)
        btn_box.append(create_btn)
        
        box.append(btn_box)
        self.set_child(box)
        
    def on_create_clicked(self, button):
        title = self.title_entry.get_text().strip()
        if not title:
            return
            
        duration = int(self.duration_spin.get_value())
        
        self.parent_window.task_manager.add_subtask(self.task.id, title, "", duration)
        self.parent_window.refresh_task_list()
        self.close()
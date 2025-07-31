import gi
gi.require_version('Gtk', '4.0')
from gi.repository import Gtk, GLib

from ..task import Task, TaskStatus
from ..task_manager import TaskManager

class TimerWidget(Gtk.Box):
    def __init__(self, task_manager: TaskManager):
        super().__init__(orientation=Gtk.Orientation.VERTICAL, spacing=10)
        self.task_manager = task_manager
        self.current_task = None
        self.timer_id = None
        self.time_remaining = 0  # in seconds
        self.is_break_time = False
        self.is_running = False
        
        self.setup_ui()
        
    def setup_ui(self):
        # Current task info
        self.task_info_frame = Gtk.Frame()
        self.task_info_frame.set_label("Current Task")
        
        self.task_info_box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=5)
        self.task_info_box.set_margin_start(10)
        self.task_info_box.set_margin_end(10)
        self.task_info_box.set_margin_top(10)
        self.task_info_box.set_margin_bottom(10)
        self.task_info_box.add_css_class("background-alt")
        
        self.task_title_label = Gtk.Label(label="No task selected")
        self.task_title_label.set_halign(Gtk.Align.START)
        self.task_info_box.append(self.task_title_label)
        
        self.task_status_label = Gtk.Label(label="")
        self.task_status_label.set_halign(Gtk.Align.START)
        self.task_info_box.append(self.task_status_label)
        
        self.task_info_frame.set_child(self.task_info_box)
        self.append(self.task_info_frame)
        
        # Timer display
        self.timer_frame = Gtk.Frame()
        self.timer_frame.set_label("Timer")
        
        timer_box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=10)
        timer_box.set_margin_start(10)
        timer_box.set_margin_end(10)
        timer_box.set_margin_top(10)
        timer_box.set_margin_bottom(10)
        timer_box.add_css_class("background-alt")
        
        self.time_display = Gtk.Label(label="00:00")
        self.time_display.set_markup("<span size='xx-large'><b>00:00</b></span>")
        self.time_display.set_halign(Gtk.Align.CENTER)
        self.time_display.add_css_class("timer-display")
        self.time_display.add_css_class("work-time")
        timer_box.append(self.time_display)
        
        self.timer_status_label = Gtk.Label(label="Timer stopped")
        self.timer_status_label.set_halign(Gtk.Align.CENTER)
        timer_box.append(self.timer_status_label)
        
        # Timer controls
        controls_box = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=10)
        controls_box.set_halign(Gtk.Align.CENTER)
        
        self.start_25_btn = Gtk.Button(label="Start 25min")
        self.start_25_btn.add_css_class("start-button")
        self.start_25_btn.connect("clicked", lambda x: self.start_timer(25))
        controls_box.append(self.start_25_btn)
        
        self.start_50_btn = Gtk.Button(label="Start 50min")
        self.start_50_btn.add_css_class("start-button")
        self.start_50_btn.connect("clicked", lambda x: self.start_timer(50))
        controls_box.append(self.start_50_btn)
        
        self.start_break_btn = Gtk.Button(label="Start Break (10min)")
        self.start_break_btn.add_css_class("complete-button")
        self.start_break_btn.connect("clicked", lambda x: self.start_break_timer())
        controls_box.append(self.start_break_btn)
        
        self.pause_btn = Gtk.Button(label="Pause")
        self.pause_btn.add_css_class("pause-button")
        self.pause_btn.connect("clicked", self.on_pause_clicked)
        self.pause_btn.set_sensitive(False)
        controls_box.append(self.pause_btn)
        
        self.stop_btn = Gtk.Button(label="Stop")
        self.stop_btn.add_css_class("delete-button")
        self.stop_btn.connect("clicked", self.on_stop_clicked)
        self.stop_btn.set_sensitive(False)
        controls_box.append(self.stop_btn)
        
        timer_box.append(controls_box)
        
        # Duration adjustment
        duration_box = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=10)
        duration_box.set_halign(Gtk.Align.CENTER)
        
        duration_label = Gtk.Label(label="Custom duration:")
        duration_box.append(duration_label)
        
        self.duration_spin = Gtk.SpinButton()
        self.duration_spin.set_range(1, 60)
        self.duration_spin.set_value(25)
        self.duration_spin.set_increments(1, 5)
        duration_box.append(self.duration_spin)
        
        custom_start_btn = Gtk.Button(label="Start Custom")
        custom_start_btn.add_css_class("start-button")
        custom_start_btn.connect("clicked", self.on_custom_start_clicked)
        duration_box.append(custom_start_btn)
        
        timer_box.append(duration_box)
        
        self.timer_frame.set_child(timer_box)
        self.append(self.timer_frame)
        
        self.update_ui()
        
    def set_current_task(self, task: Task):
        self.current_task = task
        self.update_ui()
        
    def clear_current_task(self):
        self.current_task = None
        self.update_ui()
        
    def update_ui(self):
        if self.current_task:
            self.task_title_label.set_text(f"Task: {self.current_task.title}")
            self.task_status_label.set_text(f"Status: {self.current_task.status.value}")
            
            # Enable timer controls
            self.start_25_btn.set_sensitive(not self.is_running)
            self.start_50_btn.set_sensitive(not self.is_running)
            self.start_break_btn.set_sensitive(not self.is_running)
        else:
            self.task_title_label.set_text("No task selected")
            self.task_status_label.set_text("")
            
            # Disable timer controls when no task selected
            self.start_25_btn.set_sensitive(False)
            self.start_50_btn.set_sensitive(False)
            self.start_break_btn.set_sensitive(not self.is_running)
            
    def start_timer(self, minutes):
        if not self.current_task:
            return
            
        self.time_remaining = minutes * 60
        self.is_break_time = False
        self.is_running = True
        
        self.update_timer_display()
        self.update_timer_controls()
        
        # Start the countdown
        self.timer_id = GLib.timeout_add(1000, self.on_timer_tick)
        
        self.timer_status_label.set_text(f"Working - {minutes} minutes")
        
    def start_break_timer(self):
        self.time_remaining = 10 * 60  # 10 minutes
        self.is_break_time = True
        self.is_running = True
        
        self.update_timer_display()
        self.update_timer_controls()
        
        # Start the countdown
        self.timer_id = GLib.timeout_add(1000, self.on_timer_tick)
        
        self.timer_status_label.set_text("Break time - 10 minutes")
        
    def on_custom_start_clicked(self, button):
        duration = int(self.duration_spin.get_value())
        self.start_timer(duration)
        
    def on_timer_tick(self):
        if self.time_remaining > 0:
            self.time_remaining -= 1
            self.update_timer_display()
            return True  # Continue the timer
        else:
            # Timer finished
            self.on_timer_finished()
            return False  # Stop the timer
            
    def on_timer_finished(self):
        self.is_running = False
        self.timer_id = None
        
        if self.is_break_time:
            self.timer_status_label.set_text("Break finished!")
            # Log break time
            if self.current_task:
                self.task_manager.log_time_block(self.current_task.id, 10, is_break=True)
        else:
            self.timer_status_label.set_text("Work session finished!")
            # Log work time
            if self.current_task:
                work_minutes = int(self.duration_spin.get_value()) if hasattr(self, 'last_work_duration') else 25
                self.task_manager.log_time_block(self.current_task.id, work_minutes, is_break=False)
                
                # Check if break is needed
                if self.current_task.should_take_break():
                    self.timer_status_label.set_text("Time for a break!")
                    
        self.update_timer_controls()
        self.show_notification()
        
    def show_notification(self):
        # Simple notification - in a real app you might want to use system notifications
        if self.is_break_time:
            print("🔔 Break time is over! Ready to get back to work.")
        else:
            print("🔔 Work session complete! Time for a break?")
            
    def on_pause_clicked(self, button):
        if self.timer_id:
            GLib.source_remove(self.timer_id)
            self.timer_id = None
            self.is_running = False
            self.timer_status_label.set_text("Timer paused")
            self.update_timer_controls()
            
    def on_stop_clicked(self, button):
        if self.timer_id:
            GLib.source_remove(self.timer_id)
            self.timer_id = None
            
        self.is_running = False
        self.time_remaining = 0
        self.update_timer_display()
        self.timer_status_label.set_text("Timer stopped")
        self.update_timer_controls()
        
    def update_timer_display(self):
        minutes = self.time_remaining // 60
        seconds = self.time_remaining % 60
        time_str = f"{minutes:02d}:{seconds:02d}"
        
        # Update CSS classes for proper theming
        self.time_display.remove_css_class("break-time")
        self.time_display.remove_css_class("work-time")
        
        if self.is_break_time:
            self.time_display.add_css_class("break-time")
        else:
            self.time_display.add_css_class("work-time")
            
        self.time_display.set_markup(f"<span size='xx-large'><b>{time_str}</b></span>")
            
    def update_timer_controls(self):
        self.start_25_btn.set_sensitive(not self.is_running and self.current_task is not None)
        self.start_50_btn.set_sensitive(not self.is_running and self.current_task is not None)
        self.start_break_btn.set_sensitive(not self.is_running)
        self.pause_btn.set_sensitive(self.is_running)
        self.stop_btn.set_sensitive(self.is_running or self.time_remaining > 0)
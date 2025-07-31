#!/usr/bin/env python3

import gi
gi.require_version('Gtk', '4.0')
from gi.repository import Gtk, GLib, Gdk
import sys
from pathlib import Path

from .task import Task
from .task_manager import TaskManager
from .ui.main_window import MainWindow

class TrakerApp(Gtk.Application):
    def __init__(self):
        super().__init__(application_id='com.example.traker')
        self.task_manager = TaskManager()
        self.load_css()
        
    def load_css(self):
        """Load custom CSS styling for Nordic theme"""
        css_provider = Gtk.CssProvider()
        css_file = Path(__file__).parent / "ui" / "style.css"
        
        try:
            css_provider.load_from_path(str(css_file))
            Gtk.StyleContext.add_provider_for_display(
                Gdk.Display.get_default(),
                css_provider,
                Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION
            )
        except Exception as e:
            print(f"Warning: Could not load CSS file: {e}")
        
    def do_activate(self):
        window = MainWindow(self, self.task_manager)
        window.present()

def main():
    app = TrakerApp()
    return app.run(sys.argv)

if __name__ == '__main__':
    main()
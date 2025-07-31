#!/usr/bin/env python3

import sys
import os

# Add src directory to path so we can import traker
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

from traker.main import main

if __name__ == '__main__':
    main()
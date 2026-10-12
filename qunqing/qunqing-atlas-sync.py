#!/usr/bin/env python3
"""Compatibility entry: albums are now managed from trip.json + story.md.
The original Quarto page is never re-imported or used to replace edited stories.
"""
from manage import main
if __name__ == '__main__':
    main(['build'])

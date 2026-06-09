#!/usr/bin/env python
"""Django command-line utility for the gender equity diagnostics API."""
import os
import sys


def main():
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "equidade_api.settings")
    from django.core.management import execute_from_command_line

    execute_from_command_line(sys.argv)


if __name__ == "__main__":
    main()

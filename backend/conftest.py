"""
conftest.py — pytest configuration.

Sets a dummy WEATHER_AI_API_KEY so config.py doesn't raise on import during tests.
The key is never used in unit tests (no real HTTP calls are made).
"""
import os

os.environ.setdefault("WEATHER_AI_API_KEY", "wai_test_dummy_key_for_unit_tests")

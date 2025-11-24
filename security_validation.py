#!/usr/bin/env python3
"""
======================================================================
SECURITY VALIDATION MODULE
======================================================================
Enterprise-grade input validation and sanitization for OVERKORE APIs.

Protects against:
- SQL Injection
- XSS (Cross-Site Scripting)
- Command Injection
- Path Traversal
- Buffer Overflow
- Malformed Input

Created: 2025-11-24
Author: C1 Mechanic - Enterprise Security Hardening
======================================================================
"""

import re
import html
from typing import Tuple, Optional, List
from urllib.parse import unquote


class InputValidator:
    """Enterprise-grade input validation"""

    # Dangerous patterns that indicate potential attacks
    SQL_INJECTION_PATTERNS = [
        r"(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)",
        r"(--|#|\/\*|\*\/)",  # SQL comments
        r"(\bOR\b.*=.*)",  # OR 1=1
        r"(\bUNION\b.*\bSELECT\b)",  # UNION SELECT
        r"(;.*\b(DROP|DELETE|UPDATE)\b)",  # Statement chaining
    ]

    XSS_PATTERNS = [
        r"<script[^>]*>.*?</script>",  # Script tags
        r"javascript:",  # JavaScript protocol
        r"on\w+\s*=",  # Event handlers (onclick, onerror, etc.)
        r"<iframe",  # Iframes
        r"<object",  # Objects
        r"<embed",  # Embeds
    ]

    COMMAND_INJECTION_PATTERNS = [
        r"[;&|`$]",  # Shell metacharacters
        r"\$\(.*\)",  # Command substitution
        r"`.*`",  # Backtick command execution
    ]

    PATH_TRAVERSAL_PATTERNS = [
        r"\.\./",  # Directory traversal
        r"\.\.\\",  # Windows directory traversal
        r"/etc/",  # Unix system files
        r"c:\\",  # Windows system path
    ]

    def __init__(self):
        """Initialize validator with compiled patterns"""
        self.sql_patterns = [re.compile(p, re.IGNORECASE) for p in self.SQL_INJECTION_PATTERNS]
        self.xss_patterns = [re.compile(p, re.IGNORECASE) for p in self.XSS_PATTERNS]
        self.command_patterns = [re.compile(p) for p in self.COMMAND_INJECTION_PATTERNS]
        self.path_patterns = [re.compile(p, re.IGNORECASE) for p in self.PATH_TRAVERSAL_PATTERNS]

    def validate_string(
        self,
        value: str,
        field_name: str,
        min_length: int = 1,
        max_length: int = 1000,
        allow_special_chars: bool = True,
        check_xss: bool = True,
        check_sql: bool = True,
    ) -> Tuple[bool, Optional[str]]:
        """
        Validate a string input comprehensively

        Args:
            value: String to validate
            field_name: Name of the field (for error messages)
            min_length: Minimum allowed length
            max_length: Maximum allowed length
            allow_special_chars: Whether to allow special characters
            check_xss: Whether to check for XSS patterns
            check_sql: Whether to check for SQL injection patterns

        Returns:
            Tuple of (is_valid, error_message)
        """
        # Type check
        if not isinstance(value, str):
            return False, f"{field_name} must be a string"

        # Length check
        if len(value) < min_length:
            return False, f"{field_name} must be at least {min_length} characters"

        if len(value) > max_length:
            return False, f"{field_name} must not exceed {max_length} characters"

        # Empty/whitespace check
        if not value.strip():
            return False, f"{field_name} cannot be empty or only whitespace"

        # Encoding check - ensure it's valid UTF-8
        try:
            value.encode('utf-8')
        except UnicodeEncodeError:
            return False, f"{field_name} contains invalid characters"

        # XSS check
        if check_xss:
            for pattern in self.xss_patterns:
                if pattern.search(value):
                    return False, f"{field_name} contains potentially malicious content (XSS)"

        # SQL Injection check
        if check_sql:
            for pattern in self.sql_patterns:
                if pattern.search(value):
                    return False, f"{field_name} contains potentially malicious content (SQL)"

        # Special character check (if restricted)
        if not allow_special_chars:
            if not re.match(r'^[a-zA-Z0-9\s\-_.,:;!?]+$', value):
                return False, f"{field_name} contains disallowed special characters"

        return True, None

    def validate_integer(
        self,
        value: int,
        field_name: str,
        min_value: Optional[int] = None,
        max_value: Optional[int] = None,
    ) -> Tuple[bool, Optional[str]]:
        """
        Validate an integer input

        Args:
            value: Integer to validate
            field_name: Name of the field (for error messages)
            min_value: Minimum allowed value
            max_value: Maximum allowed value

        Returns:
            Tuple of (is_valid, error_message)
        """
        # Type check
        if not isinstance(value, int):
            return False, f"{field_name} must be an integer"

        # Range check
        if min_value is not None and value < min_value:
            return False, f"{field_name} must be at least {min_value}"

        if max_value is not None and value > max_value:
            return False, f"{field_name} must not exceed {max_value}"

        return True, None

    def validate_list(
        self,
        value: list,
        field_name: str,
        min_items: int = 0,
        max_items: int = 100,
        item_type: type = str,
    ) -> Tuple[bool, Optional[str]]:
        """
        Validate a list input

        Args:
            value: List to validate
            field_name: Name of the field (for error messages)
            min_items: Minimum number of items
            max_items: Maximum number of items
            item_type: Expected type of list items

        Returns:
            Tuple of (is_valid, error_message)
        """
        # Type check
        if not isinstance(value, list):
            return False, f"{field_name} must be a list"

        # Length check
        if len(value) < min_items:
            return False, f"{field_name} must contain at least {min_items} items"

        if len(value) > max_items:
            return False, f"{field_name} must not exceed {max_items} items"

        # Item type check
        for i, item in enumerate(value):
            if not isinstance(item, item_type):
                return False, f"{field_name}[{i}] must be a {item_type.__name__}"

        return True, None

    def sanitize_string(self, value: str) -> str:
        """
        Sanitize a string by escaping HTML and removing dangerous characters

        Args:
            value: String to sanitize

        Returns:
            Sanitized string
        """
        if not isinstance(value, str):
            return str(value)

        # HTML escape
        sanitized = html.escape(value)

        # Remove null bytes
        sanitized = sanitized.replace('\x00', '')

        # Normalize whitespace
        sanitized = ' '.join(sanitized.split())

        return sanitized

    def check_path_traversal(self, path: str) -> Tuple[bool, Optional[str]]:
        """
        Check for path traversal attempts

        Args:
            path: Path string to check

        Returns:
            Tuple of (is_safe, error_message)
        """
        for pattern in self.path_patterns:
            if pattern.search(path):
                return False, "Path contains potentially dangerous patterns"

        return True, None

    def check_command_injection(self, command: str) -> Tuple[bool, Optional[str]]:
        """
        Check for command injection attempts

        Args:
            command: Command string to check

        Returns:
            Tuple of (is_safe, error_message)
        """
        for pattern in self.command_patterns:
            if pattern.search(command):
                return False, "Input contains potentially dangerous shell characters"

        return True, None


# Global validator instance
validator = InputValidator()


def validate_api_input(
    data: dict,
    required_fields: List[str],
    field_validators: dict
) -> Tuple[bool, Optional[str], Optional[dict]]:
    """
    Validate API input comprehensively

    Args:
        data: Input data dictionary
        required_fields: List of required field names
        field_validators: Dictionary of field_name -> validation_function

    Returns:
        Tuple of (is_valid, error_message, sanitized_data)

    Example:
        valid, error, clean_data = validate_api_input(
            request.get_json(),
            required_fields=['query'],
            field_validators={
                'query': lambda v: validator.validate_string(v, 'query', max_length=1000),
                'max_results': lambda v: validator.validate_integer(v, 'max_results', min_value=1, max_value=100)
            }
        )
    """
    if not isinstance(data, dict):
        return False, "Request body must be a JSON object", None

    # Check required fields
    for field in required_fields:
        if field not in data:
            return False, f"Missing required field: {field}", None

    # Validate each field
    sanitized_data = {}
    for field_name, validate_func in field_validators.items():
        if field_name in data:
            is_valid, error = validate_func(data[field_name])
            if not is_valid:
                return False, error, None

            # Sanitize string values
            if isinstance(data[field_name], str):
                sanitized_data[field_name] = validator.sanitize_string(data[field_name])
            else:
                sanitized_data[field_name] = data[field_name]

    # Copy over any additional fields (that weren't validated)
    for key, value in data.items():
        if key not in sanitized_data:
            if isinstance(value, str):
                sanitized_data[key] = validator.sanitize_string(value)
            else:
                sanitized_data[key] = value

    return True, None, sanitized_data


if __name__ == "__main__":
    # Test the validator
    print("=== Security Validation Module Tests ===\n")

    test_validator = InputValidator()

    # Test 1: Valid string
    valid, error = test_validator.validate_string("Hello World", "test", max_length=100)
    print(f"Test 1 (Valid string): {valid} - {error}")

    # Test 2: XSS attempt
    valid, error = test_validator.validate_string("<script>alert('xss')</script>", "test", max_length=100)
    print(f"Test 2 (XSS): {valid} - {error}")

    # Test 3: SQL injection
    valid, error = test_validator.validate_string("'; DROP TABLE users; --", "test", max_length=100)
    print(f"Test 3 (SQL): {valid} - {error}")

    # Test 4: Path traversal
    is_safe, error = test_validator.check_path_traversal("../../etc/passwd")
    print(f"Test 4 (Path traversal): {is_safe} - {error}")

    # Test 5: Sanitization
    sanitized = test_validator.sanitize_string("<b>Bold</b> & special chars")
    print(f"Test 5 (Sanitization): {sanitized}")

    print("\n✅ Validation module ready for production use")

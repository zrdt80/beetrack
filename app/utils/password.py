class PasswordPolicyError(ValueError):
    pass

def validate_password_strength(password: str) -> None:
    if len(password) < 8:
        raise PasswordPolicyError("Password must be at least 8 characters long")

    has_lower = any(c.islower() for c in password)
    has_upper = any(c.isupper() for c in password)
    has_digit = any(c.isdigit() for c in password)
    has_symbol = any(not c.isalnum() for c in password)

    if not (has_lower and has_upper and has_digit and has_symbol):
        raise PasswordPolicyError("Password must include upper, lower, digit and special character")

    unique_chars = len(set(password))
    if unique_chars < 4:
        raise PasswordPolicyError("Password must have more character variety")

    if unique_chars == 1:
        raise PasswordPolicyError("Password is too simple")

    seqs = [
        'abcdefghijklmnopqrstuvwxyz',
        'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
        '0123456789'
    ]
    lowered = password.lower()
    for seq in seqs:
        for i in range(len(seq) - 3):
            window = seq[i:i+4]
            if window not in lowered:
                continue
            if lowered in seq:
                raise PasswordPolicyError("Password is too sequential/simple")
            break

def is_password_breached(password: str) -> bool:
    """
    Pending implementation: check password against breach corpus (HIBP API).
    Currently not implemented; always returns False.
    """
    return False


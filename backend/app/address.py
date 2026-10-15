import re


WHITESPACE = re.compile(r"\s+")
COMMA_SPACING = re.compile(r"\s*,\s*")
REPEATED_COMMAS = re.compile(r"(?:,\s*){2,}")


def normalize_address(address: str) -> str:
    normalized = WHITESPACE.sub(" ", address).strip()
    normalized = REPEATED_COMMAS.sub(",", normalized)
    normalized = COMMA_SPACING.sub(", ", normalized)
    return normalized.strip(" ,")

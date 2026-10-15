import re


PHONE_FORMAT = re.compile(r"^\+?[0-9][0-9\s().-]*$")


def validate_phone_number(phone: str) -> str:
    if not PHONE_FORMAT.fullmatch(phone):
        raise ValueError("inserisci un numero di telefono valido")

    digits = "".join(character for character in phone if character.isdigit())
    if not 7 <= len(digits) <= 15:
        raise ValueError("inserisci un numero di telefono valido")

    depth = 0
    digits_inside_parentheses = 0
    for character in phone:
        if character == "(":
            if depth:
                raise ValueError("inserisci un numero di telefono valido")
            depth = 1
            digits_inside_parentheses = 0
        elif character.isdigit() and depth:
            digits_inside_parentheses += 1
        elif character == ")":
            if not depth or not digits_inside_parentheses:
                raise ValueError("inserisci un numero di telefono valido")
            depth = 0

    if depth:
        raise ValueError("inserisci un numero di telefono valido")

    if not phone[-1].isdigit():
        raise ValueError("inserisci un numero di telefono valido")

    return phone

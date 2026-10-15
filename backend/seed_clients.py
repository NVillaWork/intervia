from app.database import get_connection, initialize_database


MOCK_CLIENTS = [
    (
        "Alfa Clima S.r.l.",
        "amministrazione@alfaclima.example",
        "+39 02 1234 5678",
        "Via delle Industrie 12, Milano (MI)",
    ),
    (
        "Boreale Impianti S.r.l.",
        "info@borealeimpianti.example",
        "+39 011 234 5678",
        "Corso Europa 45, Torino (TO)",
    ),
    (
        "Cantiere Verde S.r.l.",
        "contatti@cantiereverde.example",
        "+39 051 345 6789",
        "Via del Lavoro 8, Bologna (BO)",
    ),
    (
        "Delta Facility S.p.A.",
        "ufficio@deltafacility.example",
        "+39 06 4567 8901",
        "Viale delle Arti 21, Roma (RM)",
    ),
    (
        "EcoTerm Service S.r.l.",
        "info@ecotermservice.example",
        "+39 055 567 8901",
        "Via dei Fabbri 17, Firenze (FI)",
    ),
    (
        "Futura Manutenzioni S.r.l.",
        "clienti@futuramanutenzioni.example",
        "+39 010 678 9012",
        "Piazza del Porto 4, Genova (GE)",
    ),
    (
        "GreenPower Tecnica S.r.l.",
        "tecnico@greenpower.example",
        "+39 049 789 0123",
        "Via Padova 33, Padova (PD)",
    ),
    (
        "Idra Impianti S.r.l.",
        "amministrazione@idraimpianti.example",
        "+39 030 890 1234",
        "Via Brescia 19, Brescia (BS)",
    ),
    (
        "Luce & Rete S.r.l.",
        "info@lucerete.example",
        "+39 041 901 2345",
        "Fondamenta Nuove 6, Venezia (VE)",
    ),
    (
        "Manutec Centro S.r.l.",
        "segreteria@manuteccentro.example",
        "+39 059 123 4567",
        "Via Emilia 72, Modena (MO)",
    ),
    (
        "Nova Sicurezza S.r.l.",
        "assistenza@novasicurezza.example",
        "+39 070 234 5678",
        "Via del Porto 28, Cagliari (CA)",
    ),
    (
        "Orione Antincendio S.r.l.",
        "info@orioneantincendio.example",
        "+39 081 345 6789",
        "Via Campana 51, Napoli (NA)",
    ),
    (
        "Prisma Elevatori S.r.l.",
        "clienti@prismaelevatori.example",
        "+39 095 456 7890",
        "Via Etnea 104, Catania (CT)",
    ),
]


def make_vat_number(index: int) -> str:
    body = f"{1_000_000_000 + index * 7919:010d}"
    checksum = sum(int(body[position]) for position in range(0, 10, 2))
    for position in range(1, 10, 2):
        doubled_digit = int(body[position]) * 2
        checksum += doubled_digit if doubled_digit < 10 else doubled_digit - 9
    control_digit = (10 - checksum % 10) % 10
    return f"{body}{control_digit}"


def seed_clients() -> tuple[int, int]:
    initialize_database()
    inserted = 0
    skipped = 0

    with get_connection() as connection:
        for index, (name, email, phone, address) in enumerate(MOCK_CLIENTS, start=1):
            vat_number = make_vat_number(index)
            existing = connection.execute(
                "SELECT 1 FROM clients WHERE vat_number = ?",
                (vat_number,),
            ).fetchone()
            if existing:
                skipped += 1
                continue

            connection.execute(
                """
                INSERT INTO clients (name, vat_number, email, phone, address)
                VALUES (?, ?, ?, ?, ?)
                """,
                (name, vat_number, email, phone, address),
            )
            inserted += 1

    return inserted, skipped


if __name__ == "__main__":
    inserted, skipped = seed_clients()
    print(f"Clienti mock inseriti: {inserted}; già presenti e saltati: {skipped}.")

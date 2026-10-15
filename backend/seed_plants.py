from app.database import get_connection, initialize_database


MOCK_PLANTS = [
    ("Climatizzazione uffici", "Alfa Clima S.r.l.", "Via delle Industrie 12, Milano (MI)"),
    ("Impianto elettrico capannone", "Boreale Impianti S.r.l.", "Corso Europa 45, Torino (TO)"),
    ("Sistema antincendio magazzino", "Cantiere Verde S.r.l.", "Via del Lavoro 8, Bologna (BO)"),
    ("Centrale termica sede", "Delta Facility S.p.A.", "Viale delle Arti 21, Roma (RM)"),
    ("Climatizzazione area vendita", "EcoTerm Service S.r.l.", "Via dei Fabbri 17, Firenze (FI)"),
    ("Quadro elettrico principale", "Futura Manutenzioni S.r.l.", "Piazza del Porto 4, Genova (GE)"),
    ("Pompa di calore uffici", "GreenPower Tecnica S.r.l.", "Via Padova 33, Padova (PD)"),
    ("Impianto idrico sanitario", "Idra Impianti S.r.l.", "Via Brescia 19, Brescia (BS)"),
    ("Gruppo frigo laboratorio", "Luce & Rete S.r.l.", "Fondamenta Nuove 6, Venezia (VE)"),
    ("Ascensore palazzina A", "Manutec Centro S.r.l.", "Via Emilia 72, Modena (MO)"),
    ("Rilevazione fumi uffici", "Nova Sicurezza S.r.l.", "Via del Porto 28, Cagliari (CA)"),
    ("Rete sprinkler deposito", "Orione Antincendio S.r.l.", "Via Campana 51, Napoli (NA)"),
    ("Ascensore sede direzionale", "Prisma Elevatori S.r.l.", "Via Etnea 104, Catania (CT)"),
]


def seed_plants() -> tuple[int, int]:
    initialize_database()
    inserted = 0
    skipped = 0

    with get_connection() as connection:
        clients = {
            row["name"]: row["id"]
            for row in connection.execute("SELECT id, name FROM clients")
        }

        for name, client_name, location in MOCK_PLANTS:
            client_id = clients.get(client_name)
            if client_id is None:
                skipped += 1
                continue

            existing = connection.execute(
                """
                SELECT 1 FROM plants
                WHERE client_id = ? AND name = ?
                """,
                (client_id, name),
            ).fetchone()
            if existing:
                skipped += 1
                continue

            cursor = connection.execute(
                """
                INSERT INTO plants (code, client_id, name, location)
                VALUES ('', ?, ?, ?)
                """,
                (client_id, name, location),
            )
            plant_id = cursor.lastrowid
            connection.execute(
                "UPDATE plants SET code = ? WHERE id = ?",
                (f"IMP-{plant_id:06d}", plant_id),
            )
            inserted += 1

    return inserted, skipped


if __name__ == "__main__":
    inserted, skipped = seed_plants()
    print(f"Impianti mock inseriti: {inserted}; già presenti o senza cliente: {skipped}.")

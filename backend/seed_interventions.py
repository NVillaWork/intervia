from datetime import date, datetime, timedelta, timezone

from app.database import get_connection, initialize_database


MOCK_INTERVENTIONS = [
    (
        "IMP-000001",
        "Manutenzione annuale climatizzazione",
        35,
        "annual",
        None,
        "Pulizia completa e verifica del circuito refrigerante.",
        False,
        None,
    ),
    (
        "IMP-000002",
        "Riparazione quadro elettrico",
        2,
        "once",
        None,
        "Verificare il surriscaldamento segnalato nel quadro secondario.",
        False,
        None,
    ),
    (
        "IMP-000003",
        "Verifica trimestrale antincendio",
        -5,
        "quarterly",
        None,
        "Controllare pressioni, valvole e registro di manutenzione.",
        False,
        None,
    ),
    (
        "IMP-000004",
        "Controllo mensile centrale termica",
        0,
        "monthly",
        None,
        "Rilevare temperature e pressione di esercizio.",
        False,
        None,
    ),
    (
        "IMP-000005",
        "Sostituzione filtri climatizzazione",
        14,
        "semiannual",
        None,
        "Sostituire i filtri e registrare il modello installato.",
        False,
        None,
    ),
    (
        "IMP-000006",
        "Controllo personalizzato pompa di calore",
        30,
        "custom_days",
        45,
        "Verifica programmata ogni 45 giorni.",
        False,
        None,
    ),
    (
        "IMP-000007",
        "Riparazione urgente pompa idraulica",
        -2,
        "once",
        None,
        "Rumorosità anomala: verificare tenute e cuscinetti.",
        False,
        None,
    ),
    (
        "IMP-000008",
        "Ispezione annuale impianto idrico",
        60,
        "annual",
        None,
        "Controllare perdite e funzionalità delle valvole di sicurezza.",
        False,
        None,
    ),
    (
        "IMP-000009",
        "Riparazione gruppo frigo completata",
        -8,
        "once",
        None,
        "Sostituita la sonda di temperatura.",
        True,
        7,
    ),
    (
        "IMP-000010",
        "Manutenzione ascensore completata",
        -30,
        "quarterly",
        None,
        "Verificati dispositivi di sicurezza e apertura porte.",
        True,
        2,
    ),
]


def seed_interventions() -> tuple[int, int]:
    initialize_database()
    inserted = 0
    skipped = 0
    today = date.today()

    with get_connection() as connection:
        plants = {
            row["code"]: row["id"]
            for row in connection.execute("SELECT id, code FROM plants")
        }

        for (
            plant_code,
            title,
            days_from_today,
            recurrence,
            recurrence_days,
            notes,
            is_completed,
            completed_days_ago,
        ) in MOCK_INTERVENTIONS:
            plant_id = plants.get(plant_code)
            if plant_id is None:
                skipped += 1
                continue

            existing = connection.execute(
                """
                SELECT 1 FROM interventions
                WHERE plant_id = ? AND title = ?
                """,
                (plant_id, title),
            ).fetchone()
            if existing:
                skipped += 1
                continue

            due_date = today + timedelta(days=days_from_today)
            completed_at = None
            if is_completed:
                completed_at = (
                    datetime.now(timezone.utc)
                    - timedelta(days=completed_days_ago or 0)
                ).isoformat()

            connection.execute(
                """
                INSERT INTO interventions (
                    plant_id, title, notes, due_date, recurrence, recurrence_days,
                    recurrence_anchor_date, completed_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    plant_id,
                    title,
                    notes,
                    due_date.isoformat(),
                    recurrence,
                    recurrence_days,
                    due_date.isoformat() if recurrence != "once" else None,
                    completed_at,
                ),
            )
            inserted += 1

    return inserted, skipped


if __name__ == "__main__":
    inserted, skipped = seed_interventions()
    print(
        f"Interventi mock inseriti: {inserted}; "
        f"già presenti o senza impianto: {skipped}."
    )

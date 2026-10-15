import sqlite3
import tempfile
import unittest
from datetime import date, timedelta
from pathlib import Path

from fastapi import HTTPException
from pydantic import ValidationError

import app.database as database
from app.interventions import (
    InterventionInput,
    complete_intervention,
    create_intervention,
    delete_intervention,
    list_interventions,
    occurrence_date,
    update_intervention,
)
from app.main import ClientInput, PlantInput, create_client, create_plant, delete_plant


class InterventionApiTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temporary_directory = tempfile.TemporaryDirectory()
        self.original_database_path = database.DATABASE_PATH
        database.DATABASE_PATH = Path(self.temporary_directory.name) / "test.db"
        database.initialize_database()
        client = create_client(
            ClientInput(
                name="Cliente Test",
                vat_number="10000079193",
                phone="02 1234 5678",
                address="Via Roma 1, Milano",
            )
        )
        self.plant = create_plant(
            PlantInput(
                name="Climatizzazione uffici",
                client_id=client.id,
                location="Via Roma 1, Milano",
            )
        )

    def tearDown(self) -> None:
        database.DATABASE_PATH = self.original_database_path
        self.temporary_directory.cleanup()

    def make_intervention(self, **overrides: object) -> InterventionInput:
        values: dict[str, object] = {
            "plant_id": self.plant.id,
            "title": "Manutenzione filtro",
            "due_date": date.today().isoformat(),
            "recurrence": "once",
        }
        values.update(overrides)
        return InterventionInput.model_validate(values)

    def test_create_requires_existing_plant(self) -> None:
        with self.assertRaises(HTTPException) as raised:
            create_intervention(self.make_intervention(plant_id=999))

        self.assertEqual(raised.exception.status_code, 404)
        self.assertEqual(list_interventions(), [])

    def test_custom_recurrence_requires_positive_day_interval(self) -> None:
        with self.assertRaises(ValidationError):
            self.make_intervention(recurrence="custom_days")
        with self.assertRaises(ValidationError):
            self.make_intervention(recurrence="once", recurrence_days=10)
        with self.assertRaises(ValidationError):
            self.make_intervention(recurrence="custom_days", recurrence_days=0)

    def test_one_time_completion_does_not_create_another_intervention(self) -> None:
        intervention = create_intervention(self.make_intervention())

        completed = complete_intervention(intervention.id)

        self.assertEqual(completed.status, "completed")
        self.assertEqual(len(list_interventions()), 1)

    def test_recurring_completion_creates_next_occurrence_on_original_cadence(self) -> None:
        intervention = create_intervention(
            self.make_intervention(recurrence="monthly")
        )
        today = date.today()

        complete_intervention(intervention.id)
        occurrences = list_interventions()
        next_occurrence = next(item for item in occurrences if item.id != intervention.id)

        self.assertEqual(next_occurrence.due_date, occurrence_date(today, "monthly", None, 1))
        self.assertEqual(next_occurrence.recurrence, "monthly")
        self.assertEqual(next_occurrence.title, intervention.title)
        self.assertEqual(next_occurrence.status, "pending")
        self.assertEqual(len(occurrences), 2)

    def test_late_recurring_completion_skips_missed_intervals_without_drifting(self) -> None:
        anchor = date.today() - timedelta(days=50)
        intervention = create_intervention(
            self.make_intervention(
                due_date=anchor.isoformat(),
                recurrence="custom_days",
                recurrence_days=7,
            )
        )

        complete_intervention(intervention.id)
        occurrences = list_interventions()
        next_occurrence = next(item for item in occurrences if item.id != intervention.id)
        interval = (next_occurrence.due_date - anchor).days

        self.assertGreater(next_occurrence.due_date, date.today())
        self.assertEqual(interval % 7, 0)

    def test_monthly_occurrences_preserve_end_of_month_anchor(self) -> None:
        january_31 = date(2025, 1, 31)

        self.assertEqual(
            occurrence_date(january_31, "monthly", None, 1),
            date(2025, 2, 28),
        )
        self.assertEqual(
            occurrence_date(january_31, "monthly", None, 2),
            date(2025, 3, 31),
        )

    def test_fixed_recurrence_presets_use_the_expected_month_intervals(self) -> None:
        anchor = date(2025, 1, 15)

        self.assertEqual(
            occurrence_date(anchor, "monthly", None, 1),
            date(2025, 2, 15),
        )
        self.assertEqual(
            occurrence_date(anchor, "quarterly", None, 1),
            date(2025, 4, 15),
        )
        self.assertEqual(
            occurrence_date(anchor, "semiannual", None, 1),
            date(2025, 7, 15),
        )
        self.assertEqual(
            occurrence_date(anchor, "annual", None, 1),
            date(2026, 1, 15),
        )

    def test_completion_is_idempotent_and_does_not_duplicate_next_occurrence(self) -> None:
        intervention = create_intervention(
            self.make_intervention(recurrence="quarterly")
        )

        complete_intervention(intervention.id)
        complete_intervention(intervention.id)

        self.assertEqual(len(list_interventions()), 2)

    def test_completed_intervention_cannot_be_updated(self) -> None:
        intervention = create_intervention(self.make_intervention())
        complete_intervention(intervention.id)

        with self.assertRaises(HTTPException) as raised:
            update_intervention(intervention.id, self.make_intervention(title="Altro"))

        self.assertEqual(raised.exception.status_code, 409)

    def test_plant_cannot_be_deleted_while_interventions_exist(self) -> None:
        create_intervention(self.make_intervention())

        with self.assertRaises(HTTPException) as raised:
            delete_plant(self.plant.id)

        self.assertEqual(raised.exception.status_code, 409)
        self.assertEqual(len(list_interventions()), 1)

    def test_deleting_intervention_persists_after_database_reinitialization(self) -> None:
        intervention = create_intervention(self.make_intervention())
        response = delete_intervention(intervention.id)

        self.assertEqual(response.status_code, 204)
        database.initialize_database()
        self.assertEqual(list_interventions(), [])

        with database.get_connection() as connection:
            self.assertEqual(connection.execute("PRAGMA foreign_key_check").fetchall(), [])

    def test_recurring_occurrences_persist_after_database_reinitialization(self) -> None:
        intervention = create_intervention(
            self.make_intervention(recurrence="monthly")
        )
        complete_intervention(intervention.id)

        database.initialize_database()

        occurrences = list_interventions()
        completed = next(item for item in occurrences if item.id == intervention.id)
        upcoming = next(item for item in occurrences if item.id != intervention.id)
        self.assertEqual(completed.status, "completed")
        self.assertEqual(upcoming.recurrence, "monthly")
        self.assertEqual(len(occurrences), 2)


if __name__ == "__main__":
    unittest.main()

import tempfile
import unittest
from pathlib import Path

from fastapi import HTTPException

import app.database as database
from app.main import (
    ClientInput,
    PlantInput,
    create_client,
    create_plant,
    delete_client,
    delete_plant,
    list_plants,
    update_plant,
)


class PlantApiTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temporary_directory = tempfile.TemporaryDirectory()
        self.original_database_path = database.DATABASE_PATH
        database.DATABASE_PATH = Path(self.temporary_directory.name) / "test.db"
        database.initialize_database()
        self.client = create_client(
            ClientInput(
                name="Cliente Test",
                vat_number="10000079193",
                phone="02 1234 5678",
                address="Via Roma 1, Milano",
            )
        )

    def tearDown(self) -> None:
        database.DATABASE_PATH = self.original_database_path
        self.temporary_directory.cleanup()

    def make_plant(self, **overrides: object) -> PlantInput:
        values: dict[str, object] = {
            "name": "Climatizzazione uffici",
            "client_id": self.client.id,
            "location": "  Via   Roma ,12  ",
        }
        values.update(overrides)
        return PlantInput.model_validate(values)

    def test_create_generates_readable_code_and_normalizes_location(self) -> None:
        plant = create_plant(self.make_plant())

        self.assertEqual(plant.id, 1)
        self.assertEqual(plant.code, "IMP-000001")
        self.assertEqual(plant.client_id, self.client.id)
        self.assertEqual(plant.client_name, self.client.name)
        self.assertEqual(plant.location, "Via Roma, 12")

    def test_create_requires_existing_client(self) -> None:
        with self.assertRaises(HTTPException) as raised:
            create_plant(self.make_plant(client_id=999))

        self.assertEqual(raised.exception.status_code, 404)

    def test_client_cannot_be_deleted_while_it_has_plants(self) -> None:
        plant = create_plant(self.make_plant())

        with self.assertRaises(HTTPException) as raised:
            delete_client(self.client.id)

        self.assertEqual(raised.exception.status_code, 409)
        self.assertEqual(len(list_plants()), 1)
        self.assertEqual(list_plants()[0].id, plant.id)

    def test_update_preserves_code_and_can_change_client(self) -> None:
        plant = create_plant(self.make_plant())
        second_client = create_client(
            ClientInput(
                name="Secondo Cliente",
                vat_number="10000158385",
                phone="011 1234 5678",
                address="Corso Italia 3, Torino",
            )
        )

        updated = update_plant(
            plant.id,
            self.make_plant(
                name="Climatizzazione piano terra",
                client_id=second_client.id,
            ),
        )

        self.assertEqual(updated.code, plant.code)
        self.assertEqual(updated.client_id, second_client.id)
        self.assertEqual(updated.client_name, second_client.name)

    def test_deleted_codes_are_not_reused(self) -> None:
        first = create_plant(self.make_plant())
        delete_plant(first.id)
        second = create_plant(self.make_plant(name="Impianto elettrico"))

        self.assertEqual(second.id, 2)
        self.assertEqual(second.code, "IMP-000002")


if __name__ == "__main__":
    unittest.main()

import sqlite3
from contextlib import contextmanager
from pathlib import Path
from typing import Iterator

from app.address import normalize_address


DATABASE_PATH = Path(__file__).resolve().parents[1] / "data" / "intervia.db"


@contextmanager
def get_connection() -> Iterator[sqlite3.Connection]:
    connection = sqlite3.connect(DATABASE_PATH)
    connection.row_factory = sqlite3.Row
    try:
        connection.execute("PRAGMA foreign_keys = ON")
        yield connection
        connection.commit()
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()


def initialize_database() -> None:
    DATABASE_PATH.parent.mkdir(parents=True, exist_ok=True)

    with get_connection() as connection:
        clients_exists = connection.execute(
            """
            SELECT 1
            FROM sqlite_master
            WHERE type = 'table' AND name = 'clients'
            """
        ).fetchone()

        if not clients_exists:
            connection.execute(
                """
                CREATE TABLE clients (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    vat_number TEXT,
                    email TEXT,
                    phone TEXT,
                    address TEXT,
                    status TEXT NOT NULL DEFAULT 'active'
                        CHECK (status IN ('active', 'inactive')),
                    created_at TEXT NOT NULL DEFAULT (
                        strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
                    ),
                    updated_at TEXT NOT NULL DEFAULT (
                        strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
                    )
                )
                """
            )
        else:
            columns = {
                row["name"]
                for row in connection.execute("PRAGMA table_info(clients)")
            }

            if "vat_number" not in columns:
                connection.execute("ALTER TABLE clients ADD COLUMN vat_number TEXT")

            if "updated_at" not in columns:
                connection.execute("ALTER TABLE clients ADD COLUMN updated_at TEXT")
                connection.execute(
                    "UPDATE clients SET updated_at = created_at WHERE updated_at IS NULL"
                )

        connection.execute(
            """
            CREATE UNIQUE INDEX IF NOT EXISTS idx_clients_vat_number
            ON clients(vat_number)
            WHERE vat_number IS NOT NULL
            """
        )

        address_rows = connection.execute(
            "SELECT id, address FROM clients WHERE address IS NOT NULL"
        ).fetchall()
        for row in address_rows:
            normalized_address = normalize_address(row["address"])
            if normalized_address != row["address"]:
                connection.execute(
                    """
                    UPDATE clients
                    SET address = ?,
                        updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
                    WHERE id = ?
                    """,
                    (normalized_address, row["id"]),
                )

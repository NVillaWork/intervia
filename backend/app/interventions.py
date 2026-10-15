import calendar
import sqlite3
from datetime import date, datetime, timedelta, timezone
from typing import Literal

from fastapi import APIRouter, HTTPException, Response, status
from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.database import get_connection


router = APIRouter(prefix="/api/interventions", tags=["interventions"])

Recurrence = Literal[
    "once",
    "monthly",
    "quarterly",
    "semiannual",
    "annual",
    "custom_days",
]

RECURRENCE_MONTHS = {
    "monthly": 1,
    "quarterly": 3,
    "semiannual": 6,
    "annual": 12,
}


class InterventionInput(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    plant_id: int = Field(gt=0)
    title: str = Field(min_length=1, max_length=200)
    notes: str | None = Field(default=None, max_length=2000)
    due_date: date
    recurrence: Recurrence = "once"
    recurrence_days: int | None = Field(default=None, gt=0, le=36500)

    @model_validator(mode="after")
    def validate_recurrence_days(self) -> "InterventionInput":
        if (self.recurrence == "custom_days") != (self.recurrence_days is not None):
            raise ValueError(
                "Specifica l’intervallo in giorni solo per una ricorrenza personalizzata."
            )
        return self


class InterventionResponse(BaseModel):
    id: int
    plant_id: int
    plant_name: str
    plant_code: str
    client_name: str
    title: str
    notes: str | None
    due_date: date
    recurrence: Recurrence
    recurrence_days: int | None
    completed_at: str | None
    status: Literal["pending", "overdue", "completed"]
    created_at: str
    updated_at: str


def months_per_occurrence(recurrence: Recurrence) -> int:
    try:
        return RECURRENCE_MONTHS[recurrence]
    except KeyError as error:
        raise ValueError("La ricorrenza non è espressa in mesi.") from error


def occurrence_date(
    anchor_date: date,
    recurrence: Recurrence,
    recurrence_days: int | None,
    step: int,
) -> date:
    if recurrence == "custom_days":
        if recurrence_days is None:
            raise ValueError("Manca l’intervallo personalizzato in giorni.")
        return anchor_date + timedelta(days=recurrence_days * step)

    months = months_per_occurrence(recurrence) * step
    target_month_index = anchor_date.year * 12 + anchor_date.month - 1 + months
    target_year, zero_based_month = divmod(target_month_index, 12)
    target_month = zero_based_month + 1
    target_day = min(anchor_date.day, calendar.monthrange(target_year, target_month)[1])
    return date(target_year, target_month, target_day)


def intervention_from_row(row: sqlite3.Row) -> InterventionResponse:
    return InterventionResponse.model_validate(dict(row))


def get_intervention(
    connection: sqlite3.Connection,
    intervention_id: int,
) -> sqlite3.Row | None:
    return connection.execute(
        """
        SELECT interventions.*,
               plants.name AS plant_name,
               plants.code AS plant_code,
               clients.name AS client_name,
               CASE
                   WHEN interventions.completed_at IS NOT NULL THEN 'completed'
                   WHEN interventions.due_date < date('now') THEN 'overdue'
                   ELSE 'pending'
               END AS status
        FROM interventions
        JOIN plants ON plants.id = interventions.plant_id
        JOIN clients ON clients.id = plants.client_id
        WHERE interventions.id = ?
        """,
        (intervention_id,),
    ).fetchone()


def ensure_plant_exists(connection: sqlite3.Connection, plant_id: int) -> None:
    if connection.execute(
        "SELECT 1 FROM plants WHERE id = ?",
        (plant_id,),
    ).fetchone() is None:
        raise HTTPException(status_code=404, detail="Impianto associato non trovato.")


@router.get("", response_model=list[InterventionResponse])
def list_interventions() -> list[InterventionResponse]:
    with get_connection() as connection:
        rows = connection.execute(
            """
            SELECT interventions.*,
                   plants.name AS plant_name,
                   plants.code AS plant_code,
                   clients.name AS client_name,
                   CASE
                       WHEN interventions.completed_at IS NOT NULL THEN 'completed'
                       WHEN interventions.due_date < date('now') THEN 'overdue'
                       ELSE 'pending'
                   END AS status
            FROM interventions
            JOIN plants ON plants.id = interventions.plant_id
            JOIN clients ON clients.id = plants.client_id
            ORDER BY
                CASE WHEN interventions.completed_at IS NULL THEN 0 ELSE 1 END,
                interventions.due_date,
                interventions.id
            """
        ).fetchall()

    return [intervention_from_row(row) for row in rows]


@router.post(
    "",
    response_model=InterventionResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_intervention(intervention: InterventionInput) -> InterventionResponse:
    values = intervention.model_dump(mode="json")
    recurrence_anchor_date = (
        values["due_date"] if intervention.recurrence != "once" else None
    )

    with get_connection() as connection:
        ensure_plant_exists(connection, intervention.plant_id)
        cursor = connection.execute(
            """
            INSERT INTO interventions (
                plant_id, title, notes, due_date, recurrence, recurrence_days,
                recurrence_anchor_date
            )
            VALUES (
                :plant_id, :title, :notes, :due_date, :recurrence, :recurrence_days,
                :recurrence_anchor_date
            )
            """,
            {**values, "recurrence_anchor_date": recurrence_anchor_date},
        )
        row = get_intervention(connection, cursor.lastrowid)

    return intervention_from_row(row)


@router.put("/{intervention_id}", response_model=InterventionResponse)
def update_intervention(
    intervention_id: int,
    intervention: InterventionInput,
) -> InterventionResponse:
    values = intervention.model_dump(mode="json")
    recurrence_anchor_date = (
        values["due_date"] if intervention.recurrence != "once" else None
    )

    with get_connection() as connection:
        ensure_plant_exists(connection, intervention.plant_id)
        current = connection.execute(
            "SELECT completed_at FROM interventions WHERE id = ?",
            (intervention_id,),
        ).fetchone()
        if current is None:
            raise HTTPException(status_code=404, detail="Intervento non trovato.")
        if current["completed_at"] is not None:
            raise HTTPException(
                status_code=409,
                detail="Un intervento completato non può essere modificato.",
            )

        connection.execute(
            """
            UPDATE interventions
            SET plant_id = :plant_id,
                title = :title,
                notes = :notes,
                due_date = :due_date,
                recurrence = :recurrence,
                recurrence_days = :recurrence_days,
                recurrence_anchor_date = :recurrence_anchor_date,
                recurrence_step = 0,
                updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
            WHERE id = :id
            """,
            {
                **values,
                "recurrence_anchor_date": recurrence_anchor_date,
                "id": intervention_id,
            },
        )
        row = get_intervention(connection, intervention_id)

    return intervention_from_row(row)


@router.post("/{intervention_id}/complete", response_model=InterventionResponse)
def complete_intervention(intervention_id: int) -> InterventionResponse:
    with get_connection() as connection:
        current = connection.execute(
            "SELECT * FROM interventions WHERE id = ?",
            (intervention_id,),
        ).fetchone()
        if current is None:
            raise HTTPException(status_code=404, detail="Intervento non trovato.")

        if current["completed_at"] is None:
            completed_at = datetime.now(timezone.utc).isoformat()
            connection.execute(
                """
                UPDATE interventions
                SET completed_at = ?,
                    updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
                WHERE id = ?
                """,
                (completed_at, intervention_id),
            )

            recurrence = current["recurrence"]
            if recurrence != "once":
                anchor_date = date.fromisoformat(
                    current["recurrence_anchor_date"] or current["due_date"]
                )
                today = datetime.now(timezone.utc).date()
                recurrence_step = current["recurrence_step"] + 1
                next_due_date = occurrence_date(
                    anchor_date,
                    recurrence,
                    current["recurrence_days"],
                    recurrence_step,
                )
                while next_due_date <= today:
                    recurrence_step += 1
                    next_due_date = occurrence_date(
                        anchor_date,
                        recurrence,
                        current["recurrence_days"],
                        recurrence_step,
                    )

                connection.execute(
                    """
                    INSERT INTO interventions (
                        plant_id, title, notes, due_date, recurrence,
                        recurrence_days, recurrence_anchor_date, recurrence_step
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        current["plant_id"],
                        current["title"],
                        current["notes"],
                        next_due_date.isoformat(),
                        recurrence,
                        current["recurrence_days"],
                        anchor_date.isoformat(),
                        recurrence_step,
                    ),
                )

        row = get_intervention(connection, intervention_id)

    return intervention_from_row(row)


@router.delete("/{intervention_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_intervention(intervention_id: int) -> Response:
    with get_connection() as connection:
        cursor = connection.execute(
            "DELETE FROM interventions WHERE id = ?",
            (intervention_id,),
        )
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Intervento non trovato.")

    return Response(status_code=status.HTTP_204_NO_CONTENT)

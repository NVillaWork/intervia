import sqlite3
from contextlib import asynccontextmanager
from typing import AsyncIterator

from fastapi import FastAPI, HTTPException, Response, status
from pydantic import (
    BaseModel,
    ConfigDict,
    EmailStr,
    Field,
    field_validator,
    model_validator,
)

from app.address import normalize_address
from app.database import get_connection, initialize_database
from app.interventions import router as interventions_router
from app.validators import validate_phone_number


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    initialize_database()
    yield


app = FastAPI(
    title="Intervia API",
    description="API per la gestione operativa di Intervia.",
    lifespan=lifespan,
)
app.include_router(interventions_router)


class ClientInput(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    name: str = Field(min_length=1, max_length=200)
    vat_number: str = Field(pattern=r"^[0-9]{11}$")
    email: EmailStr | None = None
    phone: str | None = Field(default=None, min_length=1, max_length=50)
    address: str = Field(min_length=1, max_length=300)

    @field_validator("email", "phone", "address", mode="before")
    @classmethod
    def empty_values_are_none(cls, value: object) -> object:
        if isinstance(value, str) and not value.strip():
            return None
        return value

    @field_validator("vat_number")
    @classmethod
    def validate_italian_vat_number(cls, value: str) -> str:
        checksum = sum(int(value[index]) for index in range(0, 10, 2))
        for index in range(1, 10, 2):
            doubled_digit = int(value[index]) * 2
            checksum += doubled_digit if doubled_digit < 10 else doubled_digit - 9

        expected_digit = (10 - checksum % 10) % 10
        if expected_digit != int(value[-1]):
            raise ValueError("La partita IVA inserita non è valida.")
        return value

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, value: str | None) -> str | None:
        return validate_phone_number(value) if value is not None else None

    @field_validator("address")
    @classmethod
    def normalize_client_address(cls, value: str) -> str:
        return normalize_address(value)

    @model_validator(mode="after")
    def require_email_or_phone(self) -> "ClientInput":
        if self.email is None and self.phone is None:
            raise ValueError("Inserisci almeno un indirizzo email o un numero di telefono.")
        return self


class ClientResponse(BaseModel):
    id: int
    name: str
    vat_number: str | None
    email: str | None
    phone: str | None
    address: str | None
    status: str
    created_at: str
    updated_at: str | None


class PlantInput(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    name: str = Field(min_length=1, max_length=200)
    client_id: int = Field(gt=0)
    location: str | None = Field(default=None, max_length=300)

    @field_validator("location", mode="before")
    @classmethod
    def normalize_plant_location(cls, value: object) -> object:
        if isinstance(value, str):
            normalized = normalize_address(value)
            return normalized or None
        return value


class PlantResponse(BaseModel):
    id: int
    code: str
    client_id: int
    client_name: str
    name: str
    location: str | None
    status: str
    created_at: str
    updated_at: str


def client_from_row(row: sqlite3.Row) -> dict[str, object]:
    return dict(row)


def plant_from_row(row: sqlite3.Row) -> dict[str, object]:
    return dict(row)


def ensure_client_exists(connection: sqlite3.Connection, client_id: int) -> None:
    client = connection.execute(
        "SELECT 1 FROM clients WHERE id = ?",
        (client_id,),
    ).fetchone()
    if client is None:
        raise HTTPException(status_code=404, detail="Cliente associato non trovato.")


def raise_for_duplicate_vat(error: sqlite3.IntegrityError) -> None:
    if "clients.vat_number" in str(error):
        raise HTTPException(
            status_code=409,
            detail="Esiste già un cliente con questa partita IVA.",
        ) from error
    raise error


@app.get("/api/health")
def health_check() -> dict[str, str]:
    with get_connection() as connection:
        connection.execute("SELECT 1")

    return {"status": "ok", "database": "ok"}


@app.get("/api/clients", response_model=list[ClientResponse])
def list_clients() -> list[ClientResponse]:
    with get_connection() as connection:
        clients = connection.execute(
            "SELECT * FROM clients ORDER BY name COLLATE NOCASE, id"
        ).fetchall()

    return [client_from_row(client) for client in clients]


@app.post(
    "/api/clients",
    response_model=ClientResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_client(client: ClientInput) -> ClientResponse:
    values = client.model_dump(mode="json")

    try:
        with get_connection() as connection:
            cursor = connection.execute(
                """
                INSERT INTO clients (name, vat_number, email, phone, address)
                VALUES (:name, :vat_number, :email, :phone, :address)
                """,
                values,
            )
            created = connection.execute(
                "SELECT * FROM clients WHERE id = ?",
                (cursor.lastrowid,),
            ).fetchone()
    except sqlite3.IntegrityError as error:
        raise_for_duplicate_vat(error)

    return ClientResponse.model_validate(client_from_row(created))


@app.put("/api/clients/{client_id}", response_model=ClientResponse)
def update_client(client_id: int, client: ClientInput) -> ClientResponse:
    values = client.model_dump(mode="json")
    values["id"] = client_id

    try:
        with get_connection() as connection:
            cursor = connection.execute(
                """
                UPDATE clients
                SET name = :name,
                    vat_number = :vat_number,
                    email = :email,
                    phone = :phone,
                    address = :address,
                    updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
                WHERE id = :id
                """,
                values,
            )
            if cursor.rowcount == 0:
                raise HTTPException(status_code=404, detail="Cliente non trovato.")
            updated = connection.execute(
                "SELECT * FROM clients WHERE id = ?",
                (client_id,),
            ).fetchone()
    except sqlite3.IntegrityError as error:
        raise_for_duplicate_vat(error)

    return ClientResponse.model_validate(client_from_row(updated))


@app.delete("/api/clients/{client_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_client(client_id: int) -> Response:
    try:
        with get_connection() as connection:
            cursor = connection.execute(
                "DELETE FROM clients WHERE id = ?",
                (client_id,),
            )
            if cursor.rowcount == 0:
                raise HTTPException(status_code=404, detail="Cliente non trovato.")
    except sqlite3.IntegrityError as error:
        raise HTTPException(
            status_code=409,
            detail="Impossibile eliminare il cliente perché è collegato ad altri dati.",
        ) from error

    return Response(status_code=status.HTTP_204_NO_CONTENT)


@app.get("/api/plants", response_model=list[PlantResponse])
def list_plants() -> list[PlantResponse]:
    with get_connection() as connection:
        plants = connection.execute(
            """
            SELECT plants.*, clients.name AS client_name
            FROM plants
            JOIN clients ON clients.id = plants.client_id
            ORDER BY plants.name COLLATE NOCASE, plants.id
            """
        ).fetchall()

    return [PlantResponse.model_validate(plant_from_row(plant)) for plant in plants]


@app.post(
    "/api/plants",
    response_model=PlantResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_plant(plant: PlantInput) -> PlantResponse:
    values = plant.model_dump()

    with get_connection() as connection:
        ensure_client_exists(connection, plant.client_id)
        cursor = connection.execute(
            """
            INSERT INTO plants (code, client_id, name, location)
            VALUES ('', :client_id, :name, :location)
            """,
            values,
        )
        plant_id = cursor.lastrowid
        code = f"IMP-{plant_id:06d}"
        connection.execute(
            "UPDATE plants SET code = ? WHERE id = ?",
            (code, plant_id),
        )
        created = connection.execute(
            """
            SELECT plants.*, clients.name AS client_name
            FROM plants
            JOIN clients ON clients.id = plants.client_id
            WHERE plants.id = ?
            """,
            (plant_id,),
        ).fetchone()

    return PlantResponse.model_validate(plant_from_row(created))


@app.put("/api/plants/{plant_id}", response_model=PlantResponse)
def update_plant(plant_id: int, plant: PlantInput) -> PlantResponse:
    values = plant.model_dump()
    values["id"] = plant_id

    with get_connection() as connection:
        ensure_client_exists(connection, plant.client_id)
        cursor = connection.execute(
            """
            UPDATE plants
            SET client_id = :client_id,
                name = :name,
                location = :location,
                updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
            WHERE id = :id
            """,
            values,
        )
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Impianto non trovato.")
        updated = connection.execute(
            """
            SELECT plants.*, clients.name AS client_name
            FROM plants
            JOIN clients ON clients.id = plants.client_id
            WHERE plants.id = ?
            """,
            (plant_id,),
        ).fetchone()

    return PlantResponse.model_validate(plant_from_row(updated))


@app.delete("/api/plants/{plant_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_plant(plant_id: int) -> Response:
    try:
        with get_connection() as connection:
            cursor = connection.execute(
                "DELETE FROM plants WHERE id = ?",
                (plant_id,),
            )
            if cursor.rowcount == 0:
                raise HTTPException(status_code=404, detail="Impianto non trovato.")
    except sqlite3.IntegrityError as error:
        raise HTTPException(
            status_code=409,
            detail="Impossibile eliminare l’impianto perché è collegato ad altri dati.",
        ) from error

    return Response(status_code=status.HTTP_204_NO_CONTENT)

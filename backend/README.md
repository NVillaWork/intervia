# Intervia backend

Backend API built with FastAPI. SQLite is included with Python, so no separate
database server is needed.

## Run locally

From this directory:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

The API is available at <http://127.0.0.1:8000>; interactive API
documentation is at <http://127.0.0.1:8000/docs>.
In another terminal, start the frontend from the repository root with
`npm --prefix intervia run dev`.

The SQLite database is created at `data/intervia.db` when the application
starts. The client API is available at `/api/clients`:

- `GET /api/clients` lists clients.
- `POST /api/clients` creates a client.
- `PUT /api/clients/{id}` updates a client.
- `DELETE /api/clients/{id}` deletes a client.

Each client has an automatically assigned ID, company name, Italian VAT
number, email, phone, and address. The company name, address, and VAT number
are required. The VAT number must contain 11 digits and pass its checksum; at
least one of email or phone is required. VAT numbers must be unique. The API
docs at `/docs` describe the request and response formats.

Addresses are normalized automatically by trimming leading/trailing spaces,
collapsing repeated whitespace, and standardizing spacing around commas.
Capitalization, abbreviations, and other address text are preserved; no
external address lookup or verification is performed.

The database file is local and ignored by Git. Existing client rows are
preserved when the database is upgraded with the VAT number and update-time
columns.

To add the 13 repeatable sample clients to the local database, run from this
directory:

```bash
python seed_clients.py
```

Sample records use the reserved `.example` email domain and are inserted only
when their generated VAT number is not already present.

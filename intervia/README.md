# Intervia

Applicazione gestionale per piccole aziende di manutenzione. Il frontend usa
React e Vite; il backend usa FastAPI e SQLite.

## Avvio in locale

Avvia il backend dal repository:

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

In un secondo terminale, dalla cartella del repository:

```bash
npm --prefix intervia run dev
```

Vite inoltra le richieste `/api` a FastAPI. L'API e la documentazione interattiva
sono disponibili rispettivamente su <http://127.0.0.1:8000> e
<http://127.0.0.1:8000/docs>.

## Dati

SQLite crea `backend/data/intervia.db` all'avvio del backend. Il database è
locale e non viene incluso in Git.

La sezione **Clienti** consente di elencare, creare, modificare ed eliminare
clienti. Nome azienda, partita IVA italiana e indirizzo sono obbligatori; serve
almeno uno tra email e telefono. La partita IVA deve avere 11 cifre, checksum
valido ed essere univoca.

Il conteggio dei clienti attivi nella dashboard legge i dati dal database.
Impianti, interventi e le altre metriche sono ancora dimostrativi.

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

La sezione **Impianti** gestisce gli impianti associati ai clienti. La sezione
**Interventi** consente di pianificare attività per un impianto, indicare una
scadenza e scegliere se l’attività è singola o ricorrente: mensile,
trimestrale, semestrale, annuale o ogni N giorni. Segnando un intervento
ricorrente come completato, l’app crea la prossima scadenza mantenendo la
cadenza originaria. Se la scadenza successiva è già passata, gli intervalli
trascorsi vengono saltati.

La dashboard mostra interventi da svolgere, scaduti e le prossime scadenze
leggendo i dati dal database locale. I promemoria sono visualizzati nell’app;
non sono ancora previsti invii di email o notifiche esterne.

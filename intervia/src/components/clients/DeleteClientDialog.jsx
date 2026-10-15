import { useEffect, useRef } from 'react'

export default function DeleteClientDialog({ client, isDeleting, onCancel, onConfirm }) {
  const dialogRef = useRef(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (dialog && !dialog.open) {
      dialog.showModal()
    }

    return () => {
      if (dialog?.open) {
        dialog.close()
      }
    }
  }, [])

  return (
    <dialog
      aria-describedby="delete-client-description"
      aria-labelledby="delete-client-title"
      className="delete-dialog"
      onCancel={(event) => {
        event.preventDefault()
        if (!isDeleting) {
          onCancel()
        }
      }}
      onClick={(event) => {
        if (event.target === dialogRef.current && !isDeleting) {
          onCancel()
        }
      }}
      ref={dialogRef}
    >
      <div className="delete-dialog-content">
        <div aria-hidden="true" className="delete-dialog-icon">
          !
        </div>
        <p className="delete-dialog-eyebrow">ELIMINAZIONE CLIENTE</p>
        <h2 id="delete-client-title">Vuoi eliminare questo cliente?</h2>
        <p id="delete-client-description" className="delete-dialog-description">
          <strong>{client.name}</strong> verrà rimosso dall’elenco. Questa
          operazione non può essere annullata.
        </p>
        <div className="delete-dialog-actions">
          <button
            autoFocus
            className="secondary-button"
            disabled={isDeleting}
            onClick={onCancel}
            type="button"
          >
            Annulla
          </button>
          <button
            className="danger-button delete-confirm-button"
            disabled={isDeleting}
            onClick={onConfirm}
            type="button"
          >
            {isDeleting ? 'Eliminazione...' : 'Elimina cliente'}
          </button>
        </div>
      </div>
    </dialog>
  )
}

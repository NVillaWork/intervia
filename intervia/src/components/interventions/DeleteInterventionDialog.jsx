import { useEffect, useRef } from 'react'

export default function DeleteInterventionDialog({
  intervention,
  isDeleting,
  onCancel,
  onConfirm,
}) {
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
      aria-describedby="delete-intervention-description"
      aria-labelledby="delete-intervention-title"
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
        <p className="delete-dialog-eyebrow">ELIMINAZIONE INTERVENTO</p>
        <h2 id="delete-intervention-title">Vuoi eliminare questo intervento?</h2>
        <p
          className="delete-dialog-description"
          id="delete-intervention-description"
        >
          <strong>{intervention.title}</strong> verrà rimosso dall’elenco.
          Questa operazione non può essere annullata.
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
            {isDeleting ? 'Eliminazione...' : 'Elimina intervento'}
          </button>
        </div>
      </div>
    </dialog>
  )
}

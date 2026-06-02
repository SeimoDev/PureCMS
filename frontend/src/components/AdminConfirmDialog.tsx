import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, type ButtonProps } from '@mui/material'

type AdminConfirmDialogProps = {
  open: boolean
  title: string
  message: string
  cancelLabel: string
  confirmLabel: string
  color?: ButtonProps['color']
  busy?: boolean
  onClose: () => void
  onConfirm: () => void
}

export default function AdminConfirmDialog({
  open,
  title,
  message,
  cancelLabel,
  confirmLabel,
  color = 'warning',
  busy = false,
  onClose,
  onConfirm,
}: AdminConfirmDialogProps) {
  return (
    <Dialog open={open} onClose={() => (!busy ? onClose() : undefined)} maxWidth="xs" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <DialogContentText>{message}</DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={busy}>
          {cancelLabel}
        </Button>
        <Button variant="contained" color={color} onClick={onConfirm} disabled={busy}>
          {confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

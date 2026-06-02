import { Box, CircularProgress, Stack, Typography } from '@mui/material'

export default function LoadingState({ label }: { label: string }) {
  return (
    <Box sx={{ minHeight: 260, display: 'grid', placeItems: 'center' }}>
      <Stack alignItems="center" gap={2}>
        <CircularProgress size={28} />
        <Typography color="text.secondary">{label}</Typography>
      </Stack>
    </Box>
  )
}

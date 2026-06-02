import { Box, Typography } from '@mui/material'

export default function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <Box sx={{ py: 8, textAlign: 'center', color: 'text.secondary' }}>
      <Typography variant="h6" color="text.primary" gutterBottom>
        {title}
      </Typography>
      {description && <Typography variant="body2">{description}</Typography>}
    </Box>
  )
}

import { Box, Card, CardContent, Stack, Typography } from '@mui/material'
import { ListTree } from 'lucide-react'
import type { ArticleHeading } from '../articleRenderer'

export default function ArticleToc({
  headings,
  sticky = false,
  title,
  navLabel,
}: {
  headings: ArticleHeading[]
  sticky?: boolean
  title: string
  navLabel: string
}) {
  if (headings.length < 2) return null

  return (
    <Card
      variant="outlined"
      sx={{
        position: sticky ? 'sticky' : 'static',
        top: sticky ? 96 : 'auto',
        bgcolor: 'rgba(255,255,255,0.72)',
        backdropFilter: 'blur(12px)',
      }}
    >
      <CardContent>
        <Stack gap={1.5}>
          <Stack direction="row" gap={1} alignItems="center">
            <ListTree size={18} />
            <Typography fontWeight={900}>{title}</Typography>
          </Stack>
          <Box component="nav" aria-label={navLabel}>
            <Stack gap={0.25}>
              {headings.map((heading) => (
                <Box
                  key={heading.id}
                  component="a"
                  href={`#${heading.id}`}
                  sx={{
                    display: 'block',
                    py: 0.65,
                    pl: heading.level === 1 ? 0 : heading.level === 2 ? 1.25 : 2.5,
                    pr: 0.5,
                    borderRadius: 1,
                    color: 'text.secondary',
                    fontSize: 14,
                    fontWeight: heading.level === 1 ? 900 : 700,
                    lineHeight: 1.45,
                    overflowWrap: 'anywhere',
                    '&:hover': {
                      bgcolor: 'rgba(37, 107, 87, 0.09)',
                      color: 'primary.main',
                    },
                  }}
                >
                  {heading.text}
                </Box>
              ))}
            </Stack>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  )
}

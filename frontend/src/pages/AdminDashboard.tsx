import { Avatar, Box, Button, Card, CardActionArea, CardContent, Chip, Stack, Typography, type ChipProps } from '@mui/material'
import {
  ArrowRight,
  BookOpenCheck,
  CalendarClock,
  FolderTree,
  Images,
  MessageSquareText,
  MessageSquareWarning,
  PanelTop,
  Plus,
  Star,
  TextCursorInput,
  TrendingUp,
  UploadCloud,
  Users,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import { api } from '../api/client'
import { compactNumber } from '../components/format'
import { dashboardQuickActions, dashboardTasks, dashboardUIText, type DashboardMetricKey, type DashboardTaskTone } from '../dashboard'
import LoadingState from '../components/LoadingState'
import type { AdminOutletContext } from '../layouts/AdminLayout'
import type { DashboardStats } from '../types'

const metricConfig = [
  { key: 'posts', icon: TextCursorInput },
  { key: 'publishedPosts', icon: TrendingUp },
  { key: 'scheduledPosts', icon: CalendarClock },
  { key: 'featuredPosts', icon: Star },
  { key: 'pendingComments', icon: MessageSquareWarning },
  { key: 'mediaAssets', icon: Images },
  { key: 'users', icon: Users },
] satisfies { key: DashboardMetricKey; icon: typeof TextCursorInput }[]

const taskIconMap = {
  'pending-comments': MessageSquareWarning,
  'scheduled-posts': CalendarClock,
  'draft-posts': TextCursorInput,
  'featured-posts': Star,
  'content-structure': FolderTree,
  'media-library': Images,
} as const

const quickActionIconMap = {
  'new-post': BookOpenCheck,
  pages: PanelTop,
  media: UploadCloud,
  comments: MessageSquareText,
} as const

const taskToneMeta: Record<
  DashboardTaskTone,
  { chipColor: ChipProps['color']; borderColor: string; background: string }
> = {
  urgent: { chipColor: 'error', borderColor: 'error.main', background: 'rgba(186, 26, 26, 0.06)' },
  active: { chipColor: 'warning', borderColor: 'warning.main', background: 'rgba(178, 106, 0, 0.08)' },
  calm: { chipColor: 'default', borderColor: 'divider', background: 'background.paper' },
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const { adminLanguage } = useOutletContext<AdminOutletContext>()
  const dashboardText = useMemo(() => dashboardUIText(adminLanguage), [adminLanguage])

  useEffect(() => {
    let active = true
    api
      .dashboard()
      .then((nextStats) => {
        if (active) {
          setStats(nextStats)
        }
      })
      .catch(() => undefined)
    return () => {
      active = false
    }
  }, [])

  if (!stats) return <LoadingState label={dashboardText.loading} />

  const tasks = dashboardTasks(stats, dashboardText)
  const quickActions = dashboardQuickActions(dashboardText)

  return (
    <Stack gap={3.5}>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" gap={2}>
        <Box>
          <Typography variant="h4">{dashboardText.title}</Typography>
          <Typography color="text.secondary">{dashboardText.subtitle}</Typography>
        </Box>
        <Stack direction="row" gap={1} flexWrap="wrap" useFlexGap>
          <Button component={Link} to="/admin/comments?status=pending" variant="outlined" startIcon={<MessageSquareText size={18} />}>
            {dashboardText.reviewComments}
          </Button>
          <Button component={Link} to="/admin/posts/new" variant="contained" startIcon={<Plus size={18} />}>
            {dashboardText.writePost}
          </Button>
        </Stack>
      </Stack>

      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)', xl: 'repeat(7, 1fr)' } }}>
        {metricConfig.map((metric) => {
          const Icon = metric.icon
          return (
            <Card key={metric.key}>
              <CardContent>
                <Stack gap={2}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography color="text.secondary">{dashboardText.metrics[metric.key]}</Typography>
                    <Icon size={20} />
                  </Stack>
                  <Typography variant="h3">{compactNumber(stats[metric.key])}</Typography>
                </Stack>
              </CardContent>
            </Card>
          )
        })}
      </Box>

      <Stack gap={1.5}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" gap={2}>
          <Box>
            <Typography variant="h5">{dashboardText.tasksTitle}</Typography>
            <Typography color="text.secondary">{dashboardText.tasksSubtitle}</Typography>
          </Box>
        </Stack>

        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', xl: 'repeat(5, 1fr)' } }}>
          {tasks.map((task) => {
            const Icon = taskIconMap[task.key as keyof typeof taskIconMap] ?? ArrowRight
            const tone = taskToneMeta[task.tone]
            return (
              <Card
                key={task.key}
                sx={{
                  borderColor: tone.borderColor,
                  bgcolor: tone.background,
                  transition: 'transform 160ms ease, box-shadow 160ms ease',
                  '&:hover': { transform: 'translateY(-2px)', boxShadow: 3 },
                }}
              >
                <CardActionArea component={Link} to={task.href} sx={{ height: '100%', alignItems: 'stretch' }}>
                  <CardContent sx={{ height: '100%' }}>
                    <Stack gap={2} sx={{ height: '100%' }}>
                      <Stack direction="row" justifyContent="space-between" gap={2}>
                        <Avatar sx={{ width: 38, height: 38, bgcolor: 'primary.light', color: 'primary.dark' }}>
                          <Icon size={20} />
                        </Avatar>
                        <Chip label={dashboardText.tones[task.tone]} color={tone.chipColor} size="small" />
                      </Stack>
                      <Box>
                        <Typography variant="h6">{task.title}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {task.description}
                        </Typography>
                      </Box>
                      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mt: 'auto' }}>
                        <Typography variant="h4">{compactNumber(task.count)}</Typography>
                        <Stack direction="row" alignItems="center" gap={0.75} color="primary.main">
                          <Typography variant="button">{task.action}</Typography>
                          <ArrowRight size={16} />
                        </Stack>
                      </Stack>
                    </Stack>
                  </CardContent>
                </CardActionArea>
              </Card>
            )
          })}
        </Box>
      </Stack>

      <Stack gap={1.5}>
        <Box>
          <Typography variant="h5">{dashboardText.quickTitle}</Typography>
          <Typography color="text.secondary">{dashboardText.quickSubtitle}</Typography>
        </Box>
        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' } }}>
          {quickActions.map((action) => {
            const Icon = quickActionIconMap[action.key as keyof typeof quickActionIconMap] ?? ArrowRight
            return (
              <Card key={action.key}>
                <CardActionArea component={Link} to={action.href} sx={{ height: '100%', alignItems: 'stretch' }}>
                  <CardContent>
                    <Stack direction="row" gap={2} alignItems="center">
                      <Avatar sx={{ width: 40, height: 40, bgcolor: 'secondary.light', color: 'secondary.dark' }}>
                        <Icon size={20} />
                      </Avatar>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="h6">{action.title}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {action.description}
                        </Typography>
                      </Box>
                    </Stack>
                  </CardContent>
                </CardActionArea>
              </Card>
            )
          })}
        </Box>
      </Stack>

      <Stack direction="row" gap={1} flexWrap="wrap" useFlexGap>
        <Chip color="primary" label={dashboardText.chips.drafts(stats.draftPosts)} />
        <Chip color="secondary" label={dashboardText.chips.featured(stats.featuredPosts)} />
        <Chip color="success" label={dashboardText.chips.approvedComments(stats.approvedComments)} />
        <Chip variant="outlined" label={dashboardText.chips.categories(stats.categories)} />
        <Chip variant="outlined" label={dashboardText.chips.tags(stats.tags)} />
        <Chip variant="outlined" label={dashboardText.chips.activityLogs(stats.activityLogs)} />
        <Chip variant="outlined" label={dashboardText.chips.views(compactNumber(stats.views))} />
      </Stack>
    </Stack>
  )
}

import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  IconButton,
  Link as MuiLink,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material'
import { Activity, CalendarDays, Eye, RefreshCw, TrendingUp } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import { analyticsUIText, formatAnalyticsDay, type AnalyticsMetricKey } from '../analytics'
import { api, apiErrorMessage } from '../api/client'
import { compactNumber } from '../components/format'
import LoadingState from '../components/LoadingState'
import type { AdminOutletContext } from '../layouts/AdminLayout'
import type { AnalyticsSummary } from '../types'

export default function AnalyticsPage() {
  const [days, setDays] = useState(14)
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const { adminLanguage } = useOutletContext<AdminOutletContext>()
  const analyticsText = useMemo(() => analyticsUIText(adminLanguage), [adminLanguage])

  const loadAnalytics = useCallback(async (nextDays = days) => {
    setLoading(true)
    setError('')
    try {
      setSummary(await api.analytics(nextDays))
    } catch (err) {
      setError(apiErrorMessage(err, analyticsText.loadFailed))
    } finally {
      setLoading(false)
    }
  }, [analyticsText.loadFailed, days])

  useEffect(() => {
    void loadAnalytics(days)
  }, [days, loadAnalytics])

  const maxViews = Math.max(1, ...(summary?.dailyViews.map((item) => item.views) ?? [0]))
  const metrics = [
    { key: 'totalViews', value: summary?.totalViews ?? 0, icon: Eye, color: 'primary.main' },
    { key: 'todayViews', value: summary?.todayViews ?? 0, icon: Activity, color: 'warning.main' },
    { key: 'days', value: days, icon: CalendarDays, color: 'secondary.main' },
  ] satisfies { key: AnalyticsMetricKey; value: number; icon: typeof Eye; color: string }[]

  return (
    <Stack gap={3}>
      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" gap={2}>
        <Box>
          <Typography variant="h4">{analyticsText.title}</Typography>
          <Typography color="text.secondary">{analyticsText.subtitle}</Typography>
        </Box>
        <Stack direction="row" gap={1} alignItems="center">
          <ToggleButtonGroup
            exclusive
            value={days}
            size="small"
            onChange={(_, value: number | null) => {
              if (value) setDays(value)
            }}
            aria-label={analyticsText.rangeAria}
          >
            <ToggleButton value={7}>{analyticsText.dayOption(7)}</ToggleButton>
            <ToggleButton value={14}>{analyticsText.dayOption(14)}</ToggleButton>
            <ToggleButton value={30}>{analyticsText.dayOption(30)}</ToggleButton>
          </ToggleButtonGroup>
          <Tooltip title={analyticsText.refresh}>
            <span>
              <IconButton onClick={() => void loadAnalytics()} disabled={loading} aria-label={analyticsText.refresh}>
                <RefreshCw size={20} />
              </IconButton>
            </span>
          </Tooltip>
        </Stack>
      </Stack>

      {error && (
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={() => void loadAnalytics()}>
              {analyticsText.retry}
            </Button>
          }
        >
          {error}
        </Alert>
      )}

      {!summary && loading ? (
        <LoadingState label={analyticsText.loading} />
      ) : (
        <>
          <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' } }}>
            {metrics.map((metric) => {
              const Icon = metric.icon
              return (
                <Card key={metric.key}>
                  <CardContent>
                    <Stack direction="row" alignItems="center" justifyContent="space-between" gap={2}>
                      <Stack gap={1}>
                        <Typography color="text.secondary">{analyticsText.metrics[metric.key]}</Typography>
                        <Typography variant="h3">{compactNumber(metric.value)}</Typography>
                      </Stack>
                      <Box
                        sx={{
                          width: 46,
                          height: 46,
                          borderRadius: 2,
                          display: 'grid',
                          placeItems: 'center',
                          color: metric.color,
                          bgcolor: 'rgba(37, 107, 87, 0.08)',
                        }}
                      >
                        <Icon size={22} />
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>
              )
            })}
          </Box>

          <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1.35fr) minmax(320px, 0.65fr)' } }}>
            <Card>
              <CardContent>
                <Stack gap={2.5}>
                  <Stack direction="row" alignItems="center" justifyContent="space-between" gap={2}>
                    <Box>
                      <Typography variant="h6">{analyticsText.dailyTrend}</Typography>
                      <Typography color="text.secondary" variant="body2">
                        {analyticsText.recentDays(days)}
                      </Typography>
                    </Box>
                    <Chip icon={<TrendingUp size={16} />} label={analyticsText.totalViewsChip(compactNumber(summary?.totalViews ?? 0))} />
                  </Stack>
                  <Box sx={{ display: 'grid', gap: 1.25 }}>
                    {(summary?.dailyViews ?? []).map((item) => {
                      const percent = Math.max(3, Math.round((item.views / maxViews) * 100))
                      return (
                        <Box
                          key={item.date}
                          sx={{
                            display: 'grid',
                            gridTemplateColumns: { xs: '54px minmax(0, 1fr) 48px', sm: '70px minmax(0, 1fr) 58px' },
                            gap: 1.5,
                            alignItems: 'center',
                            minHeight: 30,
                          }}
                        >
                          <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
                            {formatAnalyticsDay(item.date, adminLanguage)}
                          </Typography>
                          <Box sx={{ height: 14, borderRadius: 999, bgcolor: 'rgba(23, 33, 29, 0.08)', overflow: 'hidden' }}>
                            <Box
                              sx={{
                                width: `${percent}%`,
                                height: '100%',
                                borderRadius: 999,
                                bgcolor: item.views === maxViews ? 'secondary.main' : 'primary.main',
                                transition: 'width 220ms ease',
                              }}
                            />
                          </Box>
                          <Typography textAlign="right" variant="body2" fontWeight={800}>
                            {compactNumber(item.views)}
                          </Typography>
                        </Box>
                      )
                    })}
                  </Box>
                </Stack>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <Stack gap={2}>
                  <Box>
                    <Typography variant="h6">{analyticsText.popularPosts}</Typography>
                    <Typography color="text.secondary" variant="body2">
                      {analyticsText.currentRange}
                    </Typography>
                  </Box>
                  <Stack divider={<Divider flexItem />} gap={0}>
                    {(summary?.popularPosts ?? []).length === 0 && (
                      <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
                        {analyticsText.empty}
                      </Typography>
                    )}
                    {(summary?.popularPosts ?? []).map((post, index) => (
                      <Stack key={post.id} direction="row" alignItems="center" gap={1.5} sx={{ py: 1.4, minWidth: 0 }}>
                        <Chip size="small" label={index + 1} sx={{ width: 34 }} />
                        <Box sx={{ minWidth: 0, flex: 1 }}>
                          <MuiLink
                            component={Link}
                            to={`/admin/preview/posts/${post.id}`}
                            underline="hover"
                            color="text.primary"
                            fontWeight={800}
                            sx={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                          >
                            {post.title}
                          </MuiLink>
                          <Typography variant="caption" color="text.secondary">
                            /posts/{post.slug}
                          </Typography>
                        </Box>
                        <Typography fontWeight={900}>{compactNumber(post.views)}</Typography>
                      </Stack>
                    ))}
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          </Box>
        </>
      )}
    </Stack>
  )
}

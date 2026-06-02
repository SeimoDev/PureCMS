import { Alert, Box, Button, Card, CardContent, Chip, InputAdornment, MenuItem, Pagination, Stack, TextField, Typography } from '@mui/material'
import { Search } from 'lucide-react'
import { FormEvent, useEffect, useMemo, useState } from 'react'
import { useOutletContext, useSearchParams } from 'react-router-dom'
import { activityActionLabel, activityActionOptions, activityDetailText, activityEntityTypeLabel, activityEntityTypeOptions } from '../activityLogs'
import { activityLogsPageUIText } from '../activityLogsPageI18n'
import { api, apiErrorMessage } from '../api/client'
import EmptyState from '../components/EmptyState'
import { formatDate } from '../components/format'
import LoadingState from '../components/LoadingState'
import type { AdminOutletContext } from '../layouts/AdminLayout'
import { clampPage, pageCount } from '../pagination'
import type { ActivityLog } from '../types'

const activityLogPageSize = 20

export default function ActivityLogsPage() {
  const { adminLanguage } = useOutletContext<AdminOutletContext>()
  const text = useMemo(() => activityLogsPageUIText(adminLanguage), [adminLanguage])
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [total, setTotal] = useState(0)
  const [pageLimit, setPageLimit] = useState(activityLogPageSize)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchParams, setSearchParams] = useSearchParams()
  const query = searchParams.get('q') ?? ''
  const [keyword, setKeyword] = useState(query)
  const action = searchParams.get('action') ?? ''
  const entityType = searchParams.get('entityType') ?? ''
  const currentPage = Math.max(1, Number(searchParams.get('page') ?? '1') || 1)
  const pages = pageCount(total, pageLimit)
  const visiblePage = clampPage(currentPage, pages)

  useEffect(() => {
    setKeyword(query)
  }, [query])

  useEffect(() => {
    setLoading(true)
    setError('')
    api
      .activityLogsPage({ q: query, action, entityType, limit: activityLogPageSize, page: currentPage })
      .then((value) => {
        setLogs(value.items)
        setTotal(value.total)
        setPageLimit(value.limit)
      })
      .catch((err) => setError(apiErrorMessage(err, text.loadError)))
      .finally(() => setLoading(false))
  }, [action, currentPage, entityType, query, text.loadError])

  function submit(event: FormEvent) {
    event.preventDefault()
    const params = new URLSearchParams(searchParams)
    if (keyword.trim()) params.set('q', keyword.trim())
    else params.delete('q')
    params.delete('page')
    setSearchParams(params)
  }

  function patchFilter(name: 'action' | 'entityType', value: string) {
    const params = new URLSearchParams(searchParams)
    if (value) params.set(name, value)
    else params.delete(name)
    params.delete('page')
    setSearchParams(params)
  }

  function changePage(page: number) {
    const params = new URLSearchParams(searchParams)
    if (page > 1) params.set('page', String(page))
    else params.delete('page')
    setSearchParams(params)
  }

  if (loading) return <LoadingState label={text.loading} />

  return (
    <Stack gap={3}>
      <Box>
        <Typography variant="h4">{text.title}</Typography>
        <Typography color="text.secondary">{text.subtitle}</Typography>
      </Box>
      <Card>
        <CardContent>
          <Stack component="form" direction={{ xs: 'column', md: 'row' }} gap={2} onSubmit={submit}>
            <TextField
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder={text.searchPlaceholder}
              fullWidth
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search size={18} />
                  </InputAdornment>
                ),
              }}
            />
            <TextField select label={text.actionLabel} value={action} onChange={(event) => patchFilter('action', event.target.value)} sx={{ minWidth: 150 }}>
              <MenuItem value="">{text.allActions}</MenuItem>
              {activityActionOptions.map((item) => (
                <MenuItem key={item} value={item}>
                  {activityActionLabel(item, text.logLabels)}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label={text.entityTypeLabel}
              value={entityType}
              onChange={(event) => patchFilter('entityType', event.target.value)}
              sx={{ minWidth: 150 }}
            >
              <MenuItem value="">{text.allEntityTypes}</MenuItem>
              {activityEntityTypeOptions.map((item) => (
                <MenuItem key={item} value={item}>
                  {activityEntityTypeLabel(item, text.logLabels)}
                </MenuItem>
              ))}
            </TextField>
            <Button type="submit" variant="outlined" startIcon={<Search size={18} />}>
              {text.search}
            </Button>
          </Stack>
        </CardContent>
      </Card>
      {error && <Alert severity="error">{error}</Alert>}
      {logs.length === 0 ? (
        <EmptyState title={text.emptyTitle} description={text.emptyDescription} />
      ) : (
        <Stack gap={1.5}>
          {logs.map((log) => (
            <Card key={log.id}>
              <CardContent>
                <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" gap={2}>
                  <Stack gap={1}>
                    <Stack direction="row" gap={1} flexWrap="wrap" useFlexGap alignItems="center">
                      <Chip color="primary" label={activityActionLabel(log.action, text.logLabels)} />
                      <Chip variant="outlined" label={activityEntityTypeLabel(log.entityType, text.logLabels)} />
                      {log.entityId && <Chip size="small" label={log.entityId} variant="outlined" />}
                    </Stack>
                    <Typography color="text.secondary">
                      {log.actorUsername || text.systemActor} · {log.ipAddress || text.unknownSource}
                    </Typography>
                    {activityDetailText(log.detail, text.logLabels) && (
                      <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>
                        {activityDetailText(log.detail, text.logLabels)}
                      </Typography>
                    )}
                  </Stack>
                  <Typography color="text.secondary">{formatDate(log.createdAt, adminLanguage)}</Typography>
                </Stack>
              </CardContent>
            </Card>
          ))}
          <Card>
            <CardContent>
              <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ xs: 'stretch', sm: 'center' }} justifyContent="space-between" gap={2}>
                <Typography variant="body2" color="text.secondary">
                  {text.paginationSummary(total, visiblePage, pages)}
                </Typography>
                <Pagination
                  count={pages}
                  page={visiblePage}
                  color="primary"
                  onChange={(_, value) => changePage(value)}
                  siblingCount={1}
                  boundaryCount={1}
                />
              </Stack>
            </CardContent>
          </Card>
        </Stack>
      )}
    </Stack>
  )
}

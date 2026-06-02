import type { BackupSnapshot } from './types'

export const maxBackupImportBytes = 50 * 1024 * 1024

export type BackupMediaStats = {
  total: number
  embedded: number
  missing: number
  bytes: number
}

export function base64ByteLength(value: string | undefined): number {
  const clean = value?.trim().replace(/\s/g, '') ?? ''
  if (!clean) return 0
  const padding = clean.endsWith('==') ? 2 : clean.endsWith('=') ? 1 : 0
  return Math.max(0, Math.floor((clean.length * 3) / 4) - padding)
}

export function backupMediaStats(snapshot: BackupSnapshot | null | undefined): BackupMediaStats {
	const assets = snapshot?.mediaAssets ?? []
	const embeddedAssets = assets.filter((asset) => asset.contentBase64?.trim())
	return {
    total: assets.length,
    embedded: embeddedAssets.length,
    missing: assets.length - embeddedAssets.length,
    bytes: embeddedAssets.reduce((sum, asset) => sum + base64ByteLength(asset.contentBase64), 0),
	}
}

export function backupSnapshotRecordCount(snapshot: BackupSnapshot | null | undefined): number {
	if (!snapshot) return 0
	return (
		Object.keys(snapshot.settings ?? {}).length +
		(snapshot.users?.length ?? 0) +
		(snapshot.posts?.length ?? 0) +
		(snapshot.pages?.length ?? 0) +
		(snapshot.categories?.length ?? 0) +
		(snapshot.tags?.length ?? 0) +
		(snapshot.comments?.length ?? 0) +
		(snapshot.mediaAssets?.length ?? 0) +
		(snapshot.activityLogs?.length ?? 0) +
		(snapshot.postRevisions?.length ?? 0) +
		(snapshot.pageRevisions?.length ?? 0) +
		(snapshot.postTranslations?.length ?? 0) +
		(snapshot.postTranslationJobs?.length ?? 0) +
		(snapshot.friendLinks?.length ?? 0) +
		(snapshot.viewStats?.length ?? 0)
	)
}

export function backupImportFileTooLarge(fileSize: number, maxBytes = maxBackupImportBytes): boolean {
	return fileSize > maxBytes
}

export function formatBackupBytes(bytes: number, locale = 'en'): string {
  const numberFormat = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 })
  if (bytes < 1024) return `${numberFormat.format(bytes)} B`
  const kb = bytes / 1024
  if (kb < 1024) return `${numberFormat.format(stripTrailingZero(kb))} KB`
  const mb = kb / 1024
  return `${numberFormat.format(stripTrailingZero(mb))} MB`
}

function stripTrailingZero(value: number): number {
  return Number(value.toFixed(value >= 10 ? 0 : 1))
}

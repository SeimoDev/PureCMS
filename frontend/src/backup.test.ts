import { backupImportFileTooLarge, backupMediaStats, backupSnapshotRecordCount, base64ByteLength, formatBackupBytes, maxBackupImportBytes } from './backup.js'
import type { BackupSnapshot } from './types.js'

function assertEqual<T>(actual: T, expected: T, label: string) {
  if (actual !== expected) {
    throw new Error(`${label}: got ${JSON.stringify(actual)}, want ${JSON.stringify(expected)}`)
  }
}

assertEqual(base64ByteLength(''), 0, 'empty base64 length')
assertEqual(base64ByteLength('YQ=='), 1, 'single byte base64 length')
assertEqual(base64ByteLength('aGVsbG8='), 5, 'base64 padding length')

const snapshot = {
  mediaAssets: [
    { contentBase64: 'aGVsbG8=' },
    { contentBase64: 'YQ==' },
    { contentBase64: '' },
    {},
  ],
} as BackupSnapshot

const stats = backupMediaStats(snapshot)
assertEqual(stats.total, 4, 'media total')
assertEqual(stats.embedded, 2, 'embedded media count')
assertEqual(stats.missing, 2, 'missing media count')
assertEqual(stats.bytes, 6, 'embedded media bytes')

const countSnapshot = {
  settings: { site: {}, translation: {} },
  users: [{}, {}],
  posts: [{}],
  pages: [{}],
  categories: [{}],
  tags: [{}],
  comments: [{}, {}],
  mediaAssets: [{}],
  activityLogs: [{}],
  postRevisions: [{}],
  pageRevisions: [{}],
  postTranslations: [{}, {}],
  postTranslationJobs: [{}],
  friendLinks: [{}],
  viewStats: [{}],
} as BackupSnapshot

assertEqual(backupSnapshotRecordCount(countSnapshot), 19, 'backup snapshot total record count')
assertEqual(backupSnapshotRecordCount(null), 0, 'empty backup snapshot total record count')
assertEqual(formatBackupBytes(512), '512 B', 'bytes label')
assertEqual(formatBackupBytes(1536), '1.5 KB', 'kb label')
assertEqual(formatBackupBytes(3 * 1024 * 1024), '3 MB', 'mb label')
assertEqual(formatBackupBytes(1536, 'fr'), '1,5 KB', 'localized kb label')
assertEqual(backupImportFileTooLarge(maxBackupImportBytes), false, 'backup import accepts exact size limit')
assertEqual(backupImportFileTooLarge(maxBackupImportBytes + 1), true, 'backup import rejects files over size limit')

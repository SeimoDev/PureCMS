import { Box, IconButton, Stack, Tooltip } from '@mui/material'
import { Bold, Code2, Heading2, Link as LinkIcon, List, ListOrdered, Quote, Table2 } from 'lucide-react'
import type { ReactNode, RefObject } from 'react'
import { applyMarkdownShortcut, type MarkdownShortcut } from '../markdownShortcuts'
import { postEditorUIText, type MarkdownToolbarText } from '../postEditorI18n'

type Tool = {
  label: string
  shortcut: MarkdownShortcut
  icon: ReactNode
}

const defaultText: MarkdownToolbarText = postEditorUIText('zh-CN').toolbar

function toolbarTools(text: MarkdownToolbarText): Tool[] {
  return [
    { label: text.h2, shortcut: 'h2', icon: <Heading2 size={18} /> },
    { label: text.bold, shortcut: 'bold', icon: <Bold size={18} /> },
    { label: text.quote, shortcut: 'quote', icon: <Quote size={18} /> },
    { label: text.ul, shortcut: 'ul', icon: <List size={18} /> },
    { label: text.ol, shortcut: 'ol', icon: <ListOrdered size={18} /> },
    { label: text.link, shortcut: 'link', icon: <LinkIcon size={18} /> },
    { label: text.code, shortcut: 'code', icon: <Code2 size={18} /> },
    { label: text.table, shortcut: 'table', icon: <Table2 size={18} /> },
  ]
}

type MarkdownToolbarProps = {
  value: string
  onChange: (value: string) => void
  textareaRef: RefObject<HTMLTextAreaElement | null>
  compact?: boolean
  text?: MarkdownToolbarText
}

export default function MarkdownToolbar({ value, onChange, textareaRef, compact = false, text = defaultText }: MarkdownToolbarProps) {
  function apply(shortcut: MarkdownShortcut) {
    const target = textareaRef.current
    const selectionStart = target?.selectionStart ?? value.length
    const selectionEnd = target?.selectionEnd ?? value.length
    const result = applyMarkdownShortcut(value, selectionStart, selectionEnd, shortcut, text)
    onChange(result.content)
    window.requestAnimationFrame(() => {
      textareaRef.current?.focus()
      textareaRef.current?.setSelectionRange(result.selectionStart, result.selectionEnd)
    })
  }

  return (
    <Box
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
        px: 1,
        py: 0.5,
        backgroundColor: 'background.default',
      }}
    >
      <Stack direction="row" gap={0.5} flexWrap="wrap" useFlexGap>
        {toolbarTools(text).map((tool) => (
          <Tooltip key={tool.shortcut} title={tool.label}>
            <IconButton type="button" size={compact ? 'small' : 'medium'} aria-label={tool.label} onClick={() => apply(tool.shortcut)}>
              {tool.icon}
            </IconButton>
          </Tooltip>
        ))}
      </Stack>
    </Box>
  )
}

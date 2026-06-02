import { Box } from '@mui/material'
import { markdownToHtml } from '../articleRenderer'

export default function ArticleRenderer({ content }: { content: string }) {
  const html = markdownToHtml(content)

  return <Box className="article-content" dangerouslySetInnerHTML={{ __html: html }} />
}

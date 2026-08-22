import unified from 'unified'
import remarkGfm from 'remark-gfm'
import remarkParse from 'remark-parse'
import remarkStringify from 'remark-stringify'

/**
 * Formats Markdown through its GFM abstract syntax tree. This formatter never
 * synthesizes document content or table separator rows.
 */
export const formatMarkdown = async (source: string): Promise<string> =>
  String(
    await unified()
      .use(remarkParse)
      .use(remarkGfm)
      .use(remarkStringify, { bullet: '-', fences: true, incrementListMarker: false })
      .process(source.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n')),
  )

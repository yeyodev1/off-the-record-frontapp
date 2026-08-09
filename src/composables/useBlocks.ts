import { ACCENT_PALETTE } from '@/config/navigation'
import type { BlockKind, ContentBlock } from '@/types'

export function blockUid() {
  return `b_${Math.random().toString(36).slice(2, 10)}`
}

export function emptyBlock(kind: BlockKind = 'paragraph'): ContentBlock {
  return {
    uid: blockUid(),
    kind,
    html: '',
    text: '',
    items: kind === 'list' ? [''] : [],
    ordered: false,
    level: 2,
    color: kind === 'divider' || kind === 'intertitle' ? ACCENT_PALETTE[0] || '#E4572E' : '',
    background: '',
    align: 'left',
    indent: 0,
    lineHeight: 1.7,
    fontFamily: '',
    fontSize: '',
    assetUrl: '',
    assetKind: 'image',
    caption: '',
    meta: {},
  }
}

/** Plain text of every block — the payload the AI and spellcheck endpoints read. */
export function blocksToPlainText(blocks: ContentBlock[]) {
  return blocks
    .map((block) => {
      if (block.kind === 'list') return block.items.filter(Boolean).join('\n')
      if (block.kind === 'media' || block.kind === 'divider') return block.caption
      return block.text || block.html.replace(/<[^>]+>/g, ' ')
    })
    .filter((part) => part.trim())
    .join('\n\n')
}

export function normalizeBlocks(blocks: unknown): ContentBlock[] {
  if (!Array.isArray(blocks)) return [emptyBlock()]

  const normalized = blocks.map((block) => ({ ...emptyBlock(), ...(block as Partial<ContentBlock>) }))
  return normalized.length ? normalized : [emptyBlock()]
}

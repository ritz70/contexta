// Canonical text and offset mapping for ProseMirror ↔ engine
// Pure functions, no I/O

/**
 * Extract canonical text from TipTap/ProseMirror JSON document.
 * Blocks are joined by a single '\n'.
 * If content is a plain string, return it as-is.
 */
export function canonicalText(content: string | ProseMirrorDoc): string {
  if (typeof content === 'string') return content;

  const blocks: string[] = [];
  if (content.content) {
    for (const node of content.content) {
      if (node.type === 'paragraph' || node.type === 'heading') {
        const text = extractTextFromNode(node);
        blocks.push(text);
      } else {
        const text = extractTextFromNode(node);
        blocks.push(text);
      }
    }
  }
  return blocks.join('\n');
}

export interface ProseMirrorDoc {
  type: 'doc';
  content?: ProseMirrorNode[];
}

export interface ProseMirrorNode {
  type: string;
  content?: ProseMirrorNode[];
  text?: string;
  attrs?: Record<string, unknown>;
}

function extractTextFromNode(node: ProseMirrorNode): string {
  if (node.text !== undefined) return node.text;
  if (!node.content) return '';
  return node.content.map(extractTextFromNode).join('');
}

export interface OffsetMapEntry {
  blockIndex: number;
  canonicalStart: number;
  canonicalEnd: number;
  pmStart: number;
  pmEnd: number;
}

/**
 * Build a mapping between canonical text offsets and ProseMirror positions.
 *
 * ProseMirror positions:
 * - doc starts at 0
 * - each block node opens at pos, content starts at pos+1
 * - text runs from pos+1 to pos+1+textLength
 * - block closes at pos+1+textLength (which is also next block's open)
 *
 * Canonical offsets:
 * - first block starts at 0
 * - each subsequent block is separated by '\n' (1 char)
 */
export function buildOffsetMap(doc: ProseMirrorDoc): OffsetMapEntry[] {
  const entries: OffsetMapEntry[] = [];
  if (!doc.content) return entries;

  let canonicalOffset = 0;
  let pmPos = 0; // doc node itself is at 0, first child at 1

  for (let i = 0; i < doc.content.length; i++) {
    const node = doc.content[i];
    const text = extractTextFromNode(node);
    const textLen = text.length;

    // ProseMirror: block opens at pmPos, content at pmPos+1
    const pmStart = pmPos + 1; // start of text inside the block
    const pmEnd = pmPos + 1 + textLen; // end of text inside the block

    entries.push({
      blockIndex: i,
      canonicalStart: canonicalOffset,
      canonicalEnd: canonicalOffset + textLen,
      pmStart,
      pmEnd,
    });

    canonicalOffset += textLen;
    if (i < doc.content.length - 1) {
      canonicalOffset += 1; // '\n' separator
    }

    // ProseMirror: block node takes 1 (open) + textLen + 1 (close) = textLen + 2
    pmPos += textLen + 2;
  }

  return entries;
}

/**
 * Convert a canonical text offset to a ProseMirror position.
 */
export function canonicalToPm(offset: number, map: OffsetMapEntry[]): number {
  for (const entry of map) {
    if (offset >= entry.canonicalStart && offset <= entry.canonicalEnd) {
      const delta = offset - entry.canonicalStart;
      return entry.pmStart + delta;
    }
  }
  // Beyond end: return last position
  if (map.length > 0) {
    return map[map.length - 1].pmEnd;
  }
  return 0;
}

/**
 * Convert a ProseMirror position to a canonical text offset.
 */
export function pmToCanonical(pmPos: number, map: OffsetMapEntry[]): number {
  for (const entry of map) {
    if (pmPos >= entry.pmStart && pmPos <= entry.pmEnd) {
      const delta = pmPos - entry.pmStart;
      return entry.canonicalStart + delta;
    }
  }
  // Beyond end
  if (map.length > 0) {
    return map[map.length - 1].canonicalEnd;
  }
  return 0;
}

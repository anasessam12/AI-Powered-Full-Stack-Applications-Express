export interface TextChunk {
  ordinal: number;
  content: string;
  pageNumber: number | null;
  section: string | null;
}

const MAX_CHUNK_CHARACTERS = 1200;
const OVERLAP_CHARACTERS = 150;

export function chunkDocumentText(text: string, pageAware = false): TextChunk[] {
  const pages = pageAware ? text.split('\f') : [text];
  const chunks: TextChunk[] = [];
  let ordinal = 0;

  pages.forEach((pageText, pageIndex) => {
    let section: string | null = null;
    let sectionBuffer = '';
    const flush = () => {
      const normalized = sectionBuffer.replace(/\s+/g, ' ').trim();
      if (!normalized) return;
      for (let start = 0; start < normalized.length; start += MAX_CHUNK_CHARACTERS - OVERLAP_CHARACTERS) {
        const content = normalized.slice(start, start + MAX_CHUNK_CHARACTERS).trim();
        if (content) chunks.push({ ordinal: ordinal++, content, pageNumber: pageAware ? pageIndex + 1 : null, section });
      }
      sectionBuffer = '';
    };

    for (const line of pageText.split(/\r?\n/)) {
      const heading = /^(#{1,6})\s+(.+?)\s*#*\s*$/.exec(line.trim());
      if (heading) {
        flush();
        section = heading[2].slice(0, 255);
      } else {
        sectionBuffer += `${line}\n`;
      }
    }
    flush();
  });

  return chunks;
}

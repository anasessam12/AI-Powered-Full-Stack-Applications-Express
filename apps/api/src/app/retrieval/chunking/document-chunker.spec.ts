import { chunkDocumentText } from './document-chunker';

describe('chunkDocumentText', () => {
  it('keeps Markdown headings with their text and bounds long chunks with overlap', () => {
    const input = `# Refunds\n${'Customers may request a refund after purchase. '.repeat(40)}\n## Timing\nRefunds take five business days.`;
    const chunks = chunkDocumentText(input);

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[0].section).toBe('Refunds');
    expect(chunks[0].content.length).toBeLessThanOrEqual(1200);
    expect(chunks[1].content.slice(0, 80)).toBe(chunks[0].content.slice(-150, -70));
    expect(chunks[chunks.length - 1]).toMatchObject({ section: 'Timing', pageNumber: null });
  });

  it('preserves page numbers across PDF page boundaries', () => {
    expect(chunkDocumentText('First page details\fSecond page details', true)).toEqual([
      { ordinal: 0, content: 'First page details', pageNumber: 1, section: null },
      { ordinal: 1, content: 'Second page details', pageNumber: 2, section: null },
    ]);
  });

  it('drops whitespace-only input', () => {
    expect(chunkDocumentText(' \n\t ')).toEqual([]);
  });
});

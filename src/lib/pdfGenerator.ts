/**
 * High-performance, zero-dependency PDF 1.4 Binary Generator
 * Generates standards-compliant, beautifully styled academic study documents
 * with custom headers, multi-column boxes, exemplar question callouts, and footers.
 */

export interface PdfSection {
  type: 'heading' | 'box' | 'text' | 'bullet' | 'formula' | 'subheading';
  title?: string;
  text: string;
  badge?: string;
}

export interface PdfPage {
  sections: PdfSection[];
}

export interface PdfDocumentDefinition {
  title: string;
  subtitle: string;
  subject: string;
  pages: PdfPage[];
}

function escapePdfText(str: string): string {
  if (!str) return '';
  return str
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, ' '); // Clean unprintable chars for standard Helvetica
}

export function generateAcademicPdfBuffer(doc: PdfDocumentDefinition): Buffer {
  const objects: { id: number; content: string }[] = [];
  let nextObjId = 1;

  function allocId() {
    return nextObjId++;
  }

  const fontHelvetica = allocId();
  const fontHelveticaBold = allocId();
  const fontHelveticaOblique = allocId();
  const catalogId = allocId();
  const pagesRootId = allocId();

  const pageIds: number[] = [];
  const contentIds: number[] = [];

  for (let i = 0; i < doc.pages.length; i++) {
    pageIds.push(allocId());
    contentIds.push(allocId());
  }

  // 1: Normal Font
  objects.push({
    id: fontHelvetica,
    content: `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>`,
  });

  // 2: Bold Font
  objects.push({
    id: fontHelveticaBold,
    content: `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>`,
  });

  // 3: Oblique (Italic) Font
  objects.push({
    id: fontHelveticaOblique,
    content: `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Oblique /Encoding /WinAnsiEncoding >>`,
  });

  // 4: Catalog
  objects.push({
    id: catalogId,
    content: `<< /Type /Catalog /Pages ${pagesRootId} 0 R >>`,
  });

  // 5: Pages root
  const kidsStr = pageIds.map((id) => `${id} 0 R`).join(' ');
  objects.push({
    id: pagesRootId,
    content: `<< /Type /Pages /Kids [${kidsStr}] /Count ${pageIds.length} >>`,
  });

  // Page dimensions: US Letter (612 x 792 pt)
  const pageWidth = 612;
  const pageHeight = 792;
  const marginX = 40;
  const contentWidth = pageWidth - marginX * 2; // 532 pt

  for (let i = 0; i < doc.pages.length; i++) {
    const pId = pageIds[i];
    const cId = contentIds[i];
    const pageData = doc.pages[i];

    let stream = '';

    // --- Header Background Banner ---
    stream += `q\n`;
    // Deep Navy Header Banner
    stream += `0.043 0.100 0.180 rg 0 715 ${pageWidth} 77 re f\n`;
    // Vibrant Blue Accent Border Stripe
    stream += `0.150 0.400 0.950 rg 0 711 ${pageWidth} 4 re f\n`;
    // Amber decorative badge accent
    stream += `0.950 0.650 0.100 rg 40 766 6 12 re f\n`;

    // Header Text
    stream += `1.0 1.0 1.0 rg\n`;
    stream += `BT /F2 15 Tf 52 766 Td (${escapePdfText(doc.title)}) Tj ET\n`;

    stream += `0.75 0.85 1.0 rg\n`;
    stream += `BT /F1 8.5 Tf 40 747 Td (${escapePdfText(doc.subtitle)}) Tj ET\n`;

    // Subject Pill & Page Number in Header
    stream += `0.12 0.22 0.38 rg ${pageWidth - 145} 740 105 20 re f\n`;
    stream += `1.0 1.0 1.0 rg\n`;
    stream += `BT /F2 8 Tf ${pageWidth - 138} 746 Td (${escapePdfText(doc.subject.toUpperCase())} | P. ${i + 1}/${doc.pages.length}) Tj ET\n`;
    stream += `Q\n`;

    // --- Body Content ---
    stream += `q\n`;
    let currentY = 675;

    for (const sec of pageData.sections) {
      if (currentY < 90) break; // Keep within printable margin

      if (sec.type === 'heading') {
        // Section Title
        stream += `0.08 0.18 0.42 rg\n`;
        stream += `BT /F2 12 Tf ${marginX} ${currentY} Td (${escapePdfText(sec.text)}) Tj ET\n`;
        currentY -= 5;
        // Accent underline
        stream += `0.20 0.45 0.90 RG 1.5 w ${marginX} ${currentY} m ${marginX + 220} ${currentY} l S\n`;
        stream += `0.85 0.88 0.92 RG 0.5 w ${marginX + 220} ${currentY} m ${marginX + contentWidth} ${currentY} l S\n`;
        currentY -= 17;
      } else if (sec.type === 'subheading') {
        stream += `0.15 0.25 0.45 rg\n`;
        stream += `BT /F2 10 Tf ${marginX} ${currentY} Td (${escapePdfText(sec.text)}) Tj ET\n`;
        currentY -= 14;
      } else if (sec.type === 'box') {
        // Highlight Box with left border
        const boxHeight = 44;
        const boxY = currentY - boxHeight + 8;
        // Box background
        stream += `0.96 0.97 1.00 rg ${marginX} ${boxY} ${contentWidth} ${boxHeight} re f\n`;
        // Border outline
        stream += `0.80 0.86 0.95 RG 0.75 w ${marginX} ${boxY} ${contentWidth} ${boxHeight} re S\n`;
        // Left accent bar
        stream += `0.15 0.42 0.92 rg ${marginX} ${boxY} 4 ${boxHeight} re f\n`;

        // Box Title
        stream += `0.08 0.22 0.55 rg\n`;
        stream += `BT /F2 9.5 Tf ${marginX + 12} ${boxY + 27} Td (${escapePdfText(sec.title || 'Key Principle')}) Tj ET\n`;

        // Box Content
        stream += `0.18 0.22 0.30 rg\n`;
        stream += `BT /F1 8.5 Tf ${marginX + 12} ${boxY + 12} Td (${escapePdfText(sec.text)}) Tj ET\n`;

        currentY -= boxHeight + 10;
      } else if (sec.type === 'formula') {
        // Formula Box
        const formulaHeight = 36;
        const formY = currentY - formulaHeight + 8;
        stream += `0.98 0.96 0.92 rg ${marginX} ${formY} ${contentWidth} ${formulaHeight} re f\n`;
        stream += `0.90 0.78 0.50 RG 0.75 w ${marginX} ${formY} ${contentWidth} ${formulaHeight} re S\n`;
        stream += `0.90 0.55 0.10 rg ${marginX} ${formY} 4 ${formulaHeight} re f\n`;

        stream += `0.55 0.30 0.05 rg\n`;
        stream += `BT /F2 9 Tf ${marginX + 12} ${formY + 21} Td (${escapePdfText(sec.title || 'Formula / Identity')}) Tj ET\n`;
        stream += `0.10 0.10 0.15 rg\n`;
        stream += `BT /F2 9 Tf ${marginX + 12} ${formY + 9} Td (${escapePdfText(sec.text)}) Tj ET\n`;

        currentY -= formulaHeight + 8;
      } else if (sec.type === 'bullet') {
        // Bullet Point
        stream += `0.20 0.45 0.90 rg\n`;
        stream += `BT /F2 9 Tf ${marginX + 4} ${currentY} Td (*) Tj ET\n`;
        stream += `0.15 0.20 0.28 rg\n`;
        stream += `BT /F1 9 Tf ${marginX + 18} ${currentY} Td (${escapePdfText(sec.text)}) Tj ET\n`;
        currentY -= 15;
      } else {
        // Standard Paragraph Text
        stream += `0.15 0.18 0.25 rg\n`;
        stream += `BT /F1 9 Tf ${marginX} ${currentY} Td (${escapePdfText(sec.text)}) Tj ET\n`;
        currentY -= 15;
      }
    }

    // --- Footer ---
    stream += `0.80 0.84 0.90 RG 0.75 w ${marginX} 48 m ${pageWidth - marginX} 48 l S\n`;
    stream += `0.45 0.50 0.60 rg\n`;
    stream += `BT /F1 8 Tf ${marginX} 34 Td (Examizo Learning Network - High-Yield Academic Preparation Module - Official Syllabus Aligned) Tj ET\n`;
    stream += `BT /F2 8 Tf ${pageWidth - marginX - 70} 34 Td (Page ${i + 1} of ${doc.pages.length}) Tj ET\n`;
    stream += `Q\n`;

    const streamLen = Buffer.byteLength(stream, 'utf-8');

    // Page object
    objects.push({
      id: pId,
      content: `<< /Type /Page /Parent ${pagesRootId} 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Contents ${cId} 0 R /Resources << /Font << /F1 ${fontHelvetica} 0 R /F2 ${fontHelveticaBold} 0 R /F3 ${fontHelveticaOblique} 0 R >> >> >>`,
    });

    // Content stream object
    objects.push({
      id: cId,
      content: `<< /Length ${streamLen} >>\nstream\n${stream}\nendstream`,
    });
  }

  // Sort objects by ID
  objects.sort((a, b) => a.id - b.id);

  let output = `%PDF-1.4\n%âãÏÓ\n`;
  const xrefOffsets: { id: number; offset: number }[] = [];

  for (const obj of objects) {
    const offset = Buffer.byteLength(output, 'utf-8');
    xrefOffsets.push({ id: obj.id, offset });
    output += `${obj.id} 0 obj\n${obj.content}\nendobj\n`;
  }

  const startXref = Buffer.byteLength(output, 'utf-8');
  output += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const item of xrefOffsets) {
    const padded = String(item.offset).padStart(10, '0');
    output += `${padded} 00000 n \n`;
  }

  output += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${startXref}\n%%EOF\n`;
  return Buffer.from(output, 'utf-8');
}

import { NextRequest, NextResponse } from 'next/server';
import { generateAcademicPdfBuffer } from '@/lib/pdfGenerator';
import { CURATED_ACADEMIC_RESOURCES, getResourcePdfDocument } from '@/lib/academicResourceData';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id') || 'res-def-2';
    const isDownload = searchParams.get('download') === 'true' || searchParams.get('download') === '1';
    const externalUrl = searchParams.get('url');

    // If an external URL is provided and not the broken dummy url, attempt proxy
    if (externalUrl && !externalUrl.includes('w3.org') && !externalUrl.includes('dummy.pdf')) {
      try {
        const proxied = await fetch(externalUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ExamizoAcademicReader/1.0',
          },
        });
        if (proxied.ok && proxied.headers.get('content-type')?.includes('application/pdf')) {
          const proxiedBuffer = await proxied.arrayBuffer();
          const cleanName = (id || 'academic-document').replace(/[^a-zA-Z0-9_-]/g, '_');
          return new NextResponse(proxiedBuffer, {
            status: 200,
            headers: {
              'Content-Type': 'application/pdf',
              'Content-Disposition': `${isDownload ? 'attachment' : 'inline'}; filename="${cleanName}.pdf"`,
              'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
            },
          });
        }
      } catch (proxyErr) {
        console.warn('[api/resources/pdf] Proxy fetch failed, falling back to local generated PDF:', proxyErr);
      }
    }

    // Resolve curated or generated document
    const docDefinition = getResourcePdfDocument(id);
    const pdfBuffer = generateAcademicPdfBuffer(docDefinition);

    const safeFilename = `${docDefinition.title.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `${isDownload ? 'attachment' : 'inline'}; filename="${safeFilename}"`,
        'Content-Length': String(pdfBuffer.length),
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error: any) {
    console.error('[api/resources/pdf] Error generating PDF stream:', error);
    return new NextResponse('Internal Error Generating Academic PDF Document', { status: 500 });
  }
}

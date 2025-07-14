import { NextRequest, NextResponse } from 'next/server';
import { Resource, WorksheetResource } from '@/lib/types/resource';
import { PDFService } from '@/lib/services/PDFService';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const dataParam = searchParams.get('data');
    
    if (!dataParam) {
      return NextResponse.json(
        { error: 'No worksheet data provided' },
        { status: 400 }
      );
    }

    // Decode and parse the worksheet data
    let resource: WorksheetResource;
    try {
      resource = JSON.parse(decodeURIComponent(dataParam)) as WorksheetResource;
    } catch (parseError) {
      console.error('Error parsing worksheet data:', parseError);
      return NextResponse.json(
        { error: 'Invalid worksheet data format' },
        { status: 400 }
      );
    }
    
    // Validate the resource
    if (!resource || !resource.title) {
      return NextResponse.json(
        { error: 'Invalid resource data provided' },
        { status: 400 }
      );
    }

    // Generate PDF using PDFService with server-side method
    const pdfBuffer = await PDFService.generatePDF(resource, 'server');

    // Set response headers for PDF download
    const headers = new Headers();
    headers.set('Content-Type', 'application/pdf');
    headers.set('Content-Disposition', `attachment; filename="${resource.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf"`);
    headers.set('Content-Length', pdfBuffer.length.toString());
    
    // Set caching headers to allow some caching but ensure freshness
    headers.set('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers
    });
  } catch (error: unknown) {
    console.error('Error in PDF download:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate PDF for download' },
      { status: 500 }
    );
  }
} 
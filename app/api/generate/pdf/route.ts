import { NextRequest, NextResponse } from 'next/server';
import { Resource, WorksheetResource } from '@/lib/types/resource';
import { PDFService } from '@/lib/services/PDFService';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const resource = await request.json() as WorksheetResource;
    
    // Debug logging
    console.log('Resource data received by PDF API:', resource);
    
    // Validate the resource
    if (!resource || !resource.title) {
      return NextResponse.json(
        { error: 'Invalid resource data provided' },
        { status: 400 }
      );
    }

    // Generate PDF using PDFService with server-side method
    const pdfBuffer = await PDFService.generatePDF(resource, 'server');

    // Debug logging
    console.log('PDF generation completed, buffer size:', pdfBuffer.length);

    // Set response headers for PDF download
    const headers = new Headers();
    headers.set('Content-Type', 'application/pdf');
    headers.set('Content-Disposition', `attachment; filename="${resource.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf"`);
    headers.set('Content-Length', pdfBuffer.length.toString());

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers
    });
  } catch (error: unknown) {
    console.error('Error in PDF generation:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate PDF' },
      { status: 500 }
    );
  }
} 
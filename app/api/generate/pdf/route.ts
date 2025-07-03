import { NextRequest, NextResponse } from 'next/server';
import { Resource } from '@/lib/types/resource';
import { PDFService } from '@/lib/services/PDFService';

export const runtime = 'nodejs'; // Required for @react-pdf/renderer

export async function POST(request: Request) {
  try {
    const resource = await request.json() as Resource;
    
    // Validate the resource
    if (!resource || !resource.title) {
      return NextResponse.json(
        { error: 'Invalid resource data provided' },
        { status: 400 }
      );
    }

    // Generate PDF using PDFService
    const pdfBuffer = await PDFService.generateFromResource(resource);

    // Set response headers for PDF download
    const headers = new Headers();
    headers.set('Content-Type', 'application/pdf');
    headers.set('Content-Disposition', `attachment; filename="${resource.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf"`);
    headers.set('Content-Length', pdfBuffer.length.toString());

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers
    });
  } catch (error) {
    console.error('Error in PDF generation:', error);
    return NextResponse.json(
      { error: 'Failed to generate PDF' },
      { status: 500 }
    );
  }
} 
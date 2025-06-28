import { NextRequest, NextResponse } from 'next/server';
import { generateWorksheetPDF } from '@/lib/utils/pdf-generator';
import { Resource } from '@/lib/types/resource';

export const runtime = 'nodejs'; // Required for @react-pdf/renderer

export async function POST(req: NextRequest) {
  try {
    const resource = await req.json() as Resource;
    
    // Validate the resource
    if (!resource || !resource.title || !resource.problems) {
      return NextResponse.json(
        { error: 'Invalid resource data provided' },
        { status: 400 }
      );
    }

    // Generate PDF
    const pdfBuffer = await generateWorksheetPDF(resource);

    // Return the PDF as a response
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${resource.title.toLowerCase().replace(/\s+/g, '-')}.pdf"`,
      },
    });
  } catch (error) {
    console.error('Error generating PDF:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate PDF' },
      { status: 500 }
    );
  }
} 
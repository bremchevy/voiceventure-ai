import { pdf } from '@react-pdf/renderer';
import { Resource } from '../types/resource';
import { WorksheetDocument } from './pdf-renderer';
import React from 'react';

export async function generateWorksheetPDF(resource: Resource): Promise<Buffer> {
  try {
    const doc = React.createElement(WorksheetDocument, { resource });
    const pdfBuffer = await pdf(doc).toBuffer();
    return pdfBuffer;
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
}
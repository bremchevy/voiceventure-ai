import puppeteer from 'puppeteer';
import { Resource, WorksheetResource } from '../types/resource';
import { generatePDFContent } from '../handlers/format-manager';
import { themeStyles } from '../constants/theme-styles';

function generateCommonStyles(theme: keyof typeof themeStyles) {
  const style = themeStyles[theme];
  return `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    body {
      font-family: ${style.fontFamily};
      line-height: 1.5;
      color: ${style.primaryColor};
      background-color: ${style.backgroundColor};
      margin: 0;
      padding: 20px;
    }

    .document {
      max-width: 800px;
      margin: 0 auto;
    }

    .header {
      text-align: center;
      margin-bottom: 30px;
      padding: 20px;
      background: ${style.secondaryColor};
      border-radius: 8px;
      color: white;
    }

    .title {
      margin: 0;
      font-size: 24px;
      font-weight: 600;
    }

    .content {
      background: white;
      padding: 30px;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    .metadata {
      display: flex;
      gap: 20px;
      margin-bottom: 20px;
    }

    .field {
      margin-bottom: 15px;
    }

    .field-label {
      font-weight: 500;
      color: ${style.primaryColor};
    }

    .field-value {
      color: ${style.secondaryColor};
    }

    .instructions {
      margin: 20px 0;
      padding: 15px;
      background-color: #f9fafb;
      border-radius: 6px;
      border-left: 4px solid ${style.accentColor};
    }

    .section {
      margin: 30px 0;
    }

    .section-title {
      font-size: 18px;
      font-weight: 600;
      color: ${style.primaryColor};
      margin-bottom: 20px;
      padding-bottom: 8px;
      border-bottom: 2px solid ${style.accentColor};
    }

    .answer-space {
      margin-top: 15px;
      min-height: 40px;
      border-bottom: 1px dashed ${style.borderColor};
      padding: 10px 0;
    }

    .avoid-break {
      break-inside: avoid;
      page-break-inside: avoid;
    }
  `;
}

function generateResourceSpecificContent(resource: Resource) {
  // For now, we only handle worksheet resources
  if (resource.resourceType !== 'worksheet') {
      throw new Error(`Unsupported resource type: ${resource.resourceType}`);
  }
  return generatePDFContent(resource as WorksheetResource);
}

export async function generatePDF(resource: Resource): Promise<Buffer> {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  const theme = resource.theme || 'General';
  const style = themeStyles[theme];

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          ${generateCommonStyles(theme)}
        </style>
      </head>
      <body>
        <div class="document">
          <div class="header">
            <h1 class="title">${style.emojis[0]} ${resource.title} ${style.emojis[1]}</h1>
          </div>
          
          <div class="content">
            <div class="metadata">
              <div class="field">
                <span class="field-label">Name:</span> <span class="field-value">_______________________</span>
              </div>
              <div class="field">
                <span class="field-label">Date:</span> <span class="field-value">_______________________</span>
              </div>
            </div>
            
            <div class="field">
              <span class="field-label">Subject:</span> <span class="field-value">${resource.subject}</span>
            </div>
            <div class="field">
              <span class="field-label">Grade Level:</span> <span class="field-value">${resource.grade_level}</span>
            </div>

            ${resource.instructions ? `
              <div class="instructions">
                <strong>Instructions:</strong><br>
                ${resource.instructions}
              </div>
            ` : ''}

            ${generateResourceSpecificContent(resource)}
          </div>
        </div>
      </body>
    </html>
  `;

  await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

  const pdf = await page.pdf({
    format: 'A4',
    printBackground: true,
    margin: {
      top: '20px',
      right: '20px',
      bottom: '20px',
      left: '20px'
    }
  });

  await browser.close();
  return pdf;
}
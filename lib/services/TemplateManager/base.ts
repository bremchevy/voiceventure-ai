import { Template, TemplateRenderOptions, TemplateSection, TemplateStyles } from './types';
import { mathWorksheetTemplate, scienceWorksheetTemplate, readingWorksheetTemplate, exitSlipTemplate } from './templates';

export class TemplateManager {
  private templates: Map<string, Template> = new Map();
  private defaultStyles: TemplateStyles = {
    fontFamily: 'Arial, sans-serif',
    fontSize: '14px',
    headerStyle: 'font-size: 24px; font-weight: bold;',
    bodyStyle: 'line-height: 1.6;',
    accentColor: '#007bff',
  };

  constructor(templates: Template[] = []) {
    // Register default templates
    this.registerTemplate(mathWorksheetTemplate);
    this.registerTemplate(scienceWorksheetTemplate);
    this.registerTemplate(readingWorksheetTemplate);
    this.registerTemplate(exitSlipTemplate);
    
    // Register any additional templates
    templates.forEach(template => this.registerTemplate(template));
  }

  registerTemplate(template: Template): void {
    if (this.templates.has(template.id)) {
      throw new Error(`Template with ID ${template.id} already exists`);
    }
    this.templates.set(template.id, template);
  }

  getTemplate(id: string): Template {
    const template = this.templates.get(id);
    if (!template) {
      throw new Error(`Template with ID ${id} not found`);
    }
    return template;
  }

  async renderTemplate(templateId: string, options: TemplateRenderOptions): Promise<string> {
    const template = this.getTemplate(templateId);
    const styles = { ...this.defaultStyles, ...template.styles, ...options.styles };
    
    // Generate HTML
    try {
      const html = this.generateHTML(template, styles, options.data);
      return html;
    } catch (error) {
      throw error;
    }
  }

  private generateHTML(
    template: Template,
    styles: TemplateStyles,
    data: any
  ): string {
    const styleSheet = this.generateStyleSheet(styles);
    const decorations = this.renderDecorations(data.decorations || []);
    const content = this.renderContent(template, data);

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>${styleSheet}</style>
        </head>
        <body>
          <div class="template-container">
            ${decorations}
            ${content}
          </div>
        </body>
      </html>
    `;
  }

  private generateStyleSheet(styles: TemplateStyles): string {
    return `
      .template-container {
        font-family: ${styles.fontFamily};
        font-size: ${styles.fontSize};
        max-width: 800px;
        margin: 0 auto;
        padding: 20px;
      }
      .decorations {
        display: flex;
        justify-content: center;
        gap: 10px;
        margin-bottom: 20px;
        font-size: 24px;
      }
      .decoration {
        display: inline-block;
        padding: 5px;
      }
      .header {
        text-align: center;
        margin-bottom: 20px;
      }
      .header h1 {
        ${styles.headerStyle}
        color: ${styles.accentColor};
        margin-bottom: 20px;
      }
      .student-info {
        display: flex;
        justify-content: space-between;
        margin-top: 10px;
        font-size: 18px;
        line-height: 2;
      }
      .instructions {
        margin-bottom: 30px;
      }
      .instructions h2 {
        color: ${styles.accentColor};
        font-size: 18px;
        margin-bottom: 10px;
      }
      .problems-container {
        ${styles.bodyStyle}
      }
      .problem {
        margin-bottom: 30px;
        padding: 15px;
        background-color: #f8f9fa;
        border-radius: 8px;
        font-size: 18px;
        line-height: 2;
      }
      .problem-number {
        background-color: ${styles.accentColor};
        color: white;
        width: 30px;
        height: 30px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        margin-right: 15px;
        font-size: 18px;
      }
      .problem-content {
        display: inline-block;
        font-size: 18px;
      }
      .problem-visual {
        margin: 15px 0;
        color: #666;
        font-size: 24px;
      }
      .picture-cue {
        display: inline-block;
        margin: 0 5px;
        padding: 5px;
        background-color: #f0f0f0;
        border-radius: 4px;
        font-size: 24px;
      }
      .kindergarten-passage {
        font-size: 24px;
        line-height: 2.5;
        margin: 30px 0;
      }
      .kindergarten-passage .line {
        display: flex;
        align-items: center;
        margin-bottom: 20px;
      }
      .kindergarten-options {
        display: flex;
        gap: 30px;
        margin-top: 15px;
        justify-content: center;
      }
      .kindergarten-option {
        display: flex;
        align-items: center;
        gap: 10px;
        font-size: 24px;
        padding: 10px 20px;
        border: 2px solid #ddd;
        border-radius: 8px;
        cursor: pointer;
      }
      .kindergarten-option:hover {
        background-color: #f8f9fa;
      }
      .answer-line {
        margin-top: 10px;
        border-bottom: 1px solid #ccc;
        padding: 5px 0;
      }
    }`;
  }

  private renderContent(template: Template, data: any): string {
    const isKindergarten = data.grade?.toLowerCase() === 'k' || data.grade?.toLowerCase() === 'kindergarten';

    const header = `
      <div class="header">
        <h1>${data.title || template.defaultTitle}</h1>
        <div class="student-info">
          <div>Name: _____________________</div>
          <div>Date: _____________________</div>
        </div>
      </div>
    `;

    if (isKindergarten) {
      const passage = data.passage.split('\n').map(line => {
        return `<div class="line">${line}</div>`;
      }).join('');

      const questions = data.questions.map((q: any, index: number) => {
        const options = q.options.map((opt: string) => {
          return `<div class="kindergarten-option">${opt}</div>`;
        }).join('');

        return `
          <div class="problem">
            <span class="problem-number">${index + 1}</span>
            <div class="problem-content">
              ${q.question}
              <div class="kindergarten-options">
                ${options}
              </div>
            </div>
          </div>
        `;
      }).join('');

      return `
        ${header}
        <div class="kindergarten-passage">
          ${passage}
        </div>
        <div class="problems-container">
          ${questions}
        </div>
      `;
    }

    // Regular content rendering for other grades
    const content = template.sections.map((section: TemplateSection) => {
      switch (section.type) {
        case 'instructions':
          return `
            <div class="instructions">
              <h2>${section.title}</h2>
              <p>${section.content}</p>
            </div>
          `;
        case 'problems':
          return `
            <div class="problems-container">
              ${data.questions.map((q: any, index: number) => `
                <div class="problem">
                  <span class="problem-number">${index + 1}</span>
                  <div class="problem-content">
                    ${q.question}
                    ${q.type !== 'true_false' ? '<div class="answer-line"></div>' : ''}
                    ${q.options ? `
                      <div class="options">
                        ${q.options.map((opt: string) => `
                          <div class="option">${opt}</div>
                        `).join('')}
                      </div>
                    ` : ''}
                  </div>
                </div>
              `).join('')}
            </div>
          `;
        default:
          return '';
      }
    }).join('');

    return `
      ${header}
      ${content}
    `;
  }
}
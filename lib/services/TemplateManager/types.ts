export interface TemplateStyles {
  fontFamily: string;
  fontSize: string;
  headerStyle: string;
  bodyStyle: string;
  accentColor: string;
}

export interface TemplateSection {
  id: string;
  type: 'header' | 'content' | 'questions' | 'vocabulary' | 'experiment' | 'assessment';
  title?: string;
  content: string;
}

export interface Template {
  id: string;
  name: string;
  description: string;
  subject: string;
  type: string;
  grade: number[];
  styles: TemplateStyles;
  sections: TemplateSection[];
  metadata?: Record<string, any>;
}

export interface TemplateRenderOptions {
  data: {
    title?: string;
    instructions?: string;
    problems?: Array<{
      question: string;
      visual?: string;
      steps?: string[];
    }>;
    decorations?: string[];
  };
  styles?: Partial<TemplateStyles>;
} 
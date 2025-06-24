import { NextResponse } from 'next/server';
import { MathContentGenerator, MathProblemOptions } from '@/lib/services/AIContentGenerator/math';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const options: MathProblemOptions = {
      grade: body.grade,
      difficulty: body.difficulty,
      topic: body.topic,
      includeSteps: body.includeSteps,
      includeVisuals: body.includeVisuals,
      numberOfProblems: body.numberOfProblems,
    };

    const generator = new MathContentGenerator();
    const result = await generator.generateMathContent(options);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error generating math content:', error);
    return NextResponse.json(
      { error: 'Failed to generate math content' },
      { status: 500 }
    );
  }
} 
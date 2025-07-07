import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { WorksheetEmailTemplate } from '@/emails/worksheet-template';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  try {
    console.log('Received share request');
    const body = await request.json();
    console.log('Request body:', body);
    
    const { recipients, worksheetData } = body;

    // Validate input
    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Recipients array is required' },
        { status: 400 }
      );
    }

    if (!worksheetData) {
      return NextResponse.json(
        { success: false, error: 'Worksheet data is required' },
        { status: 400 }
      );
    }

    // Validate email addresses
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const invalidEmails = recipients.filter(email => !emailRegex.test(email));
    if (invalidEmails.length > 0) {
      return NextResponse.json(
        { success: false, error: `Invalid email addresses: ${invalidEmails.join(', ')}` },
        { status: 400 }
      );
    }

    if (!process.env.RESEND_API_KEY) {
      console.error('RESEND_API_KEY is not configured');
      return NextResponse.json(
        { success: false, error: 'Email service is not configured' },
        { status: 500 }
      );
    }

    console.log('Using Resend API Key:', process.env.RESEND_API_KEY.substring(0, 8) + '...');

    // Get base URL from request if environment variable is not set
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || `${request.nextUrl.protocol}//${request.nextUrl.host}`;

    // Send emails one at a time to better track errors
    for (const recipient of recipients) {
      console.log('Attempting to send email to:', recipient);
      
      try {
        console.log('Sending email with config:', {
          from: 'onboarding@resend.dev',
          to: recipient,
          subject: `Shared Worksheet: ${worksheetData.title}`,
        });

        const emailResponse = await resend.emails.send({
          from: 'onboarding@resend.dev', // Use Resend's testing email until domain is verified
          to: recipient,
          subject: `Shared Worksheet: ${worksheetData.title}`,
          html: `
            <!DOCTYPE html>
            <html>
              <head>
                <style>
                  body { font-family: sans-serif; line-height: 1.5; color: #374151; }
                  .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                  .header { background-color: #4f46e5; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
                  .content { background-color: #ffffff; padding: 20px; border: 1px solid #e5e7eb; border-radius: 0 0 8px 8px; }
                  .button { display: inline-block; padding: 12px 20px; background-color: #4f46e5; color: white; text-decoration: none; border-radius: 6px; font-weight: 600; }
                  .meta { color: #6b7280; font-size: 14px; margin: 4px 0; }
                </style>
              </head>
              <body>
                <div class="container">
                  <div class="header">
                    <h1 style="margin:0">🎓 VoiceVenture AI</h1>
                    <p style="margin:8px 0 0">AI-Powered Educational Resources</p>
                  </div>
                  <div class="content">
                    <p>Hello!</p>
                    <p>Someone has shared an educational resource with you through VoiceVenture AI.</p>
                    
                    <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:20px;margin:24px 0">
                      <h2 style="margin:0 0 16px;color:#111827">${worksheetData.title}</h2>
                      <p class="meta"><strong>Type:</strong> ${worksheetData.type || 'worksheet'}</p>
                      <p class="meta"><strong>Subject:</strong> ${worksheetData.subject}</p>
                      <p class="meta"><strong>Grade Level:</strong> ${worksheetData.grade_level || worksheetData.gradeLevel || 'N/A'}</p>
                    </div>

                    <div style="text-align:center;margin:32px 0">
                      <a href="${baseUrl}/api/generate/pdf/download?data=${encodeURIComponent(JSON.stringify(worksheetData))}" class="button">
                        Download Worksheet (PDF)
                      </a>
                    </div>

                    <p style="color:#6b7280;font-size:14px;text-align:center">
                      This worksheet was created using AI technology to provide engaging and educational content 
                      tailored to the specified grade level and subject.
                    </p>
                  </div>
                </div>
              </body>
            </html>
          `,
        });
        
        console.log('Raw Resend API response:', JSON.stringify(emailResponse, null, 2));
        
        // Check for error in response
        if (emailResponse.error) {
          throw new Error(`Resend API error: ${emailResponse.error.message}`);
        }
        
        // Check for valid response structure
        if (!emailResponse?.data?.id) {
          throw new Error(`Invalid response from Resend: ${JSON.stringify(emailResponse)}`);
        }
        
        console.log(`Email sent successfully with ID: ${emailResponse.data.id}`);
      } catch (emailError) {
        console.error('Failed to send email to', recipient, ':', emailError);
        return NextResponse.json({
          success: false,
          error: `Failed to send email to ${recipient}`,
          details: emailError
        }, { status: 500 });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Successfully sent worksheet to ${recipients.length} recipient(s)`
    });

  } catch (error) {
    console.error('Email sharing error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to send emails' },
      { status: 500 }
    );
  }
} 
import { NextRequest, NextResponse } from 'next/server';
import { getWhatsAppTemplates, createWhatsAppTemplate } from '@/lib/whatsapp';

export async function GET(request: NextRequest) {
  try {
    const result = await getWhatsAppTemplates();
    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.error,
        templates: [],
      });
    }

    return NextResponse.json({
      success: true,
      templates: result.templates || [],
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, category, bodyText, sampleValues, headerText, language } = body;

    if (!name || !bodyText) {
      return NextResponse.json(
        { success: false, error: 'Template name and body text are required.' },
        { status: 400 }
      );
    }

    const result = await createWhatsAppTemplate({
      name,
      category: category === 'MARKETING' ? 'MARKETING' : 'UTILITY',
      bodyText,
      sampleValues: Array.isArray(sampleValues) ? sampleValues : [],
      headerText,
      language: language || 'en_US',
    });

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      templateId: result.templateId,
      status: result.status,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

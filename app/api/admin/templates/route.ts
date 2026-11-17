import { NextRequest, NextResponse } from 'next/server';
import { validateAdminAuth } from '@/lib/adminAuth';
import {
  getWhatsAppTemplates,
  createWhatsAppTemplate,
  deleteWhatsAppTemplate,
} from '@/lib/whatsapp';

export async function GET(request: NextRequest) {
  const auth = validateAdminAuth(request);
  if (!auth.authorized) return auth.response!;

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
  const auth = validateAdminAuth(request);
  if (!auth.authorized) return auth.response!;

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

export async function DELETE(request: NextRequest) {
  const auth = validateAdminAuth(request);
  if (!auth.authorized) return auth.response!;

  try {
    const { searchParams } = new URL(request.url);
    let name = searchParams.get('name');
    let hsmId = searchParams.get('hsmId') || searchParams.get('id') || undefined;

    if (!name) {
      try {
        const body = await request.json();
        name = body.name;
        hsmId = body.hsmId || body.id || hsmId;
      } catch {
        // body not json or empty
      }
    }

    if (!name) {
      return NextResponse.json(
        { success: false, error: 'Template name is required for deletion.' },
        { status: 400 }
      );
    }

    const result = await deleteWhatsAppTemplate({ name, hsmId });
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: `Template "${name}" deleted from Meta successfully.`,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}



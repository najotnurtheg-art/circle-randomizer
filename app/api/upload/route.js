export const dynamic = 'force-dynamic';
export const revalidate = 0;
// Edge runtime works best with @vercel/blob
export const runtime = 'edge';

import { NextResponse } from 'next/server';
import { put } from '@vercel/blob';

/**
 * Accepts multipart/form-data with one file field named "file".
 * Returns: { url }
 * Requires BLOB_READ_WRITE_TOKEN env (Vercel → Settings → Environment Variables).
 * Falls back with a helpful error if not configured.
 */

export async function POST(req) {
  try {
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (!token) {
      return NextResponse.json(
        { error: 'blob_not_configured', hint: 'Set BLOB_READ_WRITE_TOKEN in Vercel env. Meanwhile, paste a public image URL in the Items page.' },
        { status: 500 }
      );
    }

    const form = await req.formData();
    const file = form.get('file');
    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'no_file' }, { status: 400 });
    }

    const filename = `${Date.now()}_${file.name?.replace(/\s+/g, '_') || 'image'}`;
    const blob = await put(filename, file, {
      access: 'public',
      token,
    });

    return NextResponse.json({ url: blob.url }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: 'upload_failed', message: String(e?.message || e) }, { status: 500 });
  }
}

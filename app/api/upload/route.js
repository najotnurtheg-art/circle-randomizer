import { NextResponse } from 'next/server';
import { put } from '@vercel/blob';

export const runtime = 'edge';

export async function POST(req) {
  const form = await req.formData();
  const file = form.get('file');
  if (!file || typeof file.name !== 'string') {
    return NextResponse.json({ error: 'no file' }, { status: 400 });
  }
  const safeName = file.name.replace(/\s+/g, '_');
  const filename = `${Date.now()}-${safeName}`;
  const blob = await put(filename, file, {
    access: 'public',
    token: process.env.BLOB_READ_WRITE_TOKEN
  });
  return NextResponse.json({ url: blob.url });
}

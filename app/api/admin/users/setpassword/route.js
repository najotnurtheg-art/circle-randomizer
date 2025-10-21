// app/api/admin/users/setpassword/route.js
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import bcrypt from 'bcrypt';
import { requireAdmin } from '@/app/lib/auth';

export async function POST(req) {
  try {
    // Ensure admin rights
    requireAdmin();
  } catch {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { userId, newPassword } = body;

    if (!userId || !newPassword)
      return NextResponse.json({ error: 'missing data' }, { status: 400 });

    // Hash the new password
    const hash = await bcrypt.hash(newPassword, 10);

    // Update in DB
    const user = await prisma.user.update({
      where: { id: userId },
      data: { password: hash },
      select: { id: true, username: true, displayName: true },
    });

    return NextResponse.json({
      success: true,
      user,
      message: 'Password updated successfully.',
    });
  } catch (e) {
    console.error('Error setting password:', e);
    return NextResponse.json({ error: 'server error' }, { status: 500 });
  }
}

import { eq, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { getSession } from '@/lib/auth/session';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user from database
    const user = await db.query.users.findFirst({
      where: eq(users.email, session.email),
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const now = new Date();
    const lastAwarded = user.lastPointsAwardedAt;

    // Rate limit: only award once per 5 minutes (300000ms)
    if (lastAwarded && now.getTime() - lastAwarded.getTime() < 300000) {
      return NextResponse.json({ pointsAwarded: 0, reason: 'Rate limited' });
    }

    // Award 5 points and update last awarded time
    const [updated] = await db
      .update(users)
      .set({
        sevaPoints: sql`seva_points + 5`,
        lastPointsAwardedAt: now,
      })
      .where(eq(users.id, user.id))
      .returning();

    return NextResponse.json({
      pointsAwarded: 5,
      totalPoints: updated.sevaPoints,
    });
  } catch (error) {
    console.error('Error in heartbeat:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

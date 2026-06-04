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

    // Award 5 points for daily login
    const [updated] = await db
      .update(users)
      .set({
        sevaPoints: sql`seva_points + 5`,
      })
      .where(eq(users.id, user.id))
      .returning();

    return NextResponse.json({
      pointsAwarded: 5,
      totalPoints: updated.sevaPoints,
    });
  } catch (error) {
    console.error('Error in daily login:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

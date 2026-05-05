import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { page, rating_accuracy, rating_usability, rating_revisit, comment, type_code, compass_first } = body;

    if (!page) return NextResponse.json({ error: 'page required' }, { status: 400 });

    const ua = request.headers.get('user-agent') || '';
    const supabase = getSupabase();
    const { error } = await supabase.from('feedback').insert({
      page,
      rating_accuracy:  rating_accuracy  || null,
      rating_usability: rating_usability || null,
      rating_revisit:   rating_revisit   || null,
      comment:          comment?.trim()  || null,
      type_code:        type_code        || null,
      compass_first:    compass_first    || null,
      user_agent:       ua.slice(0, 200),
    });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}

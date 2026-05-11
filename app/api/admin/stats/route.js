import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

function checkAdminKey(request) {
  const key = request.headers.get('x-admin-key');
  return key === process.env.ADMIN_API_KEY;
}

export async function GET(request) {
  if (!checkAdminKey(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabase();
  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const [
    profilesTotal,
    profilesThisMonth,
    diagTotal,
    diagThisMonth,
    providersAll,
    mirrorTotal,
    mirrorPaid,
    inquiriesPending,
    storiesPending,
  ] = await Promise.all([
    supabase.from('profiles').select('id', { count: 'exact', head: true }),
    supabase.from('profiles').select('id', { count: 'exact', head: true }).gte('created_at', thisMonthStart),
    supabase.from('diagnosis_results').select('id', { count: 'exact', head: true }),
    supabase.from('diagnosis_results').select('id', { count: 'exact', head: true }).gte('created_at', thisMonthStart),
    supabase.from('providers').select('id, category, entity_type, created_at'),
    supabase.from('mirror_sessions').select('id', { count: 'exact', head: true }),
    supabase.from('mirror_sessions').select('id', { count: 'exact', head: true }).eq('paid', true),
    supabase.from('provider_inquiries').select('id', { count: 'exact', head: true }).neq('status', 'done'),
    supabase.from('stories').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
  ]);

  const providers = providersAll.data || [];
  const regular = providers.filter(p => p.entity_type !== 'affiliate');
  const affiliate = providers.filter(p => p.entity_type === 'affiliate');
  const providersThisMonth = providers.filter(p => p.created_at >= thisMonthStart).length;

  const byCategory = {};
  regular.forEach(p => {
    if (p.category) byCategory[p.category] = (byCategory[p.category] || 0) + 1;
  });

  return NextResponse.json({
    users: {
      total: profilesTotal.count ?? 0,
      thisMonth: profilesThisMonth.count ?? 0,
    },
    meScan: {
      total: diagTotal.count ?? 0,
      thisMonth: diagThisMonth.count ?? 0,
    },
    providers: {
      total: providers.length,
      thisMonth: providersThisMonth,
      regular: regular.length,
      affiliate: affiliate.length,
      byCategory,
    },
    mirror: {
      total: mirrorTotal.count ?? 0,
      paid: mirrorPaid.count ?? 0,
      revenue: (mirrorPaid.count ?? 0) * 500,
    },
    inquiriesPending: inquiriesPending.count ?? 0,
    storiesPending: storiesPending.count ?? 0,
  });
}

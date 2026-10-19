// GET/POST /api/provider/customer-labels → メンバータイプ・タグ・保存した絞り込み（でお要望 2026-10-19：hacomono差分 #7）
// POST は action で操作を分ける：type_add / type_rename / type_delete / tag_add / tag_delete / set / segment_add / segment_delete
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';
import { withAudit } from '@/lib/activity-log';
import { memberAuth } from '@/lib/provider-members';
import { providerCustomerIds } from '@/lib/broadcast';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });
const nameOf = v => String(v || '').trim().slice(0, 40);
const bad = (msg, status = 400) => Response.json({ error: msg }, { status });

export async function GET(request) {
  const a = await memberAuth(request);
  if (!a) return bad('Unauthorized', 401);
  const pid = a.provider.id;
  const [types, tags, labels, segments] = await Promise.all([
    supabase.from('provider_member_types').select('id, name, sort_order').eq('provider_id', pid).order('sort_order').order('created_at'),
    supabase.from('provider_customer_tags').select('id, name').eq('provider_id', pid).order('created_at'),
    supabase.from('provider_customer_labels').select('user_id, manual_id, member_type_id, tag_ids').eq('provider_id', pid).limit(20000),
    supabase.from('provider_customer_segments').select('id, name, filters').eq('provider_id', pid).order('created_at'),
  ]);
  return Response.json({ types: types.data || [], tags: tags.data || [], labels: labels.data || [], segments: segments.data || [] });
}

async function __POST(request) {
  const a = await memberAuth(request);
  if (!a) return bad('Unauthorized', 401);
  const pid = a.provider.id;
  const b = await request.json().catch(() => ({}));

  switch (b.action) {
    case 'type_add': {
      const name = nameOf(b.name); if (!name) return bad('タイプ名を入れてください');
      const { count } = await supabase.from('provider_member_types').select('id', { count: 'exact', head: true }).eq('provider_id', pid);
      if (count >= 30) return bad('メンバータイプは30個までです');
      const { data } = await supabase.from('provider_member_types').insert({ provider_id: pid, name, sort_order: count || 0 }).select().single();
      return Response.json(data);
    }
    case 'type_rename': {
      const name = nameOf(b.name); if (!name) return bad('タイプ名を入れてください');
      await supabase.from('provider_member_types').update({ name }).eq('id', b.id).eq('provider_id', pid);
      return Response.json({ ok: true });
    }
    case 'type_delete':
      await supabase.from('provider_member_types').delete().eq('id', b.id).eq('provider_id', pid);
      return Response.json({ ok: true });
    case 'tag_add': {
      const name = nameOf(b.name); if (!name) return bad('タグ名を入れてください');
      const { count } = await supabase.from('provider_customer_tags').select('id', { count: 'exact', head: true }).eq('provider_id', pid);
      if (count >= 100) return bad('タグは100個までです');
      const { data, error } = await supabase.from('provider_customer_tags').insert({ provider_id: pid, name }).select().single();
      if (error) return bad('同じ名前のタグがあります');
      return Response.json(data);
    }
    case 'tag_delete': {
      await supabase.from('provider_customer_tags').delete().eq('id', b.id).eq('provider_id', pid);
      const { data: rows } = await supabase.from('provider_customer_labels').select('id, tag_ids').eq('provider_id', pid).contains('tag_ids', [b.id]);
      for (const r of rows || []) await supabase.from('provider_customer_labels').update({ tag_ids: r.tag_ids.filter(t => t !== b.id) }).eq('id', r.id);
      return Response.json({ ok: true });
    }
    case 'set': {
      // タイプ・タグがこの店舗のものか、お客様がこの店舗のお客様かを確かめてから保存
      const [{ data: types }, { data: tags }] = await Promise.all([
        supabase.from('provider_member_types').select('id').eq('provider_id', pid),
        supabase.from('provider_customer_tags').select('id').eq('provider_id', pid),
      ]);
      const typeOk = new Set((types || []).map(t => t.id)); const tagOk = new Set((tags || []).map(t => t.id));
      const member_type_id = b.member_type_id && typeOk.has(b.member_type_id) ? b.member_type_id : null;
      const tag_ids = [...new Set(Array.isArray(b.tag_ids) ? b.tag_ids : [])].filter(t => tagOk.has(t));
      let key;
      if (b.manual_id) {
        const { data: m } = await supabase.from('provider_manual_customers').select('id').eq('id', b.manual_id).eq('provider_id', pid).maybeSingle();
        if (!m) return bad('お客様が見つかりません', 404);
        key = { manual_id: m.id };
      } else if (b.user_id) {
        const { data: prov } = await supabase.from('providers').select('id, slug').eq('id', pid).single();
        if (!(await providerCustomerIds(supabase, prov)).has(b.user_id)) return bad('お客様が見つかりません', 404);
        key = { user_id: b.user_id };
      } else return bad('お客様を指定してください');
      const col = key.user_id ? 'user_id' : 'manual_id';
      const { data: cur } = await supabase.from('provider_customer_labels').select('id').eq('provider_id', pid).eq(col, key[col]).maybeSingle();
      const row = { member_type_id, tag_ids, updated_at: new Date().toISOString() };
      if (cur) await supabase.from('provider_customer_labels').update(row).eq('id', cur.id);
      else await supabase.from('provider_customer_labels').insert({ provider_id: pid, ...key, ...row });
      return Response.json({ ok: true, member_type_id, tag_ids });
    }
    case 'segment_add': {
      const name = nameOf(b.name); if (!name) return bad('名前を入れてください');
      const filters = b.filters && typeof b.filters === 'object' ? b.filters : {};
      if (JSON.stringify(filters).length > 4000) return bad('条件が多すぎます');
      const { data } = await supabase.from('provider_customer_segments').insert({ provider_id: pid, name, filters }).select().single();
      return Response.json(data);
    }
    case 'segment_delete':
      await supabase.from('provider_customer_segments').delete().eq('id', b.id).eq('provider_id', pid);
      return Response.json({ ok: true });
    default:
      return bad('操作の種類が正しくありません');
  }
}
export const POST = withAudit(__POST);

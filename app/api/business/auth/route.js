// POST /api/business/auth
// 業務ツール用キー認証（BUSINESS_ACCESS_KEY）
// 運営管理画面のADMIN_API_KEYとは完全に別キー
export async function POST(request) {
  const { key } = await request.json().catch(() => ({}));
  const businessKey = process.env.BUSINESS_ACCESS_KEY;
  const adminKey = process.env.ADMIN_API_KEY;

  if (!key) return Response.json({ ok: false }, { status: 401 });

  // BUSINESS_ACCESS_KEYまたはADMIN_API_KEYのどちらでもOK（管理者は両方使える）
  if (key === businessKey || key === adminKey) {
    return Response.json({ ok: true });
  }
  return Response.json({ ok: false }, { status: 401 });
}

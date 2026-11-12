// 店舗のお客様の記録写真（姿勢分析・健診アドバイス）の保管と表示。
// 健診結果の写真は要配慮個人情報になりうるため、公開バケット（provider-photos）には置かない。
// 非公開バケット customer-records に保存し、DBには保存先のパスだけを持つ。
// 表示のたびに期限付きの署名URLを発行する（mirror-photos・contract-documents と同じ方式）。
// 2026-10-10：provider-photos が公開設定のまま健診写真を getPublicUrl で保存していたのを是正（実データ0件の段階で修正）。

export const CUSTOMER_RECORD_BUCKET = 'customer-records';
const SIGNED_URL_TTL_SECONDS = 3600;

export async function uploadCustomerRecordPhoto(supabase, path, buffer, contentType) {
  const { error } = await supabase.storage.from(CUSTOMER_RECORD_BUCKET).upload(path, buffer, { contentType, upsert: false });
  if (error) throw new Error(error.message);
  return path;
}

// photo_url（姿勢分析は side_photo_url も）に保存先パスが入っている行を、表示用の署名URLに差し替えて返す。
// http(s) で始まる値（旧方式の公開URL）はそのまま返す。
export async function withSignedPhotoUrls(supabase, rows) {
  if (!Array.isArray(rows) || rows.length === 0) return rows || [];
  const sign = async (path) => {
    if (!path || /^https?:\/\//.test(path)) return path || null;
    const { data } = await supabase.storage.from(CUSTOMER_RECORD_BUCKET).createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
    return data?.signedUrl || null;
  };
  return Promise.all(rows.map(async (r) => {
    if (!r) return r;
    const out = { ...r, photo_url: await sign(r.photo_url) };
    if ('side_photo_url' in r) out.side_photo_url = await sign(r.side_photo_url);
    return out;
  }));
}

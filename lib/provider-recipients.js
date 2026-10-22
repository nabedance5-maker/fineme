// 店舗あての通知メールの宛先（でお要望 2026-10-22：通知に使うメールアドレスを変えられ、複数登録できるように）。
// 「ログイン・通知先」タブで登録した通知先（providers.notify_emails）があればそこへ、無ければログイン用のメールへ送る。
export function providerRecipients(provider) {
  const list = (provider?.notify_emails || []).filter(Boolean);
  if (list.length) return list;
  return provider?.email ? [provider.email] : [];
}

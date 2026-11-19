import Link from 'next/link';
import s from './encompass.module.css';
import { EXERCISES } from '@/lib/encompass/exercises';

export default function EncompassTop() {
  return (
    <main className={s.main}>
      <h1 className={s.h1}>ENCOMPASS のメニューを、動画で作って、そのまま見せる。</h1>
      <p className={s.lead}>
        種目を選ぶだけでメニューができます。時間・部位・年齢・体重などを入れれば、メニューの案も出します。
        できたメニューはタブレットに出しっぱなしにでき、タイマーで次の種目へ自動で進みます。
      </p>

      <div className={s.bigButtons}>
        <Link href="/encompass/suggest" className={`${s.bigButton} ${s.bigButtonPrimary}`}>
          <strong>条件からメニューを作る</strong>
          <span>時間・部位・年齢・身長・体重を入れると、案を出します</span>
        </Link>
        <Link href="/encompass/builder" className={s.bigButton}>
          <strong>種目を選んでメニューを作る</strong>
          <span>動画の画像を見ながら、押して並べるだけ（{EXERCISES.length}種目）</span>
        </Link>
        <Link href="/encompass/saved" className={s.bigButton}>
          <strong>保存したメニューを開く</strong>
          <span>この端末に保存したメニューの一覧</span>
        </Link>
        <Link href="/encompass/store" className={s.bigButton}>
          <strong>お店の方はこちら</strong>
          <span>お店のメニュー・お客様ごとのメニューと記録・ジムのタブレット用のリンク（ログイン）</span>
        </Link>
      </div>

      <p className={s.safety}>
        ENCOMPASS は業務用の機械で、トレーナーの指導のもとで使う前提です。最初は低いレベル（傾斜）から始めてください。
        胸の痛み・めまい・息切れなどが出たら、すぐに止めてください。表示するレベルや負荷は目安で、最後はトレーナーが決めます。
      </p>
    </main>
  );
}

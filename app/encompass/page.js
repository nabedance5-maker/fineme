import Link from 'next/link';
import s from './encompass.module.css';
import { EXERCISES } from '@/lib/encompass/exercises';

export default function EncompassTop() {
  return (
    <main className={s.main}>
      <h1 className={s.h1}>ENCOMPASS のメニューを作って、見ながらやる。</h1>
      <p className={s.lead}>
        動画を見ながら、メニューを作れます。はじめると、回数を声で数えて、次の種目へ自動で進みます。
      </p>

      <div className={s.bigButtons}>
        <Link href="/encompass/suggest" className={`${s.bigButton} ${s.bigButtonPrimary}`}>
          <strong>おまかせで作る</strong>
          <span>時間や目的、年齢などを選ぶと、メニューを作ります</span>
        </Link>
        <Link href="/encompass/builder" className={s.bigButton}>
          <strong>自分で選んで作る</strong>
          <span>写真を見ながら、押して並べるだけ（{EXERCISES.length}種目）</span>
        </Link>
        <Link href="/encompass/saved" className={s.bigButton}>
          <strong>保存したメニュー</strong>
          <span>このタブレットに保存したもの</span>
        </Link>
        <Link href="/encompass/store" className={s.bigButton}>
          <strong>お店の方はこちら</strong>
          <span>お店のメニュー・お客様ごとのメニュー（ログインが必要）</span>
        </Link>
      </div>

      <p className={s.safety}>
        トレーナーと一緒に使ってください。最初は低いレベルから。
        胸が痛い・めまい・息が苦しい時は、すぐにやめてください。レベルは目安で、最後はトレーナーが決めます。
      </p>
    </main>
  );
}

'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

async function authenticate(formData) {
  'use server'
  const password = formData.get('password')
  if (password === process.env.PREVIEW_PASSWORD) {
    const cookieStore = await cookies()
    cookieStore.set('preview_nxtdoor', process.env.PREVIEW_PASSWORD, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    })
    redirect('/articles/gym-nxtdoor')
  }
  redirect('/articles/gym-nxtdoor/login?error=1')
}

export default async function LoginPage({ searchParams }) {
  const params = await searchParams
  const error = params?.error === '1'

  return (
    <>
      <style>{`
        .preview-login {
          min-height: 100vh;
          background: #0a0f1e;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'Noto Sans JP', ui-sans-serif, system-ui, sans-serif;
        }
        .preview-login__card {
          width: min(400px, 90vw);
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(201,168,76,0.25);
          border-radius: 16px;
          padding: 48px 40px;
          text-align: center;
        }
        .preview-login__label {
          display: inline-block;
          font-size: 11px;
          letter-spacing: 0.15em;
          color: #c9a84c;
          text-transform: uppercase;
          margin-bottom: 20px;
        }
        .preview-login__title {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: clamp(20px, 4vw, 24px);
          color: #faf8f3;
          margin: 0 0 8px;
        }
        .preview-login__sub {
          font-size: 13px;
          color: rgba(232,228,220,0.5);
          margin: 0 0 36px;
        }
        .preview-login__input {
          width: 100%;
          padding: 14px 18px;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(201,168,76,0.3);
          border-radius: 8px;
          color: #faf8f3;
          font-size: 15px;
          font-family: inherit;
          outline: none;
          box-sizing: border-box;
          margin-bottom: 16px;
          transition: border-color 0.2s;
        }
        .preview-login__input:focus {
          border-color: #c9a84c;
        }
        .preview-login__btn {
          width: 100%;
          padding: 14px;
          background: #c9a84c;
          color: #0a0f1e;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 700;
          font-family: inherit;
          letter-spacing: 0.05em;
          cursor: pointer;
          transition: opacity 0.2s;
        }
        .preview-login__btn:hover { opacity: 0.85; }
        .preview-login__error {
          margin-top: 16px;
          font-size: 13px;
          color: #e57373;
        }
      `}</style>
      <div className="preview-login">
        <div className="preview-login__card">
          <span className="preview-login__label">Preview</span>
          <h1 className="preview-login__title">GYM NXT DOOR 取材記事</h1>
          <p className="preview-login__sub">パスワードを入力してください</p>
          <form action={authenticate}>
            <input
              className="preview-login__input"
              type="password"
              name="password"
              placeholder="パスワード"
              autoFocus
              required
            />
            <button className="preview-login__btn" type="submit">
              閲覧する
            </button>
          </form>
          {error && (
            <p className="preview-login__error">パスワードが正しくありません</p>
          )}
        </div>
      </div>
    </>
  )
}

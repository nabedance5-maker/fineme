Fineme 印象アップ診断 AI チャット (MVP)

セットアップ
1. このディレクトリは Next.js アプリの pages 構成を仮定しています。すでに Next.js プロジェクトであれば、`pages/diagnosis` と `pages/api/diagnosis.ts` を配置してください。
2. 環境変数をセット:
   - `OPENAI_API_KEY` (必須)
   - `OPENAI_MODEL` (任意、デフォルト: gpt-4o)

使い方
- ブラウザで `/diagnosis` を開き、チャットに答えてください。最後にサーバーへ POST され、OpenAI からの JSON を解析して結果を表示します。

注意点
- この実装は MVP であり、OpenAI の応答は厳格な JSON を返すようプロンプトで指示していますが、実運用ではパース耐性やリトライ、ユーザーの入力バリデーションなどを強化してください。

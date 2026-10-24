#!/usr/bin/env bash
# ローカルでの本番ビルド（npm run build:safe）。~/Fineme は複数のセッション・自律エージェントが共有しているため、
# 同時に next build を走らせると .next を壊し合い、メモリ不足で極端に遅くなる（2026-10-24 でお指摘：
# 「デプロイやビルドが24時間たっても実行中のまま」）。そこで:
#   1. ロック（flock）で、ビルドはマシン全体で1本ずつにする。前のビルドを待つのは最大20分。
#   2. ビルド自体も最大15分で打ち切る（固まっても永遠に実行中にならない）。
# 「pgrep で他のビルドが終わるまで待つ」ループは使わない（自分自身のコマンドにも一致して永遠に待つ事故があった）。
set -u
cd "$(dirname "$0")/.."
LOCK=/tmp/fineme-next-build.lock
WAIT_SEC=${BUILD_LOCK_WAIT:-1200}
BUILD_SEC=${BUILD_TIMEOUT:-900}
LOG=${BUILD_LOG:-/tmp/fineme-build-$$.log}

exec 9>"$LOCK"
if ! flock -w "$WAIT_SEC" 9; then
  echo "BUILD SKIPPED: 他のビルドが ${WAIT_SEC} 秒たっても終わりませんでした（ロック: $LOCK）" >&2
  exit 75
fi
echo "build start $(date '+%H:%M:%S') log=$LOG"
timeout --kill-after=30 "$BUILD_SEC" npx next build >"$LOG" 2>&1
rc=$?
if [ $rc -eq 124 ] || [ $rc -eq 137 ]; then
  echo "BUILD TIMEOUT: ${BUILD_SEC} 秒で打ち切りました（$LOG）" >&2
elif [ $rc -ne 0 ]; then
  echo "BUILD FAILED (exit $rc)。エラー箇所:" >&2
  grep -nE "Failed to compile|Error:|Type error|Module not found" "$LOG" | head -20 >&2
else
  echo "BUILD OK $(date '+%H:%M:%S')"
fi
exit $rc

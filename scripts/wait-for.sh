#!/usr/bin/env bash
# 条件が満たされるまで待つ（上限時間つき）。使い方:
#   bash scripts/wait-for.sh <最大秒数> <間隔秒> -- <条件コマンド...>
#   例) bash scripts/wait-for.sh 900 15 -- sh -c 'curl -s --max-time 10 https://www.fineme.me/ | grep -q 新しい文言'
# 条件コマンドが成功（exit 0）したら 0、上限を過ぎたら 124 で終わる。
# 2026-10-24：上限の無い until/while ループが、条件が永遠に満たされず9日以上「実行中」のまま残っていたため、
# 待つ処理は必ずこれを使う（または timeout を付ける）。
set -u
max=${1:?最大秒数}; every=${2:?間隔秒}; shift 2
[ "${1:-}" = "--" ] && shift
end=$(( $(date +%s) + max ))
while :; do
  if "$@"; then exit 0; fi
  [ "$(date +%s)" -ge "$end" ] && { echo "WAIT TIMEOUT: ${max} 秒たっても条件を満たしませんでした: $*" >&2; exit 124; }
  sleep "$every"
done

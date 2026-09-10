#!/usr/bin/env bash
# 提交规范检查（R6，2026-09-10 起）
# 1) 提交信息格式：<类型>: <中文概要> + 正文无序列表 + 记录:/AI协作: 尾注
# 2) test: 提交仅含测试代码与测试脚手架
# 3) PR 不得携带 docs/record/daily/** 变更
# 合并提交与回滚提交豁免正文检查。
set -uo pipefail
BASE="${1:-origin/main}"
FAIL=0

echo "== 检查范围：$BASE..HEAD =="
mapfile -t COMMITS < <(git rev-list --no-merges "$BASE..HEAD" 2>/dev/null || true)
if [ "${#COMMITS[@]}" -eq 0 ]; then
  echo "无待检查提交"; exit 0
fi

TYPE_RE='^(feat|fix|test|chore|docs|refactor): .+'
for sha in "${COMMITS[@]}"; do
  subject="$(git log -1 --format=%s "$sha")"
  body="$(git log -1 --format=%b "$sha")"
  if ! [[ "$subject" =~ $TYPE_RE ]]; then
    echo "❌ $sha 提交标题不符合 '<类型>: <中文概要>'：$subject"; FAIL=1
  fi
  if ! grep -qE '^-[[:space:]]' <<<"$body"; then
    echo "❌ $sha 提交正文缺少以 '- ' 开头的条目：$subject"; FAIL=1
  fi
  if ! grep -q '^记录:' <<<"$body"; then
    echo "⚠️  $sha 缺少 '记录:' 尾注：$subject"
  fi
  if ! grep -q '^AI协作:' <<<"$body"; then
    echo "⚠️  $sha 缺少 'AI协作:' 尾注（若为纯人工提交可忽略）：$subject"
  fi
  # test: 纯度：只允许测试代码与测试脚手架
  if [[ "$subject" == test:* ]]; then
    while IFS= read -r f; do
      [ -z "$f" ] && continue
      if ! [[ "$f" =~ (^|/)(__tests__|tests?|e2e)(/|$) ]] &&
         ! [[ "$f" =~ \.(spec|test)\.[a-zA-Z]+$ ]] &&
         ! [[ "$f" =~ (^|/)src/test/ ]] &&
         ! [[ "$f" =~ (vitest|playwright|jest)\.config\. ]] &&
         ! [[ "$f" =~ (^|/)test/(setup|resources)/ ]]; then
        echo "❌ $sha 为 test: 提交但改动了非测试文件：$f"; FAIL=1
      fi
    done < <(git show --pretty=format: --name-only "$sha")
  fi
done

# PR 不得携带 docs/record/daily/**
DAILY="$(git diff --name-only "$BASE...HEAD" 2>/dev/null | grep '^docs/record/daily/' || true)"
if [ -n "$DAILY" ]; then
  echo "❌ PR 携带 docs/record/daily/** 变更（规则：携带即打回）："; echo "$DAILY"; FAIL=1
fi

if [ "$FAIL" -ne 0 ]; then
  echo "提交规范检查未通过"; exit 1
fi
echo "✅ 提交规范检查通过（共 ${#COMMITS[@]} 个提交）"

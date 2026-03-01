#!/bin/bash
# 배포 스크립트: CSS 캐시 버전 자동 갱신 후 push

set -e

# 현재 유닉스 타임스탬프를 버전으로 사용
VERSION=$(date +%s)

# 모든 HTML 파일의 ?v=N 을 ?v=타임스탬프로 교체
find . -name "*.html" -not -path "./.git/*" -exec sed -i '' "s/?v=[0-9]*/?v=$VERSION/g" {} +

echo "✅ CSS 버전 → v=$VERSION"

# 변경 사항 커밋 & 푸시
git add -A

# 커밋 메시지: 인자로 받거나 기본값 사용
MESSAGE="${1:-deploy: update}"
git commit -m "$MESSAGE" 2>/dev/null || echo "⚠️  커밋할 변경 사항 없음"

git push

echo "🚀 배포 완료!"

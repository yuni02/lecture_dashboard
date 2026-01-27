#!/bin/sh
# 볼륨 마운트된 uploads 디렉토리 생성 및 권한 설정
mkdir -p /app/public/uploads/resumes
chown -R 1001:1001 /app/public/uploads

# nextjs 유저로 서버 실행
exec su-exec nextjs node server.js

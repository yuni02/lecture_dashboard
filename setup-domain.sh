#!/bin/bash

# 도메인 설정 스크립트
# 사용법: ./setup-domain.sh yourdomain.com

set -e

DOMAIN=$1

if [ -z "$DOMAIN" ]; then
    echo "사용법: ./setup-domain.sh yourdomain.com"
    exit 1
fi

echo "=========================================="
echo "도메인 설정 스크립트"
echo "도메인: $DOMAIN"
echo "=========================================="

# 1. Nginx 설치 확인
if ! command -v nginx &> /dev/null; then
    echo "📦 Nginx 설치 중..."
    sudo apt-get update
    sudo apt-get install -y nginx
else
    echo "✅ Nginx가 이미 설치되어 있습니다."
fi

# 2. Certbot 설치 (Let's Encrypt SSL)
if ! command -v certbot &> /dev/null; then
    echo "📦 Certbot 설치 중..."
    sudo apt-get update
    sudo apt-get install -y certbot python3-certbot-nginx
else
    echo "✅ Certbot이 이미 설치되어 있습니다."
fi

# 3. Nginx 설정 파일 복사 (임시 HTTP 설정)
echo "📝 Nginx 초기 설정 중..."
sudo tee /etc/nginx/sites-available/lecture_dashboard > /dev/null <<EOF
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

# 4. Nginx 설정 활성화
if [ ! -L /etc/nginx/sites-enabled/lecture_dashboard ]; then
    sudo ln -s /etc/nginx/sites-available/lecture_dashboard /etc/nginx/sites-enabled/
fi

# 5. 기본 사이트 비활성화 (선택사항)
if [ -L /etc/nginx/sites-enabled/default ]; then
    echo "🗑️  기본 Nginx 사이트 비활성화..."
    sudo rm /etc/nginx/sites-enabled/default
fi

# 6. Nginx 설정 테스트
echo "🧪 Nginx 설정 테스트 중..."
sudo nginx -t

# 7. Nginx 재시작
echo "🔄 Nginx 재시작 중..."
sudo systemctl restart nginx
sudo systemctl enable nginx

# 8. SSL 인증서 발급
echo "🔐 SSL 인증서 발급 중..."
echo "이메일 주소를 입력하고, 약관에 동의해주세요."

sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN

# 9. SSL 자동 갱신 설정
echo "⏰ SSL 자동 갱신 설정 중..."
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer

# 10. 방화벽 설정 (UFW 사용 시)
if command -v ufw &> /dev/null; then
    echo "🔥 방화벽 설정 중..."
    sudo ufw allow 'Nginx Full'
    sudo ufw delete allow 'Nginx HTTP'
fi

echo ""
echo "=========================================="
echo "✅ 도메인 설정 완료!"
echo "=========================================="
echo ""
echo "🌐 사이트 URL: https://$DOMAIN"
echo "📊 Nginx 상태 확인: sudo systemctl status nginx"
echo "📝 Nginx 로그: sudo tail -f /var/log/nginx/lecture_dashboard_error.log"
echo "🔐 SSL 인증서 갱신 테스트: sudo certbot renew --dry-run"
echo ""
echo "주의사항:"
echo "1. DNS A 레코드가 이 서버의 IP를 가리키고 있는지 확인하세요"
echo "2. Docker 컨테이너가 3000번 포트에서 실행 중인지 확인하세요"
echo "3. SSL 인증서는 90일마다 자동 갱신됩니다"
echo ""

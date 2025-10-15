"""
Configuration Loader for Lecture Dashboard
환경별 설정 파일을 로드하는 모듈
"""
import os
from typing import Optional
from pathlib import Path


class Config:
    """환경 설정 클래스"""

    def __init__(self):
        # 프로젝트 루트 경로
        self.project_root = Path(__file__).parent.parent

        # 환경 변수에서 ENVIRONMENT 가져오기 (기본값: local)
        self.environment = os.getenv('ENVIRONMENT', 'local')

        # 설정 로드
        self._load_config()

    def _load_config(self):
        """환경별 설정 파일 로드"""
        # 환경별 .env 파일 경로
        env_file = self.project_root / f'.env.{self.environment}'

        # .env.{environment} 파일이 없으면 .env.local 시도
        if not env_file.exists():
            env_file = self.project_root / '.env.local'

        # .env.local도 없으면 .env 시도
        if not env_file.exists():
            env_file = self.project_root / '.env'

        # 파일이 존재하면 로드
        if env_file.exists():
            self._load_env_file(env_file)
        else:
            print(f"Warning: No environment file found. Using default values.")

    def _load_env_file(self, file_path: Path):
        """환경 파일 로드"""
        with open(file_path, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                # 빈 줄이나 주석 무시
                if not line or line.startswith('#'):
                    continue

                # KEY=VALUE 형식 파싱
                if '=' in line:
                    key, value = line.split('=', 1)
                    key = key.strip()
                    value = value.strip()
                    # 환경 변수에 설정 (기존 값이 없을 때만)
                    if key not in os.environ:
                        os.environ[key] = value

    @property
    def mysql_host(self) -> str:
        """MySQL 호스트"""
        return os.getenv('MYSQL_HOST', 'localhost')

    @property
    def mysql_port(self) -> int:
        """MySQL 포트"""
        return int(os.getenv('MYSQL_PORT', '3306'))

    @property
    def mysql_user(self) -> str:
        """MySQL 사용자"""
        return os.getenv('MYSQL_USER', 'root')

    @property
    def mysql_password(self) -> str:
        """MySQL 비밀번호"""
        return os.getenv('MYSQL_PASSWORD', '')

    @property
    def mysql_database(self) -> str:
        """MySQL 데이터베이스"""
        return os.getenv('MYSQL_DATABASE', 'crawler')


# 싱글톤 인스턴스
config = Config()

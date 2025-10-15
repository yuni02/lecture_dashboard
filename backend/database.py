"""
Database connection and dependency management
"""
import pymysql
from typing import Generator
from config import config


def get_db() -> Generator:
    """
    데이터베이스 연결 의존성
    - 요청마다 DB 연결을 생성하고 자동으로 정리
    - FastAPI의 의존성 주입으로 사용
    """
    conn = pymysql.connect(
        host=config.mysql_host,
        port=config.mysql_port,
        user=config.mysql_user,
        password=config.mysql_password,
        database=config.mysql_database,
        charset='utf8mb4',
        cursorclass=pymysql.cursors.DictCursor
    )
    try:
        yield conn
    finally:
        conn.close()

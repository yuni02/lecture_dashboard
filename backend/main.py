"""
FastCampus Dashboard - FastAPI Backend
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os
from datetime import datetime
from routers import courses, stats

app = FastAPI(title="FastCampus Dashboard API")

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 라우터 등록
app.include_router(courses.router)
app.include_router(stats.router)

@app.get("/")
async def root():
    """루트 경로 - 프론트엔드 HTML 반환"""
    frontend_path = os.path.join(os.path.dirname(__file__), '../frontend/index.html')
    return FileResponse(frontend_path)

@app.get("/api/health")
async def health_check():
    """헬스 체크"""
    return {"status": "ok", "timestamp": datetime.now().isoformat()}

# Static files (CSS, JS)
app.mount("/static", StaticFiles(directory=os.path.join(os.path.dirname(__file__), '../frontend')), name="static")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)

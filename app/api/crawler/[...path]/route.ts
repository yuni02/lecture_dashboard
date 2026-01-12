import { NextRequest, NextResponse } from 'next/server';

const CRAWLER_API_URL = process.env.CRAWLER_API_URL || 'http://localhost:8000';

async function proxyRequest(request: NextRequest, path: string[]) {
  // path가 ['api', 'spiders'] 형태로 들어오므로 그대로 사용
  const targetPath = `/${path.join('/')}`;
  const targetUrl = `${CRAWLER_API_URL}${targetPath}`;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  const fetchOptions: RequestInit = {
    method: request.method,
    headers,
  };

  // POST, PUT, PATCH 요청의 경우 body 전달
  if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
    try {
      const body = await request.json();
      fetchOptions.body = JSON.stringify(body);
    } catch {
      // body가 없는 경우 무시
    }
  }

  try {
    const response = await fetch(targetUrl, fetchOptions);
    const data = await response.json();

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Crawler API proxy error:', error);
    return NextResponse.json(
      { error: 'Crawler API 연결 실패', detail: String(error) },
      { status: 503 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return proxyRequest(request, path);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return proxyRequest(request, path);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return proxyRequest(request, path);
}

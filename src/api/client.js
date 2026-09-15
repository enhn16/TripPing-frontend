// src/api/client.js
// 백엔드 공통 응답 포맷( {status, success, message, data} )을 다루는 fetch 공용 유틸.
// 화면별 api.js 파일들이 이걸 가져다 씀.
import { getAuthToken } from '../components/auth';

const BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '');

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function request(path, options = {}) {
  // 1. localStorage에서 저장된 JWT 토큰 조회
  const token = getAuthToken();

  // 2. 기본 헤더 구성 및 토큰 존재 시 Authorization 헤더 추가
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let res;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers,
    });
  } catch {
    // 네트워크 자체가 실패한 경우 (서버 꺼짐, CORS 등)
    throw new ApiError(
      `서버에 연결할 수 없습니다. VITE_API_BASE_URL(${BASE_URL || '(비어있음)'})이 맞는지 확인해주세요.`,
      0
    );
  }

  let json = null;
  try {
    json = await res.json();
  } catch {
    // 본문이 없는 응답(204 등)은 무시
  }

  // 공통 응답 포맷( {status, success, message, data} )인 엔드포인트
  if (json && typeof json === 'object' && 'success' in json) {
    if (!res.ok || !json.success) {
      throw new ApiError(json.message || `요청에 실패했습니다. (${res.status})`, json.status ?? res.status);
    }
    return json.data;
  }

  // 공통 포맷이 아닌 엔드포인트(GET /api/test처럼 문자열만 반환 등)
  if (!res.ok) {
    throw new ApiError(`요청에 실패했습니다. (${res.status})`, res.status);
  }
  return json;
}

export function apiGet(path) {
  return request(path);
}

export function apiPost(path, body) {
  return request(path, { method: 'POST', body: JSON.stringify(body) });
}
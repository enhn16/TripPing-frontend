// src/components/auth.js
// 카카오 로그인 (인가 코드 방식).
// 카카오 개발자 콘솔에서 Client Secret이 켜져 있어서, 인가 코드 -> 액세스 토큰 교환은
// 백엔드가 담당합니다. 프론트는 "카카오 로그인 페이지로 보내기"와
// "리다이렉트로 돌아왔을 때 인가 코드(code)를 받아 백엔드로 전달하기"만 맡습니다.
//
// 흐름:
//   1) startKakaoLogin() -> Kakao.Auth.authorize()로 카카오 로그인 페이지로 이동
//   2) 사용자가 로그인하면 카카오가 redirectUri(=/select)로 ?code=... 를 붙여 되돌려보냄
//   3) /select 페이지가 마운트되면서 handleKakaoRedirect()를 호출 -> code를 꺼내서
//      loginWithKakao(code)로 POST /api/auth/kakao 호출 -> 세션 저장 -> URL의 ?code= 제거
import { apiPost } from '../api/client';

const TOKEN_KEY = 'tripping_auth_token';
const USER_ID_KEY = 'tripping_user_id';
const USER_NAME_KEY = 'tripping_user_name';

// 로그인용 JavaScript 키. 지도(dapi.kakao.com)에서 쓰는 것과 같은 앱의 키를 그대로 재사용.
const KAKAO_JS_KEY = import.meta.env.VITE_KAKAO_MAP_KEY;

// 카카오 개발자 콘솔 > 카카오 로그인 > Redirect URI에 등록한 값과 정확히 일치해야 함.
// (현재 등록값: http://localhost:5173/select) 배포 환경이 늘어나면 그 환경의 URI도
// 콘솔에 추가로 등록해야 하고, 이 값은 window.location.origin 기준으로 자동 계산됨.
const KAKAO_REDIRECT_URI = `${window.location.origin}/select`;

// TODO(백엔드 연동 테스트용): 카카오 로그인 SDK가 아직 없어서 실제 로그인을 못 해보는 동안,
// 보관함 등 회원 전용 API를 미리 테스트할 수 있게 만든 개발용 스위치.
// .env에 VITE_DEV_FORCE_LOGIN=true 를 넣으면 항상 로그인된 것처럼 취급하고,
// 실제 로그인 세션이 없으면 아래 TEMP_DEV_USER_ID를 userId로 사용함.
// 카카오 로그인이 실제로 붙으면 이 스위치는 꺼두거나(.env에서 제거) 통째로 지우면 됨.
const DEV_FORCE_LOGIN = import.meta.env.DEV && import.meta.env.VITE_DEV_FORCE_LOGIN === 'true';
const TEMP_DEV_USER_ID = 'dev-test-user-1';

// 카카오 로그인 JS SDK를 동적으로 로드하고 Kakao.init()까지 마친 뒤 window.Kakao를 돌려줌.
// (지도 SDK 로더인 kakaoMap.js의 loadKakaoMapScript()와 같은 패턴, 스크립트만 다름)
function loadKakaoSdk() {
  return new Promise((resolve, reject) => {
    if (window.Kakao && window.Kakao.isInitialized()) {
      resolve(window.Kakao);
      return;
    }
    if (window.Kakao) {
      window.Kakao.init(KAKAO_JS_KEY);
      resolve(window.Kakao);
      return;
    }

    const existingScript = document.getElementById('kakao-login-sdk');
    if (existingScript) {
      existingScript.addEventListener('load', () => {
        window.Kakao.init(KAKAO_JS_KEY);
        resolve(window.Kakao);
      });
      existingScript.addEventListener('error', reject);
      return;
    }

    const script = document.createElement('script');
    script.id = 'kakao-login-sdk';
    // 버전은 카카오 다운로드 페이지(https://developers.kakao.com/docs/ko/javascript/download) 기준 최신(2.8.3).
    // TODO: integrity 속성은 그 페이지에서 2.8.3의 정확한 값을 복사해 아래에 넣어주세요.
    // (여기서 값을 임의로 채우면 SRI 검증 실패로 스크립트 로딩 자체가 막히니 비워두는 게 채워 넣는 것보다 안전합니다.)
    script.src = 'https://t1.kakaocdn.net/kakao_js_sdk/2.8.3/kakao.min.js';
    script.crossOrigin = 'anonymous';
    script.async = true;
    script.onload = () => {
      window.Kakao.init(KAKAO_JS_KEY);
      resolve(window.Kakao);
    };
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

// 로그인 버튼 클릭 시 호출. 카카오 로그인 페이지로 이동시키고(전체 페이지 리다이렉트),
// 로그인이 끝나면 카카오가 KAKAO_REDIRECT_URI로 ?code=...를 붙여 돌려보냄.
export async function startKakaoLogin() {
  try {
    if (!KAKAO_JS_KEY) throw new Error('로그인을 준비 중이에요. 잠시 후 다시 시도해주세요.');
    const Kakao = await loadKakaoSdk();
    Kakao.Auth.authorize({ redirectUri: KAKAO_REDIRECT_URI });
  } catch (err) {
    console.error('Kakao login failed:', err);
    alert('카카오 로그인을 시작하지 못했어요. 잠시 후 다시 시도해주세요.');
  }
}

// 리다이렉트로 돌아온 페이지(/select)에서 마운트 시 호출.
// URL에 ?code=가 있으면 백엔드로 넘겨 로그인 처리하고 true를,
// 그냥 방문한 거면(코드 없음) 아무 것도 안 하고 false를 반환.
// 카카오가 에러를 실어 보낸 경우(사용자가 로그인 취소 등)는 에러를 던짐.
let isHandlingRedirect = false;

export async function handleKakaoRedirect() {
  const params = new URLSearchParams(window.location.search);
  const error = params.get('error');
  const code = params.get('code');

  if (!error && !code) return false;

  // StrictMode로 인한 2중 호출 방지
  if (isHandlingRedirect) return false;
  isHandlingRedirect = true;

  try {
    if (error) {
      throw new Error(params.get('error_description') || '카카오 로그인이 취소되었습니다.');
    }
    await loginWithKakao(code);
    return true;
  } finally {
    // 새로고침 시 code가 재사용되지 않도록(인가 코드는 1회용) URL에서 쿼리 제거
    const url = new URL(window.location.href);
    ['code', 'state', 'error', 'error_description'].forEach((key) => url.searchParams.delete(key));
    window.history.replaceState({}, '', url.pathname + url.search + url.hash);
  }
}

// POST /api/auth/kakao - 카카오 인가 코드로 TripPing 로그인/회원가입 (토큰 교환은 백엔드가 처리)
export async function loginWithKakao(kakaoAuthorizationCode) {
  const data = await apiPost('/api/auth/kakao', { code: kakaoAuthorizationCode });
  setSession({ userId: data.userId, token: data.accessToken, nickname: data.nickname });
  return data;
}

// 로그인 성공 시 세션 저장
function setSession({ userId, token, nickname }) {
  if (userId != null) localStorage.setItem(USER_ID_KEY, String(userId));
  if (token) localStorage.setItem(TOKEN_KEY, token);
  if (nickname) localStorage.setItem(USER_NAME_KEY, nickname);
}

export function logout() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_ID_KEY);
  localStorage.removeItem(USER_NAME_KEY);
  // TODO: 카카오 로그아웃 API(Kakao.Auth.logout())도 함께 호출할 것
}

export function getAuthToken() {
  return localStorage.getItem(TOKEN_KEY);
}

// 보관함 등 userId 쿼리 파라미터가 필요한 API에서 사용.
// 실제 로그인 세션이 있으면 그 userId, 없고 DEV_FORCE_LOGIN이면 임시 테스트 ID, 그 외엔 null.
export function getUserId() {
  const stored = localStorage.getItem(USER_ID_KEY);
  if (stored) return stored;
  return DEV_FORCE_LOGIN ? TEMP_DEV_USER_ID : null;
}

export function isLoggedIn() {
  if (DEV_FORCE_LOGIN) return true;
  return !!getAuthToken();
}

// 인사말/입력 라벨 등에서 공통으로 쓰는 표시용 이름.
export function getUserName() {
  return localStorage.getItem(USER_NAME_KEY);
}

// 카카오 로그인 닉네임이 있으면 그대로(4자 넘으면 말줄임), 없으면(비회원) '여행자'.
export function formatDisplayName(name) {
  if (!name) return '여행자';
  return name.length > 4 ? `${name.slice(0, 4)}...` : name;
}
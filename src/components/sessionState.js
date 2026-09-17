// src/components/sessionState.js
// 브라우저 새로고침(F5) 시 location.state 유실로 인한 튕김 방지용 세션 스토리지 유틸

const STEP_STATE_KEY = 'tripping_step_state';

export function saveStepState(state) {
  if (!state || typeof state !== 'object') return;
  try {
    sessionStorage.setItem(STEP_STATE_KEY, JSON.stringify(state));
  } catch {
    // sessionStorage 접근 불가 환경(시크릿 모드 일부 제한 등) 에러 무시
  }
}

export function loadStepState() {
  try {
    const raw = sessionStorage.getItem(STEP_STATE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearStepState() {
  try {
    sessionStorage.removeItem(STEP_STATE_KEY);
  } catch {
    // ignore
  }
}
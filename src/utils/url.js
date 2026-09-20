// src/utils/url.js

/**
 * http://로 시작하는 이미지 또는 리소스 URL을 https://로 변환하여
 * 브라우저의 Mixed Content 경고 및 차단을 방지합니다.
 * @param {string | null | undefined} url
 * @returns {string | null | undefined}
 */
export function toHttps(url) {
  if (!url || typeof url !== 'string') return url;
  return url.replace(/^http:\/\//i, 'https://');
}


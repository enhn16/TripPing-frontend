// src/pages/storage/api.js
import { apiGet } from '../../api/client';
import { isLoggedIn } from '../../components/auth';

const formatTag = (t) =>
  typeof t === 'string' ? (t.startsWith('#') ? t : `#${t}`) : null;

// SavedCourseSummaryResponse(목록 응답)에는 현재 tags/summary가 없음 (백엔드에 태그 추가 요청함).
// 응답에 tags가 없으면 빈 배열로 처리되고, 백엔드가 필드를 추가하면 코드 수정 없이 바로 반영됨.
function adaptSummary(raw) {
  return {
    savedCourseId: raw.savedCourseId,
    // storage.jsx에서 courseTitle과 title 둘 다 접근 가능하도록 매핑
    title: raw.courseTitle ?? '이름 없는 코스',
    courseTitle: raw.courseTitle ?? '이름 없는 코스',
    mapImageUrl: raw.mapImageUrl ?? null,
    tags: (raw.tags ?? []).map(formatTag).filter(Boolean),
    // savedAt과 createdAt 둘 다 매핑 (실제 응답 필드명은 createdAt)
    savedAt: raw.createdAt,
    createdAt: raw.createdAt,
    estimatedDuration: raw.estimatedDuration ?? null,
  };
}

// GET /api/saved-courses - userId 쿼리 파라미터 없이 JWT(Authorization 헤더)만으로 인증됨
// (백엔드 스펙 변경: security bearerAuth). 비로그인 상태면 호출하지 않고 빈 배열 반환.
export async function getSavedCourses() {
  if (!isLoggedIn()) return [];

  const rawResponse = await apiGet('/api/saved-courses');

  const list = Array.isArray(rawResponse)
    ? rawResponse
    : Array.isArray(rawResponse?.data)
      ? rawResponse.data
      : [];

  return list.map(adaptSummary);
}

export async function getSavedCourseDetail(savedCourseId) {
  const rawResponse = await apiGet(`/api/saved-courses/${encodeURIComponent(savedCourseId)}`);

  const detail = rawResponse?.data ?? rawResponse;

  const places = (detail?.places ?? []).map((p) => ({
    ...p,
    description: p.summary,
  }));

  const tags = (detail?.tags ?? []).map(formatTag).filter(Boolean);

  return { ...detail, places, tags };
}
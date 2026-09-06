// src/pages/storage/api.js
import { apiGet } from '../../api/client';
import { getUserId } from '../../components/auth';

const formatTag = (t) =>
  typeof t === 'string' ? (t.startsWith('#') ? t : `#${t}`) : null;

function adaptSummary(raw) {
  return {
    savedCourseId: raw.savedCourseId,
    // storage.jsx에서 courseTitle과 title 둘 다 접근 가능하도록 매핑
    title: raw.courseTitle ?? '이름 없는 코스',
    courseTitle: raw.courseTitle ?? '이름 없는 코스',
    summary: raw.summary ?? '',
    mapImageUrl: raw.mapImageUrl ?? null,
    tags: (raw.tags ?? []).map(formatTag).filter(Boolean),
    // savedAt과 createdAt 둘 다 매핑
    savedAt: raw.savedAt,
    createdAt: raw.savedAt,
    estimatedDuration: raw.estimatedDuration ?? null,
  };
}

export async function getSavedCourses() {
  const userId = getUserId();
  if (!userId) return [];

  const rawResponse = await apiGet(`/api/saved-courses?userId=${encodeURIComponent(userId)}`);

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
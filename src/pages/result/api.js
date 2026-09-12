// src/pages/result/api.js

import { apiPost } from '../../api/client';
import { isLoggedIn } from '../../components/auth';

async function createCourse({
  mainPlaceId,
  recommendationSessionId,
  region,
  travelType,
  age,
  companion,
  requirement,
  selectedPlaceIds,
}) {
  return apiPost('/api/courses', {
    mainPlaceId,
    recommendationSessionId,
    ...(region ? { region } : {}),
    travelType,
    age,
    companion,
    ...(requirement ? { requirement } : {}),
    selectedPlaceIds,
  });
}

// POST /api/saved-courses - userId 쿼리 파라미터 없이 JWT(Authorization 헤더)만으로 인증됨
// (백엔드 스펙 변경: security bearerAuth)
async function saveCourse(courseId) {
  return apiPost('/api/saved-courses', { courseId });
}

const formatTag = (t) =>
  typeof t === 'string' ? (t.startsWith('#') ? t : `#${t}`) : null;

function adaptCourseResponse(courseData) {
  const places = (courseData?.places ?? []).map((p) => ({
    ...p,
    description: p.summary,
  }));

  const tags = (courseData?.tags ?? []).map(formatTag).filter(Boolean);

  return { ...courseData, places, tags };
}

export async function prepareCourseResult({
  mainPlaceId,
  recommendationSessionId,
  selectedPlaceIds,
  region,
  travelType,
  age,
  companion,
  requirement,
}) {
  const rawResponse = await createCourse({
    mainPlaceId,
    recommendationSessionId,
    region,
    travelType,
    age,
    companion,
    requirement,
    selectedPlaceIds,
  });

  // 백엔드 ApiResponse 래퍼 언래핑 (data 객체 추출)
  const courseData = rawResponse?.data ?? rawResponse;

  // 보관함 자동 저장 (회원만)
  if (isLoggedIn() && courseData?.courseId) {
    saveCourse(courseData.courseId).catch((err) => {
      if (err.status === 409) return;
      console.error('보관함 자동 저장 실패:', err.message);
    });
  }

  return adaptCourseResponse(courseData);
}
// src/pages/expansion/api.js
// POST /api/recommendations/nearby - 메인 관광지 주변 관광지·카페·음식점 확장 추천.
// 실제 호출은 loading.jsx가 함 (next.path === '/expansion'일 때).
import { apiPost } from '../../api/client';
import { toHttps } from '../../utils/url';

// 응답은 attractions/cafes/restaurants 세 배열로 따로 오지만, ExpandSelection 화면은
// 하나의 목록 + category 필드(관광지/식당/카페)로 필터링하는 구조라 여기서 합쳐줌.
function adaptNearbyPlace(place, category) {
  return {
    placeId: place.placeId,
    name: place.name,
    category,
    summary: place.summary,
    imageUrl: toHttps(place.imageUrl) || null,
    lat: place.latitude,
    lng: place.longitude,
  };
}

/**
 * @param {object} params
 * @param {string} params.mainPlaceId
 * @param {string} params.recommendationSessionId
 * @returns {Promise<object[]>} category가 붙은 통합 장소 목록
 */
export async function recommendNearbyPlaces({ mainPlaceId, recommendationSessionId }) {
  const data = await apiPost('/api/recommendations/nearby', {
    mainPlaceId,
    recommendationSessionId,
  });

  return [
    ...(data.attractions ?? []).map((p) => adaptNearbyPlace(p, '관광지')),
    ...(data.cafes ?? []).map((p) => adaptNearbyPlace(p, '카페')),
    ...(data.restaurants ?? []).map((p) => adaptNearbyPlace(p, '식당')),
  ];
}
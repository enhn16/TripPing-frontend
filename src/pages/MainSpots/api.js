// src/pages/MainSpots/api.js
// POST /api/recommendations - ConditionInput에서 입력한 조건으로 메인 관광지 3곳 추천받기.
// 실제 호출은 loading.jsx가 함 (next.path === '/spots'일 때).
// GET /api/places/{placeId} - 상세보기 클릭 시 상세 정보 조회 (MainSpots.jsx가 호출).
import { apiGet, apiPost } from '../../api/client';

// ConditionInput의 companion 키(alone/friend/pet/parents/kid/partner) ->
// 백엔드 RecommendationRequest.companion enum.
const CATEGORY_TO_TRAVEL_TYPE = {
  nature: '자연',
  city: '도시',
  complex: '복합',
};

// ConditionInput의 COMPANION_TYPES 키 -> 실제 한글 라벨.
// 화면 표시(결과 태그 등)와 API 요청값(companion) 양쪽에 다 씀.
export const COMPANION_LABELS = {
  alone: '혼자',
  friend: '친구',
  pet: '반려동물',
  parents: '부모님',
  kid: '아이',
  partner: '연인',
};

export function getTravelTypeLabel(category) {
  return CATEGORY_TO_TRAVEL_TYPE[category] ?? '자연';
}

export function getCompanionLabel(companion) {
  return COMPANION_LABELS[companion] ?? companion;
}

/**
 * ConditionInput에서 넘어온 화면 state를 RecommendationRequest 형태로 변환.
 * @param {object} condition - { category, age, companion, region, extraRequest }
 */
export function buildRecommendationRequest(condition) {
  const { category, age, companion, region, extraRequest } = condition;

  return {
    travelType: CATEGORY_TO_TRAVEL_TYPE[category] ?? '자연',
    age: Number(age),
    companion: COMPANION_LABELS[companion] ?? companion,
    // '없음'(선호 지역 미선택)이면 region 필드 자체를 생략
    ...(region && region !== '없음' ? region: {}),
    ...(extraRequest ? { requirement: extraRequest } : {}),
  };
}

// RecommendedPlace -> MainSpots 화면(SpotCard)이 쓰는 spot 형태로 변환.
// 주소/영업시간/요금/주차/전화 등 상세 정보는 이 추천 API 응답에 없음(RecommendedPlace 스키마 참고).
// "상세보기" 클릭 시 getPlaceDetail()로 별도 조회해서 채움 (MainSpots.jsx 참고).
function adaptPlace(place) {
  return {
    id: place.placeId,
    name: place.name,
    summary: place.summary,
    thumbnail: place.imageUrl || null,
    lat: place.latitude,
    lng: place.longitude,
  };
}

// PlaceDetailResponse -> SpotCard 상세 영역이 쓰는 필드로 변환.
function adaptPlaceDetail(detail) {
  const hoursLines = [detail.openingHours, detail.restDate ? `휴무일: ${detail.restDate}` : null].filter(
    Boolean
  );

  return {
    address: detail.address || '정보 없음',
    hours: hoursLines.length > 0 ? hoursLines : '정보 없음',
    fee: detail.admissionFee || '정보 없음',
    parking: detail.parking || '정보 없음',
    phone: detail.phoneNumber || '정보 없음',
  };
}

/**
 * 관광지 상세 정보 조회 (상세보기 클릭 시 호출)
 * @param {string} placeId
 */
export async function getPlaceDetail(placeId) {
  const data = await apiGet(`/api/places/${encodeURIComponent(placeId)}`);
  return adaptPlaceDetail(data);
}

/**
 * @param {object} condition - ConditionInput에서 넘어온 state
 * @returns {Promise<{ recommendationSessionId: string, title: string, spots: object[] }>}
 */
export async function recommendMainSpots(condition) {
  const body = buildRecommendationRequest(condition);
  const data = await apiPost('/api/recommendations', body);

  return {
    recommendationSessionId: data.recommendationSessionId,
    title: data.title,
    spots: (data.places ?? []).map(adaptPlace),
  };
}
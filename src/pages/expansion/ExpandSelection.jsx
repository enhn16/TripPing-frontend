import { useState, useRef, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChevronLeft, Check, Compass } from 'lucide-react';
import WebLayout from '../../components/WebLayout';
import { loadKakaoMapScript, getCssVar } from '../../components/kakaoMap';
import { saveStepState, loadStepState } from '../../components/sessionState';
import { toHttps } from '../../utils/url';
import './ExpandSelection.css';

// 메인 관광지 핀 (원형 배지 + Compass 아이콘). .main-pin-badge 스타일과 동일하게 맞췄습니다.
function createMainPinElement() {
  const accent = getCssVar('--color-accent', '#FF9F5A');
  const wrapper = document.createElement('div');
  wrapper.innerHTML = `
    <div style="
      width: 32px; height: 32px; border-radius: 50%;
      background-color: ${accent}; border: 2px solid #ffffff;
      display: flex; align-items: center; justify-content: center;
    ">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg">
        <path d="m16.24 7.76-1.804 5.411a2 2 0 0 1-1.265 1.265L7.76 16.24l1.804-5.411a2 2 0 0 1 1.265-1.265z"/>
        <circle cx="12" cy="12" r="10"/>
      </svg>
    </div>
  `;
  return wrapper;
}

// 추가 추천 장소 핀 (lucide MapPin과 동일한 모양). .mock-pin 스타일과 동일하게 맞췄습니다.
function createPlacePinElement({ color, active }) {
  const size = active ? 32 : 26;
  const wrapper = document.createElement('div');
  wrapper.style.cursor = 'pointer';
  wrapper.style.transition = 'all 0.2s ease';
  wrapper.style.filter = active ? 'drop-shadow(0px -2px 4px rgba(0, 0, 0, 0.25))' : 'none';
  wrapper.innerHTML = `
    <svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="${color}" stroke="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/>
      <circle cx="12" cy="10" r="3"/>
    </svg>
  `;
  return wrapper;
}

// 메인 관광지가 없을 때(직접 이 경로로 진입 등) 지도 중심을 잡기 위한 최소한의 폴백.
const FALLBACK_MAIN_PLACE = {
  placeId: 'main-01',
  name: '관광지',
  lat: 37.5665,
  lng: 126.978,
};

const CATEGORIES = ['전체', '관광지', '식당', '카페'];

function ExpandPlaceCard({
  place,
  isSelected,
  isClicked,
  onCardClick,
  onToggleCheck,
  cardRef,
}) {
  const titleRef = useRef(null);
  const [isLongTitle, setIsLongTitle] = useState(() => (place?.name?.length ?? 0) >= 11);

  useEffect(() => {
    const el = titleRef.current;
    if (!el) return;
    const check = () => {
      // 1줄: line-height 1.2 * 15px = 18px. 2줄 이상이면 offsetHeight > 25px.
      setIsLongTitle(el.offsetHeight > 25);
    };
    check();
    window.addEventListener('resize', check);
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(check) : null;
    if (ro) ro.observe(el);
    return () => {
      window.removeEventListener('resize', check);
      if (ro) ro.disconnect();
    };
  }, [place?.name]);

  return (
    <div
      ref={cardRef}
      className={`place-card web-app-card ${isSelected ? 'selected' : ''} ${isClicked ? 'active' : ''}`}
      onClick={() => onCardClick(place.placeId)}
    >
      <img src={toHttps(place.imageUrl)} alt={place.name} className="card-thumb" />

      <div className="card-info">
        <div className={`card-title-badge ${isClicked ? 'active' : ''}`}>
          <h3 ref={titleRef} className="card-title">{place.name}</h3>
        </div>
        <p className={`card-summary ${isLongTitle ? 'card-summary--clamp-2' : 'card-summary--clamp-3'}`}>
          {place.summary}
        </p>
      </div>

      <div
        className={`check-circle-btn ${isSelected ? 'checked' : ''}`}
        onClick={(e) => onToggleCheck(e, place.placeId)}
        role="button"
        tabIndex={0}
        aria-label={`${place.name} 선택`}
      >
        <Check size={14} color={isSelected ? '#ffffff' : '#D1D5DB'} strokeWidth={3} />
      </div>
    </div>
  );
}

export default function ExpandSelection() {
  const navigate = useNavigate();
  const location = useLocation();
  const incomingState = useMemo(() => {
    const savedState = loadStepState();
    return location.state?.mainSpot ? location.state : (savedState?.mainSpot ? savedState : {});
  }, [location.state]);
  // loading.jsx가 recommendNearbyPlaces() 응답으로 채워서 넘겨줌
  // (placeId/name/category/summary/imageUrl/lat/lng)
  const places = incomingState.places ?? [];

  useEffect(() => {
    if (incomingState?.mainSpot) {
      saveStepState(incomingState);
    }
  }, [incomingState]);

  const cardRefs = useRef(new Map());

  // MainSpots에서 넘어온 실제 선택 관광지(좌표 포함). 없으면(직접 진입 등) 목업으로 대체.
  const incomingMainSpot = incomingState.mainSpot;
  const mainPlace =
    incomingMainSpot?.lat && incomingMainSpot?.lng
      ? {
          placeId: incomingMainSpot.id,
          name: incomingMainSpot.name,
          lat: incomingMainSpot.lat,
          lng: incomingMainSpot.lng,
        }
      : FALLBACK_MAIN_PLACE;

  // 1. 선택된 장소 ID 목록 (N/4 개수 카운트 연동)
  const [selectedIds, setSelectedIds] = useState([]);
  // 2. 현재 클릭하여 열람 중인 장소 ID (관광지명 회색 배경 & 핀 하이라이트)
  const [clickedPlaceId, setClickedPlaceId] = useState(null);
  // 3. 카테고리 필터 상태
  const [activeCategory, setActiveCategory] = useState('전체');

  // ------------------------------ 카카오맵 ------------------------------
  const mapContainerRef = useRef(null);
  const mapObjRef = useRef(null);
  const overlaysRef = useRef([]);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState(false);

  // [핵심 기능 2] 카드 본체 클릭 -> 이동/열람
  const handleCardClick = (id) => {
    setClickedPlaceId(id);

    const cardNode = cardRefs.current.get(id);
    if (cardNode) {
      cardNode.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    // 지도도 해당 장소 위치로 부드럽게 이동
    const kakao = window.kakao;
    if (mapReady && kakao && mapObjRef.current) {
      const place = places.find((p) => p.placeId === id);
      if (place) {
        mapObjRef.current.panTo(new kakao.maps.LatLng(place.lat, place.lng));
      }
    }
  };


  // 1) SDK 로드 + 지도 생성 (메인 관광지 + 추가 추천 장소가 모두 보이도록 범위 조정)
  useEffect(() => {
    let cancelled = false;

    loadKakaoMapScript()
      .then((kakao) => {
        if (cancelled || !mapContainerRef.current) return;

        const map = new kakao.maps.Map(mapContainerRef.current, {
          center: new kakao.maps.LatLng(mainPlace.lat, mainPlace.lng),
          level: 6,
        });
        mapObjRef.current = map;

        const bounds = new kakao.maps.LatLngBounds();
        bounds.extend(new kakao.maps.LatLng(mainPlace.lat, mainPlace.lng));
        places.forEach((place) => {
          if (place.lat && place.lng) bounds.extend(new kakao.maps.LatLng(place.lat, place.lng));
        });
        map.setBounds(bounds);

        setMapReady(true);
      })
      .catch(() => {
        if (!cancelled) setMapError(true);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the map aligned when the browser crosses a responsive breakpoint.
  useEffect(() => {
    const map = mapObjRef.current;
    const container = mapContainerRef.current;
    if (!mapReady || !map || !container) return;
    const observer = new ResizeObserver(() => {
      const center = map.getCenter();
      map.relayout();
      map.setCenter(center);
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [mapReady]);

  // 2) 선택/열람 상태가 바뀔 때마다 핀(커스텀 오버레이) 다시 그리기
  useEffect(() => {
    const kakao = window.kakao;
    if (!mapReady || !kakao || !mapObjRef.current) return;

    overlaysRef.current.forEach((overlay) => overlay.setMap(null));
    overlaysRef.current = [];

    // 메인 관광지 핀
    const mainOverlay = new kakao.maps.CustomOverlay({
      position: new kakao.maps.LatLng(mainPlace.lat, mainPlace.lng),
      content: createMainPinElement(),
      xAnchor: 0.5,
      yAnchor: 0.5,
      zIndex: 10,
    });
    mainOverlay.setMap(mapObjRef.current);
    overlaysRef.current.push(mainOverlay);

    // 추가 추천 장소 핀
    places.forEach((place) => {
      if (!place.lat || !place.lng) return
      const isSelected = selectedIds.includes(place.placeId);
      const isClicked = clickedPlaceId === place.placeId;
      const color = isSelected
        ? getCssVar('--color-accent', '#FF9F5A')
        : getCssVar('--color-primary', '#007A8C');

      const el = createPlacePinElement({ color, active: isClicked });
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        handleCardClick(place.placeId);
      });

      const overlay = new kakao.maps.CustomOverlay({
        position: new kakao.maps.LatLng(place.lat, place.lng),
        content: el,
        xAnchor: 0.5,
        yAnchor: 1,
        zIndex: isClicked ? 8 : 1,
      });
      overlay.setMap(mapObjRef.current);
      overlaysRef.current.push(overlay);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapReady, places, selectedIds, clickedPlaceId]);

  // [핵심 기능 1] 우상단 원형 체크 표시 토글
  const handleToggleCheck = (e, id) => {
    e.stopPropagation();

    setSelectedIds((prevSelected) => {
      const isAlreadySelected = prevSelected.includes(id);

      if (isAlreadySelected) {
        return prevSelected.filter((item) => item !== id);
      } else {
        if (prevSelected.length >= 4) {
          alert('최대 4개까지 선택 가능합니다.');
          return prevSelected;
        }
        return [...prevSelected, id];
      }
    });
  };

  const filteredPlaces = places.filter((place) => {
    if (activeCategory === '전체') return true;
    return place.category === activeCategory;
  });

  // [핵심 기능 3] 코스 만들기 -> 결과 이동
  const handleCreateCourse = () => {
    navigate('/loading', {
      state: {
        next: {
          path: '/result',
          state: { ...incomingState, selectedPlaceIds: selectedIds },
        },
      },
    });
  };

  return (
    <WebLayout>
      {/* -------------------- 1. Map Area -------------------- */}
      <div className="map-wrapper">
        <button
          className="back-button web-app-btn"
          aria-label="뒤로가기"
          onClick={() => navigate(-1)}
        >
          <ChevronLeft size={24} color="var(--color-text)" />
        </button>

        <div className="map-mock-view">
          {/* 카카오맵이 그려지는 영역. 핀은 위 useEffect에서 CustomOverlay로 그립니다. */}
          <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }}>
            {mapError && (
              <div className="map-error-msg">
                지도를 불러오지 못했습니다.<br />
                .env의 VITE_KAKAO_MAP_KEY 값을 확인해주세요.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* -------------------- 2. Bottom Sheet Area -------------------- */}
      <div className="sheet-container">
        <div className="sheet-header">
          <div className="main-place-tag">
            <Compass size={18} color="var(--color-accent)" />
            {mainPlace.name}
          </div>

          <div className="filter-row">
            <div className="category-group web-app-scroll-x">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  className={`chip web-app-btn ${activeCategory === cat ? 'active' : ''}`}
                  onClick={() => setActiveCategory(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>
            <span className="count-badge">{selectedIds.length}/4 선택</span>
          </div>
        </div>

        {/* Card List (하단 버튼 아래로 스크롤) */}
        <div className="card-list web-app-scroll-y">
          {filteredPlaces.map((place) => (
            <ExpandPlaceCard
              key={place.placeId}
              place={place}
              isSelected={selectedIds.includes(place.placeId)}
              isClicked={clickedPlaceId === place.placeId}
              onCardClick={handleCardClick}
              onToggleCheck={handleToggleCheck}
              cardRef={(node) => {
                if (node) {
                  cardRefs.current.set(place.placeId, node);
                } else {
                  cardRefs.current.delete(place.placeId);
                }
              }}
            />
          ))}
        </div>

        {/* Bottom CTA Button (하단 고정) */}
        <div className="cta-wrapper">
          <button className="cta-button web-app-btn" onClick={handleCreateCourse}>
            코스 만들기 -&gt;
          </button>
        </div>
      </div>
    </WebLayout>
  );
}
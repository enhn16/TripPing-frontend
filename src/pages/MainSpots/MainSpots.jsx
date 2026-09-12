import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  ChevronLeft,
  Check,
  MapPin,
  Clock,
  Ticket,
  Car,
  Phone,
  ImageOff,
} from 'lucide-react'
import MobileLayout from '../../components/MobileLayout'
import { loadKakaoMapScript, getCssVar } from '../../components/kakaoMap'
import { getPlaceDetail } from './api'
import './MainSpots.css'

// 상세보기 요청 중/실패 시 DetailRow에 표시할 임시 값들
const LOADING_DETAIL = {
  address: '불러오는 중...',
  hours: '불러오는 중...',
  fee: '불러오는 중...',
  parking: '불러오는 중...',
  phone: '불러오는 중...',
}
const FAILED_DETAIL = {
  address: '정보 없음',
  hours: '정보 없음',
  fee: '정보 없음',
  parking: '정보 없음',
  phone: '정보 없음',
}

// lucide-react의 MapPin 아이콘과 동일한 모양의 마커 DOM을 만듭니다.
// (카카오맵 CustomOverlay는 React 엘리먼트가 아니라 실제 DOM 노드를 요구해서 직접 SVG로 구현)
// 크기/그림자는 ExpandSelection.jsx의 createPlacePinElement와 통일 (26→32, 강조 시에만 그림자).
function createSpotPinElement({ color, big }) {
  const size = big ? 32 : 26
  const wrapper = document.createElement('div')
  wrapper.style.cursor = 'pointer'
  wrapper.style.transition = 'all 0.2s ease'
  wrapper.style.filter = big ? 'drop-shadow(0px -2px 4px rgba(0, 0, 0, 0.25))' : 'none'
  wrapper.innerHTML = `
    <svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="${color}" xmlns="http://www.w3.org/2000/svg">
      <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" stroke="${color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="12" cy="10" r="3" fill="${color}" stroke="${color}" stroke-width="1.5" />
    </svg>
  `
  return wrapper
}

function MainSpots() {
  const navigate = useNavigate()
  const location = useLocation()
  // loading.jsx가 recommendMainSpots() 응답으로 채워서 넘겨줌: recommendationSessionId,
  // spots(id/name/summary/thumbnail/lat/lng), title
  // 주소/영업시간/요금/주차/전화 등 상세 정보는 상세보기 클릭 시 getPlaceDetail()로 별도 조회함.
  // + 원래 조건 입력값들(category/age/companion/region/extraRequest)도 그대로 같이 있음.
  const conditionState = location.state ?? {}
  const spots = conditionState.spots ?? []

  const [openSpotId, setOpenSpotId] = useState(null)
  const [selectedId, setSelectedId] = useState(null)
  const [focusedId, setFocusedId] = useState(null)

  // 상세보기에서 쓸 GET /api/places/{placeId} 결과 캐시 (spot.id -> 상세 필드)
  const [detailCache, setDetailCache] = useState({})
  const [detailLoadingId, setDetailLoadingId] = useState(null)

  const baseOpenSpot = openSpotId ? spots.find((s) => s.id === openSpotId) : null
  const openSpotExtra = openSpotId
    ? (detailCache[openSpotId] ?? (openSpotId === detailLoadingId ? LOADING_DETAIL : FAILED_DETAIL))
    : null
  const openSpot = baseOpenSpot ? { ...baseOpenSpot, ...openSpotExtra } : null
  const canSubmit = selectedId !== null

  const cardRefs = useRef({})

  useEffect(() => {
    if (!openSpotId && focusedId && cardRefs.current[focusedId]) {
      cardRefs.current[focusedId].scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [focusedId, openSpotId])

  const handleToggleSelect = (id, e) => {
    e.stopPropagation()
    setSelectedId((prev) => (prev === id ? null : id))
  }

  const handleFocusCard = (id) => {
    setFocusedId(id)
  }

  const handleOpenDetail = (id, e) => {
    e.stopPropagation()
    setOpenSpotId(id)
    // 상세 화면에서 보고 있는 장소가 지도에서도 눈에 띄도록, 핀 클릭 때와 동일하게 포커스 이동
    setFocusedId(id)

    // 이미 조회해둔 상세 정보가 있으면 재요청하지 않음
    if (detailCache[id]) return

    setDetailLoadingId(id)
    getPlaceDetail(id)
      .then((detail) => {
        setDetailCache((prev) => ({ ...prev, [id]: detail }))
      })
      .catch((err) => {
        console.error('[관광지 상세] 조회 실패:', err.message)
        setDetailCache((prev) => ({ ...prev, [id]: FAILED_DETAIL }))
      })
      .finally(() => {
        setDetailLoadingId((prev) => (prev === id ? null : prev))
      })
  }

  const handlePinClick = (id) => {
    setOpenSpotId(null)
    setFocusedId(id)
  }

  // ------------------------------ 카카오맵 ------------------------------
  const mapContainerRef = useRef(null) // 지도를 그릴 DOM
  const mapObjRef = useRef(null) // 카카오맵 인스턴스
  const overlaysRef = useRef([]) // 현재 지도 위에 떠 있는 커스텀 오버레이(핀) 목록
  const [mapReady, setMapReady] = useState(false)
  const [mapError, setMapError] = useState(false)

  // 1) SDK 로드 + 지도 생성.
  // spots는 추천 API 응답에 lat/lng가 이미 포함돼 있어서(RecommendedPlace 참고),
  // 예전처럼 주소를 다시 Geocoding할 필요가 없어짐 - 받은 좌표를 그대로 씀.
  useEffect(() => {
    let cancelled = false

    loadKakaoMapScript()
      .then((kakao) => {
        if (cancelled || !mapContainerRef.current) return
        if (spots.length === 0) {
          setMapReady(true)
          return
        }

        const center = new kakao.maps.LatLng(spots[0].lat, spots[0].lng)
        const map = new kakao.maps.Map(mapContainerRef.current, {
          center,
          level: 5,
        })
        mapObjRef.current = map

        const bounds = new kakao.maps.LatLngBounds()
        spots.forEach((spot) => {
          if (spot.lat && spot.lng) bounds.extend(new kakao.maps.LatLng(spot.lat, spot.lng))
        })
        map.setBounds(bounds)

        setMapReady(true)
      })
      .catch(() => {
        if (!cancelled) setMapError(true)
      })

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 2) 상태(선택/포커스/상세보기)가 바뀔 때마다 핀(커스텀 오버레이) 다시 그리기
  useEffect(() => {
    const kakao = window.kakao
    if (!mapReady || !kakao || !mapObjRef.current) return

    overlaysRef.current.forEach((overlay) => overlay.setMap(null))
    overlaysRef.current = []

    spots.forEach((spot) => {
      if (!spot.lat || !spot.lng) return

      const isSelected = selectedId === spot.id
      const isBig = isSelected || focusedId === spot.id || openSpotId === spot.id
      const color = isSelected
        ? getCssVar('--color-accent', '#FF9F5A')
        : getCssVar('--color-primary', '#007A8C')

      const el = createSpotPinElement({ color, big: isBig })
      el.addEventListener('click', (e) => {
        e.stopPropagation()
        handlePinClick(spot.id)
      })

      const overlay = new kakao.maps.CustomOverlay({
        position: new kakao.maps.LatLng(spot.lat, spot.lng),
        content: el,
        xAnchor: 0.5,
        yAnchor: 1,
        zIndex: isBig ? 2 : 1,
      })
      overlay.setMap(mapObjRef.current)
      overlaysRef.current.push(overlay)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapReady, spots, selectedId, focusedId, openSpotId])

  // 3) 목록에서 카드를 포커스했을 때(또는 핀 클릭) 지도도 해당 위치로 부드럽게 이동
  useEffect(() => {
    const kakao = window.kakao
    if (!mapReady || !kakao || !mapObjRef.current || !focusedId) return
    const spot = spots.find((s) => s.id === focusedId)
    if (!spot?.lat || !spot?.lng) return
    mapObjRef.current.panTo(new kakao.maps.LatLng(spot.lat, spot.lng))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusedId, mapReady])

  const handleBack = () => {
    if (openSpotId) {
      setOpenSpotId(null)
      return
    }
    if (window.history.state?.idx > 0) {
      navigate(-1)
    } else {
      navigate('/select')
    }
  }

  const handleSubmit = () => {
    if (!canSubmit) return
    const selectedSpot = spots.find((s) => s.id === selectedId)
    // selectedSpot에 이미 lat/lng가 있어서(추천 API 응답), 별도 좌표 조회 없이 그대로 넘김.
    // recommendationSessionId도 conditionState에 이미 들어있어 자동으로 같이 전달됨.
    navigate('/loading', {
      state: {
        next: {
          path: '/expansion',
          state: { ...conditionState, mainSpot: selectedSpot },
        },
      },
    })
  }

  return (
    <MobileLayout>
      <div className="main-spots">
        <div className="main-spots__map">
          {/* 카카오맵이 그려지는 영역. 핀은 위 useEffect에서 CustomOverlay로 그립니다. */}
          <div className="main-spots__map-placeholder" ref={mapContainerRef}>
            {mapError && (
              <div className="main-spots__map-error">
                지도를 불러오지 못했습니다.<br />
                .env의 VITE_KAKAO_MAP_KEY 값을 확인해주세요.
              </div>
            )}
          </div>

          <button className="main-spots__back-btn" aria-label="뒤로 가기" onClick={handleBack}>
            <ChevronLeft size={24} color="var(--color-text)" />
          </button>
        </div>

        <div className="main-spots__sheet">
          {openSpot ? (
            <div className="main-spots__detail-wrap">
              <SpotCard
                spot={openSpot}
                selected={selectedId === openSpot.id}
                expanded
                onToggleSelect={(e) => handleToggleSelect(openSpot.id, e)}
              />
            </div>
          ) : (
            <div className="main-spots__list">
              {spots.map((spot) => (
                <SpotCard
                  key={spot.id}
                  ref={(el) => (cardRefs.current[spot.id] = el)}
                  spot={spot}
                  selected={selectedId === spot.id}
                  focused={focusedId === spot.id}
                  onFocusCard={() => handleFocusCard(spot.id)}
                  onOpenDetail={(e) => handleOpenDetail(spot.id, e)}
                  onToggleSelect={(e) => handleToggleSelect(spot.id, e)}
                />
              ))}
            </div>
          )}

          {/* Floating CTA 영역 */}
          <div className="main-spots__cta-wrapper">
            <button
              className="main-spots__submit-btn"
              disabled={!canSubmit}
              onClick={handleSubmit}
            >
              선택 완료 →
            </button>
          </div>
        </div>
      </div>
    </MobileLayout>
  )
}

function SpotCard({
  spot,
  selected,
  focused = false,
  expanded = false,
  onFocusCard,
  onOpenDetail,
  onToggleSelect,
  ref,
}) {
  return (
    <div
      ref={ref}
      className={[
        'spot-card',
        selected ? 'spot-card--selected' : '',
        focused ? 'spot-card--focused' : '',
        expanded ? 'spot-card--expanded' : '',
      ].join(' ').trim()}
      onClick={!expanded ? onFocusCard : undefined}
      role={!expanded ? 'button' : undefined}
      tabIndex={!expanded ? 0 : undefined}
    >
      <div className="spot-card__top">
        <div className="spot-card__thumb">
          {spot.thumbnail ? (
            <img src={spot.thumbnail} alt={spot.name} />
          ) : (
            <ImageOff size={20} className="spot-card__thumb-placeholder-icon" />
          )}
        </div>
        <div className="spot-card__info">
          <h3
            className={`spot-card__title ${!expanded ? 'spot-card__title--link' : ''}`}
            onClick={!expanded ? onOpenDetail : undefined}
          >
            {spot.name}
          </h3>
          <p className={`spot-card__summary ${expanded ? '' : 'spot-card__summary--clamp'}`}>
            {spot.summary}
          </p>
        </div>
        <button
          type="button"
          className={`spot-card__check ${selected ? 'spot-card__check--active' : ''}`}
          aria-label="이 장소 선택"
          onClick={onToggleSelect}
        >
          <Check size={14} />
        </button>
      </div>

      {expanded && (
        <div className="spot-card__details">
          <DetailRow icon={MapPin} text={spot.address} />
          <DetailRow icon={Clock} text={Array.isArray(spot.hours) ? spot.hours.join('\n') : spot.hours} />
          <DetailRow icon={Ticket} text={spot.fee} />
          <DetailRow icon={Car} text={spot.parking} />
          <DetailRow icon={Phone} text={spot.phone} />
        </div>
      )}
    </div>
  )
}

function DetailRow({ icon: Icon, text }) {
  return (
    <div className="detail-row">
      <Icon size={17} className="detail-row__icon" />
      <span className="detail-row__text">{text}</span>
    </div>
  )
}

export default MainSpots
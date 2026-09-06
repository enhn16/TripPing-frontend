import { useEffect, useRef, useState, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import MobileLayout from '../../components/MobileLayout';
import { formatDisplayName, getUserName } from '../../components/auth';
import './loading.css';
import symbolW from '../../assets/symbolW.png';
import { recommendMainSpots, getTravelTypeLabel, getCompanionLabel } from '../MainSpots/api';
import { recommendNearbyPlaces } from '../expansion/api';
import { prepareCourseResult } from '../result/api';

function buildPhrases(userName) {
  return [
    { highlight: formatDisplayName(userName), rest: ' 님의 선호를\n분석하고 있어요!' },
    { rest: '여행을 예쁘게\n그려내고 있어요!' },
    { rest: '완벽한 여행을 위해\n신중하게 고르고 있어요...' },
    { rest: '여행은 언제나\n우리 마음을 설레게 해요!' },
    { rest: '소중한 추억을 쌓으러\n함께 떠나볼까요?' },
    { rest: '여행을 준비하는 지금이\n가장 설레는 순간이에요!' },
  ];
}

// next.path에 따라 실제로 호출해야 할 API를 결정하고, 그 응답을 다음 화면 state에
// 어떻게 얹을지를 정의. 화면 하나 늘어날 때마다 여기에 분기 하나씩 추가하면 됨.
async function resolveNextState(next) {
  switch (next.path) {
    case '/spots': {
      // ConditionInput -> MainSpots: 조건 기반 메인 관광지 추천
      const { recommendationSessionId, spots } = await recommendMainSpots(next.state);
      return { ...next.state, recommendationSessionId, spots };
    }
    case '/expansion': {
      // MainSpots -> ExpandSelection: 메인 관광지 주변 확장 추천
      const places = await recommendNearbyPlaces({
        mainPlaceId: next.state.mainSpot?.id,
        recommendationSessionId: next.state.recommendationSessionId,
      });
      return { ...next.state, places };
    }
    case '/result': {
      // ExpandSelection -> Result: 코스 생성(+ 로그인 상태면 보관함 자동 저장)
      const result = await prepareCourseResult({
        mainPlaceId: next.state.mainSpot?.id,
        recommendationSessionId: next.state.recommendationSessionId,
        selectedPlaceIds: next.state.selectedPlaceIds ?? [],
        region: next.state.region,
        travelType: getTravelTypeLabel(next.state.category),
        age: Number(next.state.age),
        companion: getCompanionLabel(next.state.companion),
        requirement: next.state.extraRequest,
      });
      return { ...next.state, result };
    }
    default:
      return next.state;
  }
}

/**
 * 화면과 화면 사이에서 공통으로 쓰이는 로딩 화면.
 *
 * 이전 화면에서 다음과 같은 형태로 navigate 해서 진입합니다:
 *   navigate('/loading', {
 *     state: {
 *       userName: '유진',              // (선택) 인사 문구용
 *       next: {
 *         path: '/spots',              // 로딩이 끝난 뒤 이동할 경로
 *         state: { ...다음 화면에 필요한 데이터 },
 *       },
 *     },
 *   });
 *
 * next 정보 없이 이 경로로 직접 들어온 경우(새로고침 등)에는 랜딩으로 되돌려보냅니다.
 */
export default function LoadingScreen() {
  const location = useLocation();
  const navigate = useNavigate();

  const { userName: stateUserName, next } = location.state ?? {};

  // 1. 중복 요청 방지용 ref 추가
  const hasRequestedRef = useRef(false);

  // 넘겨받은 userName이 없으면 localStorage에 저장된 실제 유저 이름 조회
  const userName = stateUserName || getUserName();

  const phrases = useMemo(() => buildPhrases(userName), [userName]);

  const [phraseIndex, setPhraseIndex] = useState(0);
  const [fadeKey, setFadeKey] = useState(0);
  const lastIndexRef = useRef(0);

  // 문구 랜덤 로테이션
  useEffect(() => {
    const pickRandomIndex = (exclude) => {
      let idx;
      do {
        idx = 1 + Math.floor(Math.random() * (phrases.length - 1));
      } while (phrases.length > 2 && idx === exclude);
      return idx;
    };

    const FIRST_DELAY = 7000;
    const INTERVAL_DELAY = 5000;

    let intervalId;

    const timeoutId = setTimeout(() => {
      const nextIndex = pickRandomIndex(lastIndexRef.current);
      lastIndexRef.current = nextIndex;
      setPhraseIndex(nextIndex);
      setFadeKey((prev) => prev + 1);

      intervalId = setInterval(() => {
        const idx = pickRandomIndex(lastIndexRef.current);
        lastIndexRef.current = idx;
        setPhraseIndex(idx);
        setFadeKey((prev) => prev + 1);
      }, INTERVAL_DELAY);
    }, FIRST_DELAY);

    return () => {
      clearTimeout(timeoutId);
      if (intervalId) clearInterval(intervalId);
    };
  }, [phrases.length]);

  // 다음 화면으로의 실제 이동 처리: next.path에 맞는 API를 호출하고, 응답이 오면 이동
  useEffect(() => {
    if (!next?.path) {
      // next 정보 없이 로딩 화면에 바로 들어온 경우 - 처음으로 되돌림
      navigate('/', { replace: true });
      return;
    }

    // StrictMode에 의해 재실행되어도 이미 요청을 보냈다면 스킵
    if (hasRequestedRef.current) return;
    hasRequestedRef.current = true;

    let cancelled = false;

    resolveNextState(next)
      .then((resolvedState) => {
        if (cancelled) return;
        navigate(next.path, { state: resolvedState, replace: true });
      })
      .catch((err) => {
        if (cancelled) return;
        console.error(`[loading] ${next.path} 준비 중 오류:`, err);
        alert(err.message || '요청 처리 중 문제가 발생했어요. 다시 시도해주세요.');
        navigate(-1);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [next, navigate]);

  const currentPhrase = phrases[phraseIndex];
  const lines = currentPhrase.rest.split('\n');

  return (
    <MobileLayout background="var(--color-primary)">
      <div className="loading-screen">
        <div className="loading-content">
          <img
            src={symbolW}
            alt=""
            className="loading-symbol"
            aria-hidden="true"
          />

          <p key={fadeKey} className="loading-caption">
            {currentPhrase.highlight && (
              <strong className="loading-caption-highlight">
                {currentPhrase.highlight}
              </strong>
            )}
            {lines.map((line, i) => (
              <span key={i}>
                {line}
                {i < lines.length - 1 && <br />}
              </span>
            ))}
          </p>
        </div>
      </div>
    </MobileLayout>
  );
}
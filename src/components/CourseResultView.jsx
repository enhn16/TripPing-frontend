// src/components/CourseResult/CourseResultView.jsx
// result.jsx(코스 생성 직후)와 storage/detail.jsx(보관함 상세)가 완전히 동일한 헤더/카드/하단버튼을
// 쓰기로 해서, 그 부분만 여기로 뽑음. 데이터를 "어떻게 구할지"(location.state vs API 조회)는
// 각 페이지 파일 책임이고, 이 컴포넌트는 courseData를 받아서 그리기만 함.
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, MapPin, Clock, Share2, FlagTriangleRight, Download } from 'lucide-react';

import symbolW from '../assets/symbolW.png';
import logoW from '../assets/logoW.png';
import { useCourseCapture } from './useCourseCapture';

import './CourseResultView.css';

/**
 * 백엔드에서 소수점 소요시간이 "약 7시간.5"처럼 비정상 포맷으로 전달되는 경우를
 * "약 7시간 30분" 등 자연스러운 한국어 시간 표기로 보정하는 유틸
 */
function formatDuration(duration) {
  if (!duration && duration !== 0) return '약 -시간';

  if (typeof duration === 'number') {
    const h = Math.floor(duration);
    const m = Math.round((duration - h) * 60);
    return `약 ${h}시간${m > 0 ? ` ${m}분` : ''}`;
  }

  if (typeof duration === 'string') {
    const trimmed = duration.trim();
    if (!trimmed) return '약 -시간';

    const hasApprox = trimmed.startsWith('약 ') || trimmed.startsWith('약');
    const prefix = hasApprox ? '약 ' : '';
    const clean = trimmed.replace(/^약\s*/, '');

    // Case 1: 백엔드에서 소수점이 '시간' 뒤로 붙은 경우 (예: "7시간.5")
    const matchWrongDot = clean.match(/^(\d+)\s*시간\s*\.\s*(\d+)/);
    if (matchWrongDot) {
      const h = matchWrongDot[1];
      const m = Math.round(Number(`0.${matchWrongDot[2]}`) * 60);
      return `${prefix || '약 '}${h}시간${m > 0 ? ` ${m}분` : ''}`;
    }

    // Case 2: "7.5시간" 형태
    const matchDecimalHours = clean.match(/^(\d+)\.(\d+)\s*시간/);
    if (matchDecimalHours) {
      const h = matchDecimalHours[1];
      const m = Math.round(Number(`0.${matchDecimalHours[2]}`) * 60);
      return `${prefix || '약 '}${h}시간${m > 0 ? ` ${m}분` : ''}`;
    }

    // Case 3: 순수 숫자 문자열 (예: "7.5")
    if (!isNaN(Number(clean))) {
      const num = Number(clean);
      const h = Math.floor(num);
      const m = Math.round((num - h) * 60);
      return `약 ${h}시간${m > 0 ? ` ${m}분` : ''}`;
    }

    // Case 4: 이미 완성된 정상 문자열 (예: "약 5시간", "약 7시간 30분")
    return trimmed;
  }

  return String(duration);
}

export default function CourseResultView({ courseData, headerTitle }) {
  const navigate = useNavigate();
  const { cardRef, listRef, lineRect, saving, sharing, handleSaveImage, handleShareImage } =
    useCourseCapture(courseData);

  if (!courseData) return null;

  const tags = courseData.tags ?? [];
  const placeCount = courseData.places?.length ?? 0;

  return (
    <>
      {/* ── 상단 헤더: 좌(이동 그룹) & 중앙(액션 버튼: 저장/공유) ── */}
      <header className="course-result-header">
        <div className="course-result-header__group">
          <button
            className="course-result-header__box course-result-header__back"
            onClick={() => navigate(-1)}
            aria-label="뒤로가기"
          >
            <ChevronLeft size={20} />
          </button>
          {headerTitle && <span className="course-result-header__title">{headerTitle}</span>}
        </div>

        <div className="course-result-actions">
          <button className="course-result-actions__save" onClick={handleSaveImage} disabled={saving || sharing}>
            <Download size={20} /> {saving ? '저장 중...' : '이미지 저장'}
          </button>
          <button className="course-result-actions__share" onClick={handleShareImage} disabled={saving || sharing}>
            <Share2 size={20} /> {sharing ? '공유 준비 중...' : '공유하기'}
          </button>
        </div>
      </header>

      <div className="course-result-content">
        {/* ── 코스 결과 카드 ── */}
        <div className="course-result-card" ref={cardRef}>
        <div className="course-result-card__top">
          <h1 className="course-result-card__title">{courseData.courseTitle}</h1>
          <p className="course-result-card__desc">{courseData.description}</p>

          {tags.length > 0 && (
            <div className="course-result-card__tags">
              {tags.map((tag) => (
                <span key={tag} className="course-result-card__tag">
                  <span className="course-result-card__tag-text">{tag}</span>
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="course-result-card__inner">
          {/* html2canvas가 <img object-fit:cover>를 원본 크기 그대로 캡처하는 문제 방지 위해
              background-image + background-size:cover 사용 */}
          <div
            className="course-result-card__map"
            role="img"
            aria-label="코스 지도"
            style={courseData.mapImageUrl ? { backgroundImage: `url("${courseData.mapImageUrl}")` } : undefined}
          />

          <ul className="course-result-card__list" ref={listRef}>
            {placeCount > 1 && (
              <span
                className="course-result-card__list-line"
                style={{ top: `${lineRect.top}px`, height: `${lineRect.height}px` }}
                aria-hidden="true"
              />
            )}
            {courseData.places.map((place) => {
              const isMain = place.order === 1;
              return (
                <li key={place.placeId} className="course-result-card__place">
                  <span className="course-result-card__place-pin">
                    <MapPin
                      size={20}
                      preserveAspectRatio="none"
                      color="var(--color-accent, #ff9f5a)"
                      fill={isMain ? 'none' : 'var(--color-accent, #ff9f5a)'}
                    />
                  </span>
                  <div
                    className="course-result-card__place-thumb"
                    role="img"
                    aria-label={place.name}
                    style={place.imageUrl ? { backgroundImage: `url("${place.imageUrl}")` } : undefined}
                  />
                  <div>
                    <span className="course-result-card__place-name">{place.name}</span>
                    {place.description && (
                      <p className="course-result-card__place-desc">{place.description}</p>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="course-result-card__meta">
            <span>
              <FlagTriangleRight size={17} /> 총 {placeCount}곳 방문
            </span>
            <span>
              <Clock size={17} /> 예상 소요시간: {formatDuration(courseData.estimatedDuration)}
            </span>
          </div>
        </div>

        <div className="course-result-card__watermark">
          <span className="course-result-card__watermark-label">made with</span>
          <div className="course-result-card__watermark-brand">
            <img src={symbolW} alt="" />
            <img src={logoW} alt="TripPing" />
          </div>
        </div>
      </div>

      <p className="course-result-source">
        관광지 정보 및 이미지 출처: 한국관광공사
      </p>

      </div>
    </>
  );
}

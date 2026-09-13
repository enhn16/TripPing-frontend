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

export default function CourseResultView({ courseData, headerTitle }) {
  const navigate = useNavigate();
  const { cardRef, listRef, lineRect, saving, sharing, handleSaveImage, handleShareImage } =
    useCourseCapture(courseData);

  if (!courseData) return null;

  const tags = courseData.tags ?? [];
  const placeCount = courseData.places?.length ?? 0;

  return (
    <>
      {/* ── 상단 헤더: 좌(이동 그룹) / 우(액션 그룹) ── */}
      <header className="course-result-header">
        <div className="course-result-header__group">
          <button
            className="course-result-header__box course-result-header__back"
            onClick={() => navigate(-1)}
            aria-label="뒤로가기"
          >
            <ChevronLeft size={20} />
          </button>
          {headerTitle ? <span className="course-result-header__title">{headerTitle}</span> : <button
            className="course-result-header__box course-result-header__home"
            onClick={() => navigate('/select')}
            aria-label="홈으로"
          >
            <img src={symbolW} alt="" />
          </button>}
        </div>

        {!headerTitle && <div className="course-result-header__group">
          <button
            className="course-result-header__box course-result-header__action"
            onClick={handleSaveImage}
            disabled={saving}
            aria-label="이미지 저장"
          >
            <Download size={20} />
          </button>
          <button
            className="course-result-header__box course-result-header__action"
            onClick={handleShareImage}
            disabled={sharing}
            aria-label="공유하기"
          >
            <Share2 size={20} />
          </button>
        </div>}
      </header>

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
              <Clock size={17} /> 예상 소요시간: {courseData.estimatedDuration ?? '약 -시간'}
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

      {/* ── 하단 버튼 (완독 후 전환용) ── */}
      <div className="course-result-actions">
        <button
          className="course-result-actions__save"
          onClick={handleSaveImage}
          disabled={saving}
        >
          {saving ? '저장 중...' : '이미지 저장'}
        </button>
        <button
          className="course-result-actions__share"
          onClick={handleShareImage}
          disabled={sharing}
        >
          {sharing ? '공유 준비 중...' : '공유하기'}
        </button>
      </div>
    </>
  );
}

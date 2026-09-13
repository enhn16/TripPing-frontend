import './ArchiveCard.css';

/**
 * 보관함 전용 카드 컴포넌트입니다. 다른 목록형 화면(예: 코스 결과 카드)과는
 * 담기는 내용과 구조가 달라 공용 컴포넌트로 두지 않고 이 페이지 폴더에 co-locate 했습니다.
 *
 * 결과 화면이 아직 구현되지 않아 지도 이미지가 없는 경우 보여주는 임시 썸네일입니다.
 * 실제로는 결과 카드에서 생성된 지도 이미지를 mapImageUrl prop으로 그대로 전달받아 사용하면 됩니다.
 */
function MapPlaceholder() {
  return (
    <div className="archive-card__map archive-card__map--placeholder">
      <svg viewBox="0 0 40 40" width="20" height="20" fill="none">
        <path
          d="M20 4C13.9 4 9 8.9 9 15c0 8.3 11 20 11 20s11-11.7 11-20c0-6.1-4.9-11-11-11z"
          fill="var(--color-primary)"
          opacity="0.5"
        />
        <circle cx="20" cy="15" r="4" fill="#ffffff" />
      </svg>
    </div>
  );
}

/**
 * 보관함 목록에 표시되는 코스 카드 하나.
 *
 * @param {string|null} mapImageUrl - 코스 지도 이미지 URL. 없으면 플레이스홀더 표시.
 * @param {string} title - 코스 이름
 * @param {string[]} tags - 표시할 태그 목록 (호출하는 쪽에서 이미 앞 2개로 잘라서 전달)
 * @param {string} date - "2026.07.13." 형식의 생성 날짜 문자열
 * @param {() => void} onClick - 카드 클릭 시 상세 결과 화면으로 이동하는 핸들러
 */
export default function ArchiveCard({ mapImageUrl, title, tags, date, onClick }) {
  return (
    <button type="button" className="archive-card" onClick={onClick}>
      {mapImageUrl ? (
        <img src={mapImageUrl} alt="" className="archive-card__map" />
      ) : (
        <MapPlaceholder />
      )}

      <div className="archive-card__content">
        <p className="archive-card__title">{title}</p>
        <div className="archive-card__tags">
          {tags.map((tag) => (
            <span key={tag} className="archive-card__tag">
              {tag}
            </span>
          ))}
        </div>
        <p className="archive-card__date">{date}</p>
      </div>
    </button>
  );
}
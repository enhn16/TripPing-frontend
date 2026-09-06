// src/pages/storage/storage.jsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MobileLayout from '../../components/MobileLayout';
import ArchiveCard from './ArchiveCard';
import symbolImg from '../../assets/symbolW.png';
import './storage.css';
import { BookMarked } from 'lucide-react';
import { getSavedCourses } from './api'; // api.js의 함수 import

function formatDate(isoDate) {
  if (!isoDate) return '';
  const d = new Date(isoDate);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}.${mm}.${dd}.`;
}

export default function Storage({ courses: coursesOverride, onNavigateHome, onSelectCourse }) {
  const navigate = useNavigate();
  const [fetchedCourses, setFetchedCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (coursesOverride) {
      setLoading(false);
      return;
    }

    let ignore = false;

    async function loadCourses() {
      try {
        const data = await getSavedCourses();
        console.log('[보관함] 가져온 코스 목록:', data); // 응답 배열 확인용
        if (!ignore) {
          setFetchedCourses(data);
        }
      } catch (err) {
        console.error('[보관함] 목록 조회 실패:', err);
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    loadCourses();
    return () => {
      ignore = true;
    };
  }, [coursesOverride]);

  const courses = coursesOverride ?? fetchedCourses;

  // createdAt 또는 savedAt 기준 최신순 정렬
  const sortedCourses = [...courses].sort((a, b) => {
    const timeA = new Date(b.createdAt ?? b.savedAt ?? 0).getTime();
    const timeB = new Date(a.createdAt ?? a.savedAt ?? 0).getTime();
    return timeA - timeB;
  });

  const hasCourses = sortedCourses.length > 0;

  const handleHome = () => {
    if (onNavigateHome) {
      onNavigateHome();
      return;
    }
    navigate('/select');
  };

  const handleSelectCourse = (savedCourseId) => {
    if (onSelectCourse) {
      onSelectCourse(savedCourseId);
      return;
    }
    navigate(`/storage/${savedCourseId}`);
  };

  return (
    <MobileLayout background="linear-gradient(180deg, #ffffff 0%, var(--color-ground) 40%, var(--color-sub) 100%)">
      <div className="archive-page">
        <header className="archive-header">
          <div className="archive-header__text">
            <h1 className="archive-header__title"> 
              <BookMarked size={24} /> 
              <span>나의 여행 기록</span>
            </h1>
            <p className="archive-header__subtitle">
              {loading
                ? '기록을 불러오는 중...'
                : hasCourses
                ? '마음에 둔 여행, 열어볼까요?'
                : '새로운 기록을 남겨보세요.'}
            </p>
          </div>

          <button
            type="button"
            className="archive-header__home-button"
            onClick={handleHome}
            aria-label="홈으로 이동"
          >
            <img src={symbolImg} alt="" />
          </button>
        </header>

        <div className="archive-list-wrap">
          <div className="archive-list">
            {sortedCourses.map((course) => (
              <ArchiveCard
                key={course.savedCourseId}
                mapImageUrl={course.mapImageUrl}
                title={course.title}
                tags={(course.tags ?? []).slice(0, 2)}
                date={formatDate(course.createdAt)}
                onClick={() => handleSelectCourse(course.savedCourseId)}
              />
            ))}

            <div className="archive-list__placeholder" aria-hidden="true" />
          </div>

          <div className="archive-list__fade" aria-hidden="true" />
        </div>
      </div>
    </MobileLayout>
  );
}
// src/pages/storage/detail.jsx
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';

import MobileLayout from '../../components/MobileLayout';
import CourseResultView from '../../components/CourseResultView';
import { getSavedCourseDetail } from './api';

export default function StorageDetail() {
  const { savedCourseId } = useParams();
  return <SavedCourseDetail key={savedCourseId} savedCourseId={savedCourseId} />;
}

function SavedCourseDetail({ savedCourseId }) {
  const navigate = useNavigate();

  const [courseData, setCourseData] = useState(null);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    let ignore = false;

    // api.js의 getSavedCourseDetail 함수 호출
    getSavedCourseDetail(savedCourseId)
      .then((data) => {
        if (!ignore) setCourseData(data);
      })
      .catch((err) => {
        if (!ignore) setLoadError(err);
      });

    return () => {
      ignore = true;
    };
  }, [savedCourseId]);

  if (loadError) {
    return (
      <MobileLayout background="#F5F7F8">
        <header className="course-result-header">
          <div className="course-result-header__group">
            <button
              className="course-result-header__box course-result-header__back"
              onClick={() => navigate(-1)}
              aria-label="뒤로가기"
            >
              <ChevronLeft size={20} />
            </button>
          </div>
        </header>
        <p role="alert" style={{ padding: '24px', textAlign: 'center' }}>
          {loadError.status === 404
            ? '저장된 코스가 만료되었거나 삭제되었습니다.'
            : loadError.message || '코스를 불러오지 못했어요. 다시 시도해 주세요.'}
        </p>
      </MobileLayout>
    );
  }

  // 데이터 로딩 중
  if (!courseData) return (
    <MobileLayout background="#F5F7F8">
      <p role="status" style={{ padding: '24px', textAlign: 'center' }}>저장된 코스를 불러오는 중이에요.</p>
    </MobileLayout>
  );

  const savedDate = courseData.createdAt?.slice(0, 10).replaceAll('-', '.');

  return (
    <MobileLayout background="#F5F7F8">
      <CourseResultView courseData={courseData} headerTitle={savedDate ? `${savedDate}. 의 기록` : '저장된 여행 기록'} />
    </MobileLayout>
  );
}

// src/pages/result/result.jsx
// 코스 생성 직후 화면. 이 파일이 하는 일은 "데이터를 어디서 구할지"(location.state)와
// "데이터가 없으면 어디로 보낼지"(redirect) 뿐이고, 헤더/카드/저장·공유 버튼은
// storage/detail.jsx와 공유하는 components/CourseResultView가 그림.
import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import WebLayout from '../../components/WebLayout';
import CourseResultView from '../../components/CourseResultView';
import { saveStepState, loadStepState } from '../../components/sessionState';

export default function Result() {
  const location = useLocation();
  const navigate = useNavigate();

  const savedState = loadStepState();
  const courseData = location.state?.result ?? savedState?.result;

  useEffect(() => {
    if (location.state?.result) {
      saveStepState(location.state);
    }
  }, [location.state]);

  useEffect(() => {
    if (!courseData) {
      navigate('/select', { replace: true });
    }
  }, [courseData, navigate]);

  if (!courseData) return null;

  return (
    <WebLayout background="#F5F7F8">
      <CourseResultView courseData={courseData} />
    </WebLayout>
  );
}
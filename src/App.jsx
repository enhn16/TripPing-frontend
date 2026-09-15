import { Routes, Route, Navigate, useLocation } from 'react-router-dom';

import Landing from './pages/Landing/Landing';
import ThreeSelect from './pages/ThreeSelect/ThreeSelect';
import ConditionInput from './pages/ConditionInput/ConditionInput';
import LoadingScreen from './pages/loading/loading';
import MainSpots from './pages/MainSpots/MainSpots';
import ExpandSelection from './pages/expansion/ExpandSelection';
import Result from './pages/result/result';
import Storage from './pages/storage/storage';
import StorageDetail from './pages/storage/detail';

// Intermediate recommendation pages require the previous step's response.
function TripStep({ field, children }) {
  const { state } = useLocation();
  return state?.[field] ? children : <Navigate to="/select" replace />;
}

// 화면 연결 순서:
// landing -> threeselect -> condition input -> loading -> mainspot
//   -> loading -> expansion -> loading -> result
// (threeselect 상단 버튼 -> storage)
function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Navigate to="/" replace />} />
      <Route path="/select" element={<ThreeSelect />} />
      <Route path="/condition" element={<ConditionInput />} />

      {/* 세 구간(condition->spots, spots->expansion, expansion->result)에서
          모두 이 하나의 로딩 화면을 공유해서 사용합니다.
          이전 화면이 navigate('/loading', { state: { next: { path, state } } }) 형태로
          "로딩이 끝나면 어디로, 무슨 데이터를 들고 갈지"를 넘겨줍니다. */}
      <Route path="/loading" element={<LoadingScreen />} />

      <Route path="/spots" element={<TripStep field="spots"><MainSpots /></TripStep>} />
      <Route path="/expansion" element={<TripStep field="mainSpot"><ExpandSelection /></TripStep>} />
      <Route path="/result" element={<Result />} />

      {/* threeselect 상단 보관함 버튼 진입점 */}
      <Route path="/storage" element={<Storage />} />
      <Route path="/storage/:savedCourseId" element={<StorageDetail />} />

      {/* 정의되지 않은 경로는 랜딩으로 */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;

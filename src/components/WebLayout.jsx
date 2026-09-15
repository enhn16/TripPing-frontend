import { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import ConfirmModal from './ConfirmModal';
import { isLoggedIn, startKakaoLogin } from './auth';
import logo from '../assets/logo.png';
import './WebLayout.css';

export default function WebLayout({ children, background }) {
  const navigate = useNavigate();
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return (
    <>
      <a className="skip-link" href="#main-content">본문으로 건너뛰기</a>
      <header className="site-header">
        <Link to="/" aria-label="TripPing 홈"><img src={logo} alt="TripPing" /></Link>
        <nav aria-label="주요 메뉴">
          <button type="button" onClick={() => {
            if (isLoggedIn()) navigate('/storage');
            else setShowLoginPrompt(true);
          }}>보관함</button>
        </nav>
      </header>
      <main id="main-content" className="web-layout" style={background ? { background } : undefined}>
        {children}
      </main>
      <ConfirmModal open={showLoginPrompt} title="로그인이 필요해요"
        message={'지금은 기록을 남길 수 없습니다.\n간단한 로그인 후 함께해보세요!'}
        confirmLabel="카카오 로그인" confirmVariant="kakao" cancelLabel="다음에 할게요"
        onCancel={() => setShowLoginPrompt(false)}
        onConfirm={() => { setShowLoginPrompt(false); startKakaoLogin(); }} />
    </>
  );
}

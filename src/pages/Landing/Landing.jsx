import { useState } from 'react';
import KakaoIcon from '../../components/KakaoIcon';
import { Link } from 'react-router-dom';
import { startKakaoLogin, isLoggedIn, logout } from '../../components/auth';
import WebLayout from '../../components/WebLayout';
import natureImg from '../../assets/nature.jpg';
import './Landing.css';

export default function Landing() {
  const [loggedIn, setLoggedIn] = useState(() => isLoggedIn());

  const handleLogout = () => {
    logout();
    setLoggedIn(false);
  };

  return (
    <WebLayout>
      <section className="landing">
        <div className="landing__copy">
          <p className="landing__eyebrow">나에게 맞는 하루 여행, TripPing</p>
          <h1>어디로 떠날까?<br />오늘의 여행을<br /><span>함께 그려봐요.</span></h1>
          <p className="landing__description">가고 싶은 곳과 함께할 사람을 알려주세요.<br />당신의 취향에 맞는 당일치기 코스를 찾아드려요.</p>
          <div className="landing__actions">
            {loggedIn ? (
              <>
                <Link className="landing__start" to="/select">계속해서 기록 남기기</Link>
                <button type="button" className="landing__logout" onClick={handleLogout}>로그아웃</button>
              </>
            ) : (
              <>
                <Link className="landing__start" to="/select">로그인 없이 사용하기</Link>
                <button type="button" className="landing__login" onClick={startKakaoLogin}><KakaoIcon />카카오 로그인</button>
              </>
            )}
          </div>
          {!loggedIn && <p className="landing__note">로그인 없이도 여행을 계획할 수 있어요.</p>}
        </div>
        <div className="landing__visual">
          <img src={natureImg} alt="초록빛 자연 속에서 즐기는 여유로운 하루 여행" />
          <div className="landing__caption">멀리 가지 않아도,<br /><strong>특별한 하루.</strong></div>
        </div>
      </section>
      <section className="landing__steps" aria-label="여행 코스 만드는 방법">
        <div><span>01</span><h2>취향을 알려주세요</h2><p>여행 스타일과 동행자, 가고 싶은 지역을 선택해요.</p></div>
        <div><span>02</span><h2>마음에 드는 곳을 골라요</h2><p>추천 관광지를 중심으로 명소와 맛집을 더해요.</p></div>
        <div><span>03</span><h2>나만의 코스를 완성해요</h2><p>여행 카드를 이미지로 저장하고 함께 나눠요.</p></div>
      </section>
    </WebLayout>
  );
}

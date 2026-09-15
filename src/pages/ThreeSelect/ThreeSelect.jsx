import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import WebLayout from '../../components/WebLayout';
import {
  getUserName,
  formatDisplayName,
  isLoggedIn,
  logout,
  handleKakaoRedirect,
} from '../../components/auth';
import symbol from '../../assets/symbol.png';
import natureImg from '../../assets/nature.jpg';
import cityImg from '../../assets/city.jpg';
import complexImg from '../../assets/complex.jpg';
import './ThreeSelect.css';

const CATEGORIES = [
  { key: 'nature', title: '자연', subtitle: '산, 숲, 계곡, 힐링', image: natureImg },
  { key: 'city', title: '도시', subtitle: '쇼핑, 카페, 맛집, 문화', image: cityImg },
  { key: 'complex', title: '복합', subtitle: '자연+도시, 둘 다 즐기기', image: complexImg },
];

export default function ThreeSelect() {
  const navigate = useNavigate();
  // isLoggedIn/getUserName은 localStorage를 읽는 함수라 그 자체로는 리렌더를 안 일으킴.
  // 카카오 로그인 리다이렉트 처리가 끝난 뒤 화면을 갱신시키기 위한 트리거용 상태.
  const [, setAuthTick] = useState(0);
  const loggedIn = isLoggedIn();
  // 카카오 로그인 닉네임이 있으면 그 이름, 비회원이면 '여행자'
  const displayName = formatDisplayName(getUserName());
  // /select는 카카오 로그인 Redirect URI. 카카오에서 ?code=...를 달고 돌아온 경우에만
  // 백엔드로 로그인 처리를 위임하고, 평소 방문(코드 없음)일 땐 아무 일도 안 일어남.
  useEffect(() => {
    handleKakaoRedirect()
      .then((handled) => {
        if (handled) setAuthTick((v) => v + 1); // 로그인 성공 -> loggedIn/displayName 다시 계산되도록 리렌더
      })
      .catch((err) => {
        // TODO: 토스트/모달 등 디자인이 정해지면 alert 대신 그걸로 교체
        console.error('카카오 로그인 실패:', err);
        alert(err.message || '카카오 로그인에 실패했습니다.');
      });
  }, []);

  const handleLogout = () => {
    logout();
    // getAuthToken() 기반으로 loggedIn을 매 렌더마다 다시 계산하는 구조라, 로그아웃 후
    // 화면이 확실히 갱신되도록 시작페이지로 이동시킴
    navigate('/');
  };

  const handleSelectCategory = (categoryKey) => {
    // TODO: 여행 조건 입력 화면 라우트 연결
    navigate('/condition', { state: { category: categoryKey } });
  };

  return (
    <WebLayout>
      <div className="three-select">
        {loggedIn && <div className="three-select__topbar">
          <button type="button" className="three-select__back-btn" onClick={handleLogout} aria-label="로그아웃"><LogOut size={18} /></button>
        </div>}

        <div className="three-select__hero">
          <img src={symbol} alt="" className="three-select__symbol" />
          <p className="three-select__greeting">
            안녕하세요, {displayName} 님.
            <br />
            어디로 떠나고 싶으신가요?
          </p>
        </div>

        <div className="three-select__cards">
          {CATEGORIES.map((category) => (
            <button
              key={category.key}
              type="button"
              className="select-card"
              onClick={() => handleSelectCategory(category.key)}
            >
              <img src={category.image} alt={category.title} />
              <div className="select-card__overlay" />
              <div className="select-card__text">
                <p className="select-card__title">{category.title}</p>
                <p className="select-card__subtitle">{category.subtitle}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

    </WebLayout>
  );
}
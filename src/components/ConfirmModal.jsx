import './ConfirmModal.css'
import KakaoIcon from './KakaoIcon'

/**
 * 화면 이동 없이 바로 띄우는 확인 팝업.
 * 지금은 "로그인 필요" 안내용으로 쓰지만, 확인/취소가 필요한 다른 상황에도 재사용 가능하게
 * 범용으로 만들어둠.
 *
 * @param {'default'|'kakao'} [confirmVariant] - 'kakao'면 확인 버튼이 Login.jsx의 카카오
 *   로그인 버튼과 동일한 색(--color-kakao)을 씀. 확인 동작이 실제로 카카오 로그인을 트리거할 때만 사용.
 */
export default function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = '확인',
  cancelLabel = '취소',
  confirmVariant = 'default',
  onConfirm,
  onCancel,
}) {
  if (!open) return null

  return (
    <div className="confirm-modal__backdrop" onClick={onCancel}>
      <div role="dialog" aria-modal="true" aria-label={title} className="confirm-modal__card" onClick={(e) => e.stopPropagation()}>
        {title && <h2 className="confirm-modal__title">{title}</h2>}
        {message && <p className="confirm-modal__message">{message}</p>}
        <div className="confirm-modal__actions">
          <button
            type="button"
            className="confirm-modal__btn confirm-modal__btn--cancel"
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`confirm-modal__btn ${
              confirmVariant === 'kakao' ? 'confirm-modal__btn--kakao' : 'confirm-modal__btn--confirm'
            }`}
            onClick={onConfirm}
          >
            {confirmVariant === 'kakao' && <KakaoIcon />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
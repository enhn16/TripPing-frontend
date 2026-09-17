import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import * as htmlToImage from 'html-to-image';

function downloadImage(dataUrl, fileName) {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

export function useCourseCapture(courseData) {
  const courseId = courseData?.courseId ?? 'course';
  const courseTitle = courseData?.courseTitle ?? '나의 여행 코스';
  const busyRef = useRef(false);
  const cardRef = useRef(null);
  const listRef = useRef(null);

  const [lineRect, setLineRect] = useState({ top: 0, height: 0 });
  const [saving, setSaving] = useState(false);
  const [sharing, setSharing] = useState(false);

  // 첫 핀 중심 ~ 마지막 핀 중심까지의 점선 위치를 실제 DOM 기준으로 측정
  const measureLine = useCallback(() => {
    const listEl = listRef.current;
    if (!listEl) return { top: 0, height: 0 };

    const pins = listEl.querySelectorAll('.course-result-card__place-pin');
    if (pins.length < 2) return { top: 0, height: 0 };

    const listTop = listEl.getBoundingClientRect().top;
    const firstPinRect = pins[0].getBoundingClientRect();
    const lastPinRect = pins[pins.length - 1].getBoundingClientRect();
    const top = firstPinRect.top + firstPinRect.height / 2 - listTop;
    const bottom = lastPinRect.top + lastPinRect.height / 2 - listTop;
    return { top, height: Math.max(bottom - top, 0) };
  }, []);

  useLayoutEffect(() => {
    const listEl = listRef.current;
    if (!listEl) return;

    setLineRect(measureLine());

    const resizeObserver = new ResizeObserver(() => setLineRect(measureLine()));
    resizeObserver.observe(listEl);

    return () => resizeObserver.disconnect();
  }, [courseData?.places, measureLine]);

  // ---------- 이미지 캡처 (html-to-image 적용) ----------
  const captureCard = useCallback(async () => {
    const cardEl = cardRef.current;
    const listEl = listRef.current;
    if (!cardEl || !listEl) throw new Error('저장할 카드가 없습니다.');
    const prevMaxHeight = listEl.style.maxHeight;
    const prevOverflow = listEl.style.overflowY;

    const thumbEls = Array.from(cardEl.querySelectorAll('.course-result-card__place-thumb'));
    const prevThumbBackgrounds = thumbEls.map((el) => el.style.backgroundImage);
    thumbEls.forEach((el) => {
      el.style.backgroundImage = 'none';
    });

    cardEl.classList.add('is-capturing');
    listEl.style.maxHeight = 'none';
    listEl.style.overflowY = 'visible';

    flushSync(() => {
      setLineRect(measureLine());
    });

    if (document.fonts?.ready) {
      await document.fonts.ready;
    }
    await new Promise((resolve) => requestAnimationFrame(resolve));

    let dataUrl;
    try {
      // 픽셀 레티나 배율 적용 (pixelRatio: 2)
      dataUrl = await htmlToImage.toPng(cardEl, {
        pixelRatio: 2,
        cacheBust: true,
        width: cardEl.offsetWidth,
        height: cardEl.offsetHeight,
        style: {
          margin: '0',
          transform: 'none',
        },
      });
    } catch (e) {
      console.error('Capture error, retrying once...', e);
      dataUrl = await htmlToImage.toPng(cardEl, {
        pixelRatio: 2,
        cacheBust: true,
        width: cardEl.offsetWidth,
        height: cardEl.offsetHeight,
        style: {
          margin: '0',
          transform: 'none',
        },
      });
    } finally {
      cardEl.classList.remove('is-capturing');
      listEl.style.maxHeight = prevMaxHeight;
      listEl.style.overflowY = prevOverflow;
      thumbEls.forEach((el, i) => {
        el.style.backgroundImage = prevThumbBackgrounds[i];
      });
      setLineRect(measureLine());
    }

    return dataUrl;
  }, [measureLine]);

  // ---------- 브라우저 다운로드 ----------
  const handleSaveImage = useCallback(async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    setSaving(true);
    try {
      const dataUrl = await captureCard();
      downloadImage(dataUrl, `tripping_${courseId}.png`);
    } catch (err) {
      console.error(err);
      alert('이미지 저장에 실패했어요. 다시 시도해주세요.');
    } finally {
      busyRef.current = false;
      setSaving(false);
    }
  }, [captureCard, courseId]);

  // ---------- 이미지 파일 공유 (Web Share API) ----------
  const handleShareImage = useCallback(async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    setSharing(true);
    try {
      const dataUrl = await captureCard();
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const fileName = `tripping_${courseId}.png`;
      const file = new File([blob], fileName, { type: 'image/png' });

      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({
            title: courseTitle,
            files: [file],
          });
        } catch (shareErr) {
          if (shareErr?.name === 'AbortError') return;
          // 공유 권한 오류 또는 취소 시 다운로드로 fallback
          downloadImage(dataUrl, fileName);
          alert('이 브라우저에서는 바로 공유할 수 없어 이미지를 다운로드했어요.');
        }
      } else {
        downloadImage(dataUrl, fileName);
        alert('공유할 수 있도록 여행 카드 이미지를 다운로드했어요.');
      }
    } catch (err) {
      if (err?.name !== 'AbortError') {
        console.error(err);
        alert('이미지 공유에 실패했어요. 다시 시도해주세요.');
      }
    } finally {
      busyRef.current = false;
      setSharing(false);
    }
  }, [captureCard, courseId, courseTitle]);

  return {
    cardRef,
    listRef,
    lineRect,
    saving,
    sharing,
    handleSaveImage,
    handleShareImage,
  };
}
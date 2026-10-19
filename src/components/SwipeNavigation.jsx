import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const pages = ["/", "/liga", "/equipos", "/estadisticas"];
const MIN_DISTANCE = 75;
const MAX_VERTICAL_DISTANCE = 65;
const MAX_DURATION = 650;

function isInteractive(target) {
  return target instanceof Element && Boolean(
    target.closest('button, a, input, textarea, select, [role="dialog"], [aria-modal="true"], [data-no-swipe], [contenteditable="true"], .modal, .popup, .swiper, .carousel')
  );
}

function hasHorizontalScroll(target) {
  let node = target instanceof Element ? target : null;
  while (node && node !== document.body) {
    if (node.scrollWidth > node.clientWidth + 8) {
      const overflow = getComputedStyle(node).overflowX;
      if (overflow === "auto" || overflow === "scroll") return true;
    }
    node = node.parentElement;
  }
  return false;
}

export default function SwipeNavigation() {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!window.matchMedia("(pointer: coarse)").matches) return;

    let start = null;

    function onStart(event) {
      if (event.touches.length !== 1 || isInteractive(event.target) || hasHorizontalScroll(event.target)) {
        start = null;
        return;
      }
      start = { x: event.touches[0].clientX, y: event.touches[0].clientY, time: Date.now() };
    }

    function onEnd(event) {
      if (!start || event.changedTouches.length !== 1) return;
      const dx = event.changedTouches[0].clientX - start.x;
      const dy = event.changedTouches[0].clientY - start.y;
      const elapsed = Date.now() - start.time;
      start = null;

      if (Math.abs(dx) < MIN_DISTANCE || Math.abs(dy) > MAX_VERTICAL_DISTANCE ||
          Math.abs(dx) < Math.abs(dy) * 1.5 || elapsed > MAX_DURATION) return;
      if (document.querySelector('[role="dialog"], [aria-modal="true"], .modal, .popup')) return;

      const index = pages.indexOf(pathname);
      if (index < 0) return;
      const nextIndex = index + (dx < 0 ? 1 : -1);
      if (nextIndex >= 0 && nextIndex < pages.length) navigate(pages[nextIndex]);
    }

    function onCancel() { start = null; }

    document.addEventListener("touchstart", onStart, { passive: true });
    document.addEventListener("touchend", onEnd, { passive: true });
    document.addEventListener("touchcancel", onCancel, { passive: true });
    return () => {
      document.removeEventListener("touchstart", onStart);
      document.removeEventListener("touchend", onEnd);
      document.removeEventListener("touchcancel", onCancel);
    };
  }, [pathname, navigate]);

  return null;
}

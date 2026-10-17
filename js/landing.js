/* =========================================================
   Hello_Archive Landing — landing.js  (Phase 3: 인터랙션)
   1) 모바일 메뉴: 링크를 누르면 메뉴를 닫은 뒤 해당 섹션으로 이동, Esc로 닫기
   2) 헤더: 스크롤하면 아래쪽 그림자 표시
   3) 메뉴: 지금 보고 있는 섹션의 메뉴 항목 표시
   4) 스크롤 등장 효과: 질문·단계·이야기 카드·타임라인이 순서대로 나타남
   5) 기록 성장 타임라인: 스크롤에 따라 1주 → 1년 단계가 차례로 채워짐
   6) 신청 버튼 클릭 기록: 분석 도구가 있을 때만 어느 위치의 버튼이 눌렸는지 전송

   원칙
   - JavaScript가 꺼져 있거나 오류가 나도 모든 콘텐츠는 그대로 보입니다.
     (숨김 스타일은 이 파일이 html 태그에 클래스를 붙인 뒤에만 적용됩니다)
   - 운영체제의 '동작 줄이기' 설정을 켠 사용자에게는 움직임을 적용하지 않습니다.
   ========================================================= */
(function () {
  'use strict';

  var root = document.documentElement;
  var reduceMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  var desktopQuery = window.matchMedia('(min-width: 768px)');

  function prefersReducedMotion() {
    return reduceMotionQuery.matches;
  }

  /* 화면 갱신을 한 프레임에 한 번으로 묶어 스크롤 성능을 지킵니다 */
  function onScrollFrame(callback) {
    var queued = false;
    function run() {
      queued = false;
      callback();
    }
    function schedule() {
      if (!queued) {
        queued = true;
        window.requestAnimationFrame(run);
      }
    }
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    callback();
  }

  /* 섹션으로 이동 후 키보드 포커스도 그 섹션으로 옮깁니다 */
  function moveTo(target) {
    target.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
    if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
  }

  /* ---------- 1. 모바일 메뉴 ---------- */
  function initMobileMenu() {
    var menu = document.getElementById('mainNav');
    var toggler = document.querySelector('.navbar-toggler');
    if (!menu || !toggler || !window.bootstrap || !window.bootstrap.Collapse) return;

    var collapse = window.bootstrap.Collapse.getOrCreateInstance(menu, { toggle: false });

    menu.addEventListener('shown.bs.collapse', function () {
      toggler.setAttribute('aria-label', '메뉴 닫기');
    });
    menu.addEventListener('hidden.bs.collapse', function () {
      toggler.setAttribute('aria-label', '메뉴 열기');
    });

    /* 메뉴가 열린 상태(모바일)에서 링크를 누르면:
       메뉴를 먼저 닫고, 닫힌 뒤 이동해야 위치가 어긋나지 않습니다 */
    menu.addEventListener('click', function (event) {
      var link = event.target.closest('a[href^="#"]');
      if (!link || !menu.classList.contains('show')) return;

      var target = document.querySelector(link.getAttribute('href'));
      if (!target) return;

      event.preventDefault();
      menu.addEventListener('hidden.bs.collapse', function handleHidden() {
        menu.removeEventListener('hidden.bs.collapse', handleHidden);
        if (history.pushState) history.pushState(null, '', link.getAttribute('href'));
        moveTo(target);
      });
      collapse.hide();
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && menu.classList.contains('show')) {
        collapse.hide();
        toggler.focus();
      }
    });
  }

  /* ---------- 2. 헤더 그림자 ---------- */
  function initHeaderShadow() {
    var header = document.querySelector('.site-header');
    if (!header) return;
    onScrollFrame(function () {
      header.classList.toggle('is-scrolled', window.scrollY > 8);
    });
  }

  /* ---------- 3. 지금 보고 있는 섹션의 메뉴 표시 ---------- */
  function initCurrentNav() {
    var links = Array.prototype.slice.call(document.querySelectorAll('#mainNav .nav-link[href^="#"]'));
    var pairs = links
      .map(function (link) {
        return { link: link, section: document.querySelector(link.getAttribute('href')) };
      })
      .filter(function (pair) { return pair.section; });
    if (!pairs.length) return;

    onScrollFrame(function () {
      var line = window.innerHeight * 0.4;   /* 화면 위에서 40% 지점을 지나는 섹션 */
      pairs.forEach(function (pair) {
        var rect = pair.section.getBoundingClientRect();
        var isCurrent = rect.top <= line && rect.bottom > line;
        pair.link.classList.toggle('is-current', isCurrent);
        if (isCurrent) pair.link.setAttribute('aria-current', 'true');
        else pair.link.removeAttribute('aria-current');
      });
    });
  }

  /* ---------- 4. 스크롤 등장 효과 ---------- */
  function initReveal() {
    var targets = Array.prototype.slice.call(document.querySelectorAll('[data-reveal]'));
    if (!targets.length || !('IntersectionObserver' in window) || prefersReducedMotion()) return;

    /* 묶음 안의 항목에 순서 번호를 매겨 차례로 나타나게 합니다 */
    targets.forEach(function (group) {
      if (group.getAttribute('data-reveal') !== 'stagger') return;
      Array.prototype.forEach.call(group.children, function (child, index) {
        child.style.setProperty('--reveal-i', index);
      });
    });

    /* 처음부터 화면 안에 있는 요소는 숨기지 않습니다(깜빡임 방지) */
    var viewportHeight = window.innerHeight;
    var pending = targets.filter(function (el) {
      var rect = el.getBoundingClientRect();
      var alreadyVisible = rect.top < viewportHeight && rect.bottom > 0;
      if (alreadyVisible) el.classList.add('is-visible');
      return !alreadyVisible;
    });

    root.classList.add('has-reveal');

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.12 });

    pending.forEach(function (el) { observer.observe(el); });

    /* 사용 중에 '동작 줄이기'를 켜거나, 인쇄할 때는 모두 바로 보여줍니다 */
    function revealAll() {
      targets.forEach(function (el) { el.classList.add('is-visible'); });
      observer.disconnect();
    }
    if (reduceMotionQuery.addEventListener) {
      reduceMotionQuery.addEventListener('change', function (e) { if (e.matches) revealAll(); });
    }
    window.addEventListener('beforeprint', revealAll);
  }

  /* ---------- 5. 기록 성장 타임라인 ---------- */
  function initTimeline() {
    var timeline = document.querySelector('.timeline');
    if (!timeline || prefersReducedMotion()) return;
    var items = Array.prototype.slice.call(timeline.querySelectorAll('.timeline__item'));
    if (!items.length) return;

    timeline.classList.add('timeline--live');

    onScrollFrame(function () {
      var vh = window.innerHeight;
      var reached = 0;

      if (desktopQuery.matches) {
        /* 가로 배치: 타임라인이 화면 아래 80% → 30% 지점까지 올라오는 동안 선이 채워짐 */
        var rect = timeline.getBoundingClientRect();
        var start = vh * 0.8;
        var end = vh * 0.3;
        var progress = Math.min(1, Math.max(0, (start - rect.top) / (start - end)));
        timeline.style.setProperty('--progress', progress.toFixed(3));
        reached = progress > 0 ? Math.min(items.length, Math.ceil(progress * items.length)) : 0;
      } else {
        /* 세로 배치: 각 단계가 화면 65% 지점을 지나면 채워짐 */
        items.forEach(function (item) {
          if (item.getBoundingClientRect().top < vh * 0.65) reached += 1;
        });
        timeline.style.setProperty('--progress', reached / items.length);
      }

      items.forEach(function (item, index) {
        item.classList.toggle('is-reached', index < reached);
        item.classList.toggle('is-current', index === reached - 1);
      });
    });
  }

  /* ---------- 6. 신청 버튼 클릭 기록 ----------
     버튼마다 붙은 data-cta(header, hero, mid-preview, mid-privacy, final)를 방문 분석 도구로 보냅니다.
     분석 도구(Google Analytics, Plausible 등) 스크립트를 <head>에 추가하기 전에는 아무 일도 하지 않습니다. */
  function initCtaTracking() {
    document.addEventListener('click', function (event) {
      var button = event.target.closest('[data-cta]');
      if (!button) return;
      var place = button.getAttribute('data-cta');
      try {
        if (typeof window.gtag === 'function') window.gtag('event', 'signup_click', { cta_place: place });
        if (typeof window.plausible === 'function') window.plausible('signup_click', { props: { place: place } });
      } catch (error) { /* 분석 도구 오류가 페이지 동작을 막지 않도록 무시 */ }
    });
  }

  function init() {
    initCtaTracking();
    initMobileMenu();
    initHeaderShadow();
    initCurrentNav();
    initReveal();
    initTimeline();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

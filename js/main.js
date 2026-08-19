/* ===============================================================
   STRATA — interactions
   Vanilla JS · no libraries · performance-first
================================================================ */
(function () {
  'use strict';
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var isMobile = window.matchMedia('(max-width: 767px)').matches;

  /* ---------- Header scroll state ---------- */
  var header = document.getElementById('header');
  var onScrollHeader = function () {
    if (window.scrollY > 40) header.classList.add('scrolled');
    else header.classList.remove('scrolled');
  };
  onScrollHeader();
  window.addEventListener('scroll', onScrollHeader, { passive: true });

  /* ---------- Mobile menu ---------- */
  var burger = document.getElementById('burger');
  var mobileMenu = document.getElementById('mobileMenu');
  var toggleMenu = function (open) {
    var willOpen = open !== undefined ? open : !mobileMenu.classList.contains('open');
    mobileMenu.classList.toggle('open', willOpen);
    burger.classList.toggle('open', willOpen);
    burger.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
    document.body.style.overflow = willOpen ? 'hidden' : '';
  };
  burger.addEventListener('click', function () { toggleMenu(); });
  mobileMenu.querySelectorAll('a').forEach(function (a) {
    a.addEventListener('click', function () { toggleMenu(false); });
  });

  /* ===============================================================
     VIDEO — source selection, robust loop, viewport play/pause
  ================================================================ */
  function pickSource(video) {
    var mobileSrc = video.getAttribute('data-mobile');
    var desktopSrc = video.getAttribute('data-desktop');
    var nowMobile = window.matchMedia('(max-width: 767px)').matches; // recompute live
    var use = (nowMobile && mobileSrc) ? mobileSrc : (desktopSrc || mobileSrc);
    if (use && video.getAttribute('data-current') !== use) {
      video.setAttribute('data-current', use);
      video.src = use;
      video.load();
    }
  }

  function safePlay(video) {
    var p = video.play();
    if (p && typeof p.catch === 'function') {
      p.catch(function () { /* autoplay may be blocked until interaction; ignore */ });
    }
  }

  function initVideo(video) {
    // Force seamless restart even if 'loop' is ever dropped by the browser.
    video.addEventListener('ended', function () {
      try { video.currentTime = 0; } catch (e) {}
      safePlay(video);
    });
    // If playback stalls, nudge it back to life.
    video.addEventListener('stalled', function () { safePlay(video); });
    video.addEventListener('canplay', function () {
      if (video.dataset.inview === '1') safePlay(video);
    });
  }

  var heroVideo = document.querySelector('.hero .bgvideo');
  if (heroVideo) {
    initVideo(heroVideo);
    pickSource(heroVideo);          // load hero immediately
    heroVideo.dataset.inview = '1';
    safePlay(heroVideo);
  }

  var lazyVideos = Array.prototype.slice.call(document.querySelectorAll('.lazyvid'));
  lazyVideos.forEach(initVideo);

  // Play only what's on screen — keeps mobile scrolling smooth.
  if ('IntersectionObserver' in window) {
    var vio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        var v = en.target;
        if (en.isIntersecting) {
          v.dataset.inview = '1';
          if (!v.getAttribute('data-current')) pickSource(v); // lazy-load when near
          safePlay(v);
        } else {
          v.dataset.inview = '0';
          if (!v.paused) v.pause();
        }
      });
    }, { threshold: 0.15, rootMargin: '200px 0px' });

    if (heroVideo) vio.observe(heroVideo);
    lazyVideos.forEach(function (v) { vio.observe(v); });
  } else {
    // Fallback: just load & play everything.
    lazyVideos.forEach(function (v) { pickSource(v); v.dataset.inview = '1'; safePlay(v); });
  }

  // Re-evaluate source on breakpoint change (desktop <-> mobile).
  var mq = window.matchMedia('(max-width: 767px)');
  var onMq = function () {
    isMobile = mq.matches;
    [heroVideo].concat(lazyVideos).forEach(function (v) {
      if (v && v.getAttribute('data-current')) pickSource(v);
    });
  };
  if (mq.addEventListener) mq.addEventListener('change', onMq);
  else if (mq.addListener) mq.addListener(onMq);

  // Resume playback when tab becomes visible again.
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) {
      [heroVideo].concat(lazyVideos).forEach(function (v) {
        if (v && v.dataset.inview === '1') safePlay(v);
      });
    }
  });

  /* ===============================================================
     SCROLL REVEAL
  ================================================================ */
  var revealEls = document.querySelectorAll('.reveal, .reveal-img');
  if (reduceMotion || !('IntersectionObserver' in window)) {
    revealEls.forEach(function (el) { el.classList.add('in'); });
  } else {
    var rio = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in'); obs.unobserve(en.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    revealEls.forEach(function (el) { rio.observe(el); });

    // Failsafe: never leave content permanently hidden. If the observer
    // hasn't revealed the above-the-fold items shortly after load, reveal all.
    setTimeout(function () {
      var anyIn = document.querySelector('.reveal.in, .reveal-img.in');
      if (!anyIn) { revealEls.forEach(function (el) { el.classList.add('in'); }); }
    }, 2600);
  }

  /* ===============================================================
     SUBTLE PARALLAX (desktop, motion-allowed only)
  ================================================================ */
  if (!reduceMotion && window.innerWidth >= 900) {
    var parallaxNodes = Array.prototype.slice.call(document.querySelectorAll('.band-media, .hero-media'));
    var ticking = false;
    var applyParallax = function () {
      parallaxNodes.forEach(function (node) {
        var rect = node.parentElement.getBoundingClientRect();
        if (rect.bottom < -100 || rect.top > window.innerHeight + 100) return;
        var offset = (rect.top - window.innerHeight / 2) * -0.05;
        node.style.transform = 'translate3d(0,' + offset.toFixed(1) + 'px,0) scale(1.08)';
      });
      ticking = false;
    };
    window.addEventListener('scroll', function () {
      if (!ticking) { window.requestAnimationFrame(applyParallax); ticking = true; }
    }, { passive: true });
    applyParallax();
  }

  /* ===============================================================
     SAVE / "ADD TO LIST" FEATURE
  ================================================================ */
  var STORE_KEY = 'strata_saved_v1';
  var saved = [];
  try { saved = JSON.parse(localStorage.getItem(STORE_KEY)) || []; } catch (e) { saved = []; }

  var savedCountEl = document.getElementById('savedCount');
  var savedChip = document.getElementById('savedChip');
  var drawer = document.getElementById('drawer');
  var drawerOverlay = document.getElementById('drawerOverlay');
  var drawerBody = document.getElementById('drawerBody');
  var drawerClose = document.getElementById('drawerClose');
  var toast = document.getElementById('toast');
  var toastText = document.getElementById('toastText');
  var savedNote = document.getElementById('savedNote');
  var toastTimer;

  function persist() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(saved)); } catch (e) {}
  }
  function isSaved(id) { return saved.some(function (s) { return s.id === id; }); }

  function showToast(msg) {
    toastText.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.classList.remove('show'); }, 2200);
  }

  function decodeEntities(str) {
    var t = document.createElement('textarea'); t.innerHTML = str; return t.value;
  }

  function updateCount() {
    savedCountEl.textContent = saved.length;
    savedChip.classList.toggle('has', saved.length > 0);
    if (savedNote) {
      if (saved.length > 0) {
        savedNote.classList.add('show');
        savedNote.textContent = '★ ' + saved.length + ' item' + (saved.length > 1 ? 's' : '') + ' from your list will be included.';
      } else {
        savedNote.classList.remove('show');
      }
    }
  }

  function syncButtons() {
    document.querySelectorAll('[data-id]').forEach(function (card) {
      var id = card.getAttribute('data-id');
      var btn = card.querySelector('.js-save');
      if (!btn) return;
      var on = isSaved(id);
      btn.classList.toggle('saved', on);
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  }

  function renderDrawer() {
    if (saved.length === 0) {
      drawerBody.innerHTML = '<div class="drawer-empty">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M6 3h12a1 1 0 0 1 1 1v16l-7-4-7 4V4a1 1 0 0 1 1-1z"/></svg>' +
        '<p>Your list is empty.<br>Tap “Save” or “Add to List” on any project or service to shortlist it.</p></div>';
      return;
    }
    var html = '';
    saved.forEach(function (s) {
      html += '<div class="saved-item" data-id="' + s.id + '">' +
        '<img class="si-thumb" src="' + s.thumb + '" alt="" loading="lazy">' +
        '<div class="si-body"><div class="t">' + s.title + '</div><div class="c">' + s.cat + '</div></div>' +
        '<button class="si-rm" aria-label="Remove ' + s.title + '">' +
        '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M18 6 6 18M6 6l12 12"/></svg>' +
        '</button></div>';
    });
    drawerBody.innerHTML = html;
    drawerBody.querySelectorAll('.si-rm').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.closest('.saved-item').getAttribute('data-id');
        toggleSave(id);
      });
    });
  }

  function toggleSave(id, cardEl) {
    var card = cardEl || document.querySelector('[data-id="' + id + '"]');
    if (!card) return;
    if (isSaved(id)) {
      saved = saved.filter(function (s) { return s.id !== id; });
      showToast('Removed from your list');
    } else {
      saved.push({
        id: id,
        title: decodeEntities(card.getAttribute('data-title') || 'Project'),
        cat: decodeEntities(card.getAttribute('data-cat') || ''),
        thumb: card.getAttribute('data-thumb') || ''
      });
      showToast('Added to your list');
    }
    persist();
    updateCount();
    syncButtons();
    renderDrawer();
  }

  document.querySelectorAll('.js-save').forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      var card = btn.closest('[data-id]');
      if (card) toggleSave(card.getAttribute('data-id'), card);
    });
  });

  /* drawer open/close */
  function openDrawer() {
    renderDrawer();
    drawer.classList.add('open');
    drawerOverlay.classList.add('open');
    drawer.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }
  function closeDrawer() {
    drawer.classList.remove('open');
    drawerOverlay.classList.remove('open');
    drawer.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }
  savedChip.addEventListener('click', openDrawer);
  drawerClose.addEventListener('click', closeDrawer);
  drawerOverlay.addEventListener('click', closeDrawer);
  document.getElementById('drawerCta').addEventListener('click', closeDrawer);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { closeDrawer(); toggleMenu(false); }
  });

  updateCount();
  syncButtons();

  /* ===============================================================
     CONTACT FORM (client-side)
  ================================================================ */
  var form = document.getElementById('quoteForm');
  var status = document.getElementById('formStatus');
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var name = form.name.value.trim();
    var email = form.email.value.trim();
    var emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

    if (!name || !emailOk) {
      status.className = 'form-status err';
      status.textContent = !name
        ? 'Please add your name so we know who we\'re speaking with.'
        : 'Please enter a valid email address.';
      (!name ? form.name : form.email).focus();
      return;
    }
    var extra = saved.length ? ' We\'ve noted the ' + saved.length + ' item' + (saved.length > 1 ? 's' : '') + ' on your list.' : '';
    status.className = 'form-status ok';
    status.textContent = 'Thank you, ' + name.split(' ')[0] + '. Your request has been received — we\'ll be in touch within one business day.' + extra;
    form.reset();
    updateCount();
  });

  /* ---------- Year ---------- */
  document.getElementById('year').textContent = new Date().getFullYear();
})();

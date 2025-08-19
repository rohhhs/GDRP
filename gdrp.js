(function () {
  'use strict';

  /***** CONFIG *****/
  const CONSENT_STORAGE_KEY = 'cookie_consent_v3';
  const CONSENT_SERVER_URL = 'https://domainname.com/lib/script/save/consent/index.php';
  const YM_COUNTER_ID = XXXXXXXXX;
  const GTM_ID = 'GTM-XXXXXXX';
  // How many days to hide the banner after explicit user decision (accept/reject/save)
  const BANNER_HIDE_DAYS = 90; // set to 0 to disable auto-hide

  /***** TRANSLATIONS *****/
  const I18N = {
    ru: {
      title: 'Мы используем cookies и подобные технологии',
      desc: 'Мы используем cookies для работы сайта, аналитики и персонализации рекламы. Вы можете принять всё, отклонить или настроить категории.',
      privacy: 'Политика конфиденциальности',
      settings: 'Настроить',
      reject: 'Отклонить',
      accept: 'Принять всё',
      modalTitle: 'Настройки cookie',
      modalNecessary: 'Необходимые',
      modalNecessaryDesc: 'Обеспечивают базовую работу сайта — всегда включены',
      modalAnalytics: 'Аналитика',
      modalAnalyticsDesc: 'Сбор статистики (Yandex.Metrika, Google Analytics и т.п.)',
      modalMarketing: 'Маркетинг',
      modalMarketingDesc: 'Пиксели и персонализация рекламы',
      cancel: 'Отмена',
      save: 'Сохранить',
      langBtn: 'EN'
    },
    en: {
      title: 'We use cookies and similar technologies',
      desc: 'We use cookies for site operation, analytics and ad personalization. You can accept all, reject or configure categories.',
      privacy: 'Privacy Policy',
      settings: 'Settings',
      reject: 'Reject',
      accept: 'Accept all',
      modalTitle: 'Cookie settings',
      modalNecessary: 'Necessary',
      modalNecessaryDesc: 'Ensure core site functionality — always on',
      modalAnalytics: 'Analytics',
      modalAnalyticsDesc: 'Collect usage statistics (Yandex.Metrika, Google Analytics etc.)',
      modalMarketing: 'Marketing',
      modalMarketingDesc: 'Pixels and ad personalization',
      cancel: 'Cancel',
      save: 'Save',
      langBtn: 'RU'
    }
  };

  /***** STORAGE HELPERS *****/
  function readConsent() {
    try {
      const raw = localStorage.getItem(CONSENT_STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      console.warn('Failed to parse consent from localStorage', e);
      return null;
    }
  }

  function writeConsent(obj) {
    try {
      obj.datetime = new Date().toISOString();
      localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(obj));
    } catch (e) {
      console.warn('Failed to write consent to localStorage', e);
    }
  }

  function computeHideUntilIso() {
    if (typeof BANNER_HIDE_DAYS === 'number' && BANNER_HIDE_DAYS > 0) {
      const hideMs = Date.now() + BANNER_HIDE_DAYS * 24 * 60 * 60 * 1000;
      return new Date(hideMs).toISOString();
    }
    return undefined;
  }

  /***** NETWORK: sendBeacon + fetch fallback *****/
  function sendConsentToServer(payload) {
    try {
      const json = JSON.stringify(payload);
      const blob = new Blob([json], { type: 'application/json' });
      if (navigator.sendBeacon && CONSENT_SERVER_URL) {
        const ok = navigator.sendBeacon(CONSENT_SERVER_URL, blob);
        if (ok) return Promise.resolve({ beacon: true });
      }
      if (window.fetch) {
        return fetch(CONSENT_SERVER_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json; charset=utf-8' },
          body: json,
          keepalive: true,
          cache: 'no-store'
        }).then(resp => ({ beacon: false, status: resp.status }));
      }
      return Promise.resolve({ error: 'no-fetch', payloadSize: json.length });
    } catch (err) {
      return Promise.resolve({ error: String(err) });
    }
  }

  /***** ANALYTICS / MARKETING LOADERS (examples) *****/
  window.__enableGTM = function () {
    if (!GTM_ID || GTM_ID.indexOf('GTM-') !== 0) return;
    if (window.__gtmLoaded) return;
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' });
    const s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtm.js?id=' + encodeURIComponent(GTM_ID);
    document.head.appendChild(s);
    window.__gtmLoaded = true;
  };

  window.__enableMarketing = function () {
    if (window.__marketingLoaded) return;
    const s = document.createElement('script');
    s.async = true;
    s.src = 'https://example.com/marketing.js'; // replace with real marketing script
    document.head.appendChild(s);
    window.__marketingLoaded = true;
  };

  function enableYandex() {
    if (window.__ymLoaded) return;
    (function (m, e, t, r, i, k, a) {
      m[i] = m[i] || function () { (m[i].a = m[i].a || []).push(arguments) };
      m[i].l = 1 * new Date();
      const src = 'https://mc.yandex.ru/metrika/tag.js?id=' + encodeURIComponent(YM_COUNTER_ID);
      for (let j = 0; j < document.scripts.length; j++) {
        if (document.scripts[j].src === src) { return; }
      }
      k = e.createElement(t), a = e.getElementsByTagName(t)[0];
      k.async = 1; k.src = src; a.parentNode.insertBefore(k, a);
    })(window, document, 'script', null, 'ym');

    const start = Date.now();
    (function waitForYm() {
      if (typeof ym === 'function') {
        try {
          ym(YM_COUNTER_ID, 'init', {
            ssr: true,
            webvisor: true,
            clickmap: true,
            ecommerce: "dataLayer",
            accurateTrackBounce: true,
            trackLinks: true
          });
        } catch (e) { console.warn('ym init error', e); }
        window.__ymLoaded = true;
        return;
      }
      if ((Date.now() - start) < 5000) setTimeout(waitForYm, 150);
      else window.__ymLoaded = true;
    })();
  }

  /***** DEFAULT CONSENT OBJECT *****/
  function defaultConsent(lang = 'ru') {
    return {
      version: 3,
      datetime: new Date().toISOString(),
      status: 'unknown', // accepted | rejected | custom | unknown
      categories: { necessary: true, analytics: false, marketing: false },
      lang: lang
    };
  }

  /***** UI STATE HOLDER (short name $ is just a variable, not jQuery) *****/
  let $ = null;

  /***** ACCESSIBILITY: focus trap helpers *****/
  let previouslyFocused = null;
  let modalKeyHandler = null;

  function getFocusableElements(container) {
    if (!container) return [];
    const selector = 'a[href], area[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), iframe, object, embed, [tabindex]:not([tabindex="-1"]), [contenteditable]';
    return Array.from(container.querySelectorAll(selector)).filter(el => el.offsetParent !== null);
  }

  function trapFocus(container) {
    const focusables = getFocusableElements(container);
    if (focusables.length === 0) return;
    previouslyFocused = document.activeElement;
    focusables[0].focus();

    modalKeyHandler = function (e) {
      if (e.key === 'Escape') {
        closeModal();
        return;
      }
      if (e.key === 'Tab') {
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };
    document.addEventListener('keydown', modalKeyHandler);
  }

  function releaseFocus() {
    if (modalKeyHandler) {
      document.removeEventListener('keydown', modalKeyHandler);
      modalKeyHandler = null;
    }
    if (previouslyFocused && typeof previouslyFocused.focus === 'function') {
      previouslyFocused.focus();
    }
    previouslyFocused = null;
  }

  /***** UI helpers: show/hide/modal *****/
  function showBanner() { if ($ && $.banner) $.banner.style.display = 'flex'; }
  function hideBanner() { if ($ && $.banner) $.banner.style.display = 'none'; }
  function openModal() { if ($ && $.modal) { $.modal.style.display = 'flex'; $.modal.setAttribute('aria-hidden', 'false'); trapFocus($.modal); } }
  function closeModal() { if ($ && $.modal) { $.modal.style.display = 'none'; $.modal.setAttribute('aria-hidden', 'true'); releaseFocus(); } }

  /***** TEXTS + TOGGLE HELPERS *****/
  function updateTexts(lang) {
    const t = I18N[lang] || I18N.ru;
    if (!$) return;
    $.title && ($.title.textContent = t.title);
    $.desc && ($.desc.textContent = t.desc);
    if ($.privacyLink) { $.privacyLink.textContent = t.privacy; $.privacyLink.href = '/privacy'; }
    $.settingsBtn && ($.settingsBtn.textContent = t.settings);
    $.rejectBtn && ($.rejectBtn.textContent = t.reject);
    $.acceptBtn && ($.acceptBtn.textContent = t.accept);
    $.langBtn && ($.langBtn.textContent = t.langBtn);
    $.modalTitle && ($.modalTitle.textContent = t.modalTitle);

    const necessary = $.modal.querySelector('.toggle-row[aria-disabled="true"]');
    if (necessary) {
      const strong = necessary.querySelector('strong'); if (strong) strong.textContent = t.modalNecessary;
      const desc = necessary.querySelector('div[style]'); // left small text; fallback
      if (desc) desc.textContent = t.modalNecessaryDesc;
    }
    const analytics = $.modal.querySelector('.toggle-row[data-category="analytics"]');
    if (analytics) {
      const strong = analytics.querySelector('strong'); if (strong) strong.textContent = t.modalAnalytics;
      const desc = analytics.querySelectorAll('div')[1]; if (desc) desc.textContent = t.modalAnalyticsDesc;
    }
    const marketing = $.modal.querySelector('.toggle-row[data-category="marketing"]');
    if (marketing) {
      const strong = marketing.querySelector('strong'); if (strong) strong.textContent = t.modalMarketing;
      const desc = marketing.querySelectorAll('div')[1]; if (desc) desc.textContent = t.modalMarketingDesc;
    }
    $.modalCancel && ($.modalCancel.textContent = t.cancel);
    $.modalSave && ($.modalSave.textContent = t.save);
  }

  function setSwitchState(category, state) {
    if (!$ || !$.modal) return;
    const btn = $.modal.querySelector('.switch[data-category="' + category + '"]');
    if (!btn) return;
    if (state) { btn.classList.add('on'); btn.setAttribute('aria-pressed', 'true'); }
    else { btn.classList.remove('on'); btn.setAttribute('aria-pressed', 'false'); }
  }

  function getSwitchState(category) {
    if (!$ || !$.modal) return false;
    const btn = $.modal.querySelector('.switch[data-category="' + category + '"]');
    return btn && btn.classList.contains('on');
  }

  /***** APPLY CONSENT (loads analytics/marketing if allowed) *****/
  function applyConsent(consent) {
    if (!consent) return;
    if (consent.categories && consent.categories.analytics) { enableYandex(); if (window.__enableGTM) window.__enableGTM(); }
    else if (window.__disableAnalytics) window.__disableAnalytics();
    if (consent.categories && consent.categories.marketing) { if (window.__enableMarketing) window.__enableMarketing(); }
    else if (window.__disableMarketing) window.__disableMarketing();
    if (consent.lang) updateTexts(consent.lang);
  }

  /***** INIT: insert markup, query elements, attach handlers *****/
  function initBanner() {
    const parentDiv = document.body || document.getElementsByTagName('body')[0];
    parentDiv.insertAdjacentHTML('beforeend', `<style>.cc-banner{ position: fixed; display:flex; letter-spacing: -0.4px; gap:16px; align-items:center; padding:18px; background:var(--bg); border-radius:var(--radius); box-shadow:var(--shadow); z-index:99999; max-width:var(--max-width); margin:0 auto; background: #f0f0f0; color: #000000; } .cc-content{flex:1;min-width:0} .cc-title{font-size:18px;font-weight:700;margin:0 0 6px} .cc-desc{margin:0;color:#7a7a7a;line-height:1.5;font-size:14.5px} .cc-actions{display:flex;gap:8px;align-items:center} .cc-btn{padding:10px 14px;border-radius:10px;border:0;cursor:pointer;font-weight:600;font-size:14px} .cc-btn.ghost{background:transparent;border:1px solid #e6eefc;color:#000000} .cc-btn.primary{ background: linear-gradient(135deg , #FFAA11 , #EECC00); color:#fff} .cc-btn.neutral{background:#aaaaaa;color:#ffffff} .cc-link{color:#ffffff;text-decoration:underline;font-size:13px} .cc-modal-backdrop{position:fixed;inset:0;background:rgba(2,6,23,0.45);color:#000000;display:none;align-items:center;justify-content:center;z-index:100000} .cc-modal{background:#fff;padding:18px;max-width:720px;width:92%;box-shadow:0 12px 40px rgba(2,6,23,0.2)} .cc-section{margin:10px 0} .toggle-row{display:flex;justify-content:space-between;align-items:center;padding:12px;border-radius:8px;border:1px solid #f1f5f9;margin-top:8px} .switch{width:46px;height:26px;border-radius:20px;background:linear-gradient(135deg , #FFAA11 , #EECC00);position:relative;border:0;cursor:pointer} .switch > span{position:absolute;top:3px;left:3px;width:20px;height:20px;border-radius:50%;background:#fff;box-shadow:0 2px 6px rgba(2,6,23,0.12);transition:all .18s} .switch.on{background:var(--accent)} .switch.on > span{left:23px} @media screen and (max-width:720px){ .cc-banner{left:0;right:0;bottom:0;border-radius:0;padding:14px} .cc-actions{flex-direction:column;align-items:stretch} .cc-actions .cc-btn{width:100%} } @media screen and (min-width:721px){ .cc-modal{border-radius:12px;} .cc-banner{ border-radius: 24px; left: 16px; right: 16px; bottom: 16px; } } .switch:focus{outline:3px solid rgba(11,116,222,0.18)}</style>
<div class="cc-banner minimal" id="ccBanner" role="dialog" aria-live="polite" aria-label="Cookie consent" style="display:none">
  <div class="cc-content" style="flex:1;min-width:0">
    <p class="cc-title" id="ccTitle"></p>
    <p class="cc-desc" id="ccDesc" style="margin:6px 0 0"></p>
    <div style="margin-top:6px"><a id="ccPrivacyLink" class="cc-link" href="/privacy"></a></div>
  </div>
  <div class="cc-actions" aria-hidden="false" style="display:flex;gap:8px;align-items:center;margin-left:16px">
    <button class="cc-btn ghost" id="ccLangBtn" aria-label="Toggle language">EN</button>
    <button class="cc-btn ghost" id="ccSettingsBtn" aria-expanded="false"></button>
    <button class="cc-btn neutral" id="ccRejectBtn"></button>
    <button class="cc-btn primary" id="ccAcceptBtn"></button>
  </div>
</div>

<div class="cc-modal-backdrop" id="ccModal" aria-hidden="true" role="dialog" aria-modal="true" style="display:none;position:fixed;inset:0;align-items:center;justify-content:center;z-index:100000">
  <div class="cc-modal" role="document" style="background:#fff;padding:16px;border-radius:8px;max-width:720px;width:94%;box-shadow:0 12px 40px rgba(2,6,23,0.2);margin:0 16px">
    <h3 id="modalTitle"></h3>
    <p style="color:var(--muted);margin:6px 0 12px"></p>
    <div class="cc-section">
      <div class="toggle-row" aria-disabled="true" style="display:flex;justify-content:space-between;align-items:center;padding:8px;border-radius:6px;border:1px solid #f1f5f9;">
        <div><strong></strong><div style="font-size:13px;color:var(--muted)"></div></div>
        <div style="opacity:.7">Включено</div>
      </div>

      <div class="toggle-row" data-category="analytics" tabindex="0" style="display:flex;justify-content:space-between;align-items:center;padding:8px;border-radius:6px;border:1px solid #f1f5f9;margin-top:8px">
        <div><strong></strong><div style="font-size:13px;color:var(--muted)"></div></div>
        <button class="switch" data-category="analytics" aria-pressed="false"><span></span></button>
      </div>

      <div class="toggle-row" data-category="marketing" tabindex="0" style="display:flex;justify-content:space-between;align-items:center;padding:8px;border-radius:6px;border:1px solid #f1f5f9;margin-top:8px">
        <div><strong></strong><div style="font-size:13px;color:var(--muted)"></div></div>
        <button class="switch" data-category="marketing" aria-pressed="false"><span></span></button>
      </div>
    </div>

    <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:14px">
      <button class="cc-btn ghost" id="modalCancel"></button>
      <button class="cc-btn primary" id="modalSave"></button>
    </div>
  </div>
</div>
    `);

    // Query elements
    $ = {
      banner: document.getElementById('ccBanner'),
      modal: document.getElementById('ccModal'),
      title: document.getElementById('ccTitle'),
      desc: document.getElementById('ccDesc'),
      privacyLink: document.getElementById('ccPrivacyLink'),
      acceptBtn: document.getElementById('ccAcceptBtn'),
      rejectBtn: document.getElementById('ccRejectBtn'),
      settingsBtn: document.getElementById('ccSettingsBtn'),
      modalSave: document.getElementById('modalSave'),
      modalCancel: document.getElementById('modalCancel'),
      langBtn: document.getElementById('ccLangBtn'),
      modalTitle: document.getElementById('modalTitle')
    };

    // Determine language from stored consent or default RU
    const stored = readConsent();
    const currentLang = (stored && stored.lang) ? stored.lang : 'ru';
    $.lang = currentLang;
    updateTexts($.lang);

    // Attach handlers
    if ($.acceptBtn) {
      $.acceptBtn.addEventListener('click', () => {
        const consent = defaultConsent($.lang);
        consent.status = 'accepted';
        consent.categories.analytics = true;
        consent.categories.marketing = true;
        consent.lang = $.lang;
        const hideUntil = computeHideUntilIso();
        if (hideUntil) consent.hideUntil = hideUntil;
        writeConsent(consent);
        applyConsent(consent);
        sendConsentToServer(consent).catch(()=>{});
        hideBanner();
      });
    }

    if ($.rejectBtn) {
      $.rejectBtn.addEventListener('click', () => {
        const consent = defaultConsent($.lang);
        consent.status = 'rejected';
        consent.categories.analytics = false;
        consent.categories.marketing = false;
        consent.lang = $.lang;
        const hideUntil = computeHideUntilIso();
        if (hideUntil) consent.hideUntil = hideUntil;
        writeConsent(consent);
        applyConsent(consent);
        sendConsentToServer(consent).catch(()=>{});
        hideBanner();
      });
    }

    if ($.settingsBtn) {
      $.settingsBtn.addEventListener('click', () => {
        const cur = readConsent() || defaultConsent($.lang);
        setSwitchState('analytics', !!cur.categories.analytics);
        setSwitchState('marketing', !!cur.categories.marketing);
        openModal();
      });
    }

    if ($.modalCancel) $.modalCancel.addEventListener('click', () => closeModal());

    if ($.modalSave) {
      $.modalSave.addEventListener('click', () => {
        const consent = defaultConsent($.lang);
        consent.status = 'custom';
        consent.categories.analytics = !!getSwitchState('analytics');
        consent.categories.marketing = !!getSwitchState('marketing');
        consent.lang = $.lang;
        const hideUntil = computeHideUntilIso();
        if (hideUntil) consent.hideUntil = hideUntil;
        writeConsent(consent);
        applyConsent(consent);
        sendConsentToServer(consent).catch(()=>{});
        closeModal();
        hideBanner();
      });
    }

    // Language toggle: persist language inside consent object but do not change hideUntil
    if ($.langBtn) {
      $.langBtn.addEventListener('click', () => {
        const newLang = ($.lang === 'en') ? 'ru' : 'en';
        $.lang = newLang;
        updateTexts(newLang);
        const cur = readConsent() || defaultConsent(newLang);
        cur.lang = newLang;
        // keep existing hideUntil if present
        if (cur.hideUntil) { /* keep as-is */ }
        writeConsent(cur);
      });
    }

    // Toggle rows: clickable + keyboard
    const rows = $.modal.querySelectorAll('.toggle-row');
    rows.forEach(row => {
      const category = row.getAttribute('data-category');
      if (!category) return;
      const sw = row.querySelector('.switch');
      if (!sw) return;
      row.addEventListener('click', (e) => {
        if (e.target && (e.target.tagName === 'A' || (e.target.tagName === 'BUTTON' && !e.target.classList.contains('switch')))) return;
        sw.classList.toggle('on');
        sw.setAttribute('aria-pressed', sw.classList.contains('on') ? 'true' : 'false');
      });
      row.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          sw.classList.toggle('on');
          sw.setAttribute('aria-pressed', sw.classList.contains('on') ? 'true' : 'false');
        }
      });
    });

    // Finally: decide whether to show the banner using hideUntil
    const cur = readConsent();
    if (cur) {
      if (cur.hideUntil) {
        const hideUntilTs = Date.parse(cur.hideUntil);
        if (!isNaN(hideUntilTs) && hideUntilTs > Date.now()) {
          // Consent exists and hideUntil not expired -> apply and keep banner hidden
          applyConsent(cur);
          hideBanner();
          return;
        }
      }
      if (cur.status && cur.status !== 'unknown') {
        // Consent exists but hideUntil expired or not set -> apply consent (load analytics if allowed)
        applyConsent(cur);
        // re-show banner to allow changes
        showBanner();
        return;
      }
    }
    // No stored consent -> show banner
    showBanner();
  } // end initBanner

  // Run at DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initBanner, { once: true });
  } else {
    initBanner();
  }

  // Expose debug helper
  window.__getConsent = function () { return readConsent(); };

  /***** END IIFE *****/
})();

'use strict';

/*
 * Peipe shared client helper.
 *   window.PeipePartnerAPI.list({ mode: 'recommend', limit: 20 })
 *   window.PeipePartnerAPI.list({ mode: 'nearby', limit: 20 })
 *   window.PeipePartnerAPI.updateLocation({ lat, lng })
 *
 * Also shows a lightweight profile-completion popup after registration/login
 * when language partner fields are missing.
 */
(function () {
  const api = {};
  const DISMISS_KEY = 'peipe_partner_profile_dismissed_until';
  const DISMISS_MS = 6 * 60 * 60 * 1000;

  const TEXTS = {
    zh: {
      dialogLabel: '完善语伴资料',
      title: '完善语伴资料',
      desc: '填写后才能更准确地推荐语伴和附近的人。选项包含中文、English、မြန်မာ、Tiếng Việt，其他国家用户也能看懂。',
      nationality: '国籍 / Nationality',
      nativeLanguage: '母语 / Native language',
      learningLanguage: '想学习的语言 / Learning language',
      gender: '性别 / Gender',
      age: '年龄 / Age',
      multiHelp: '可多选 / Multiple choices',
      learningHelp: '选择你想找对方练习的语言',
      later: '稍后',
      save: '保存',
      saving: '保存中...',
      saveFailed: '保存失败，请稍后重试',
      required: '请完整填写语伴资料',
      ageHelp: '使用 NodeBB 原有 age 字段，不需要另外创建自定义年龄字段'
    },
    en: {
      dialogLabel: 'Complete partner profile',
      title: 'Complete your partner profile',
      desc: 'This helps Peipe recommend better language partners and nearby people. Options include Chinese, English, Burmese, and Vietnamese labels.',
      nationality: 'Nationality / 国籍',
      nativeLanguage: 'Native language / 母语',
      learningLanguage: 'Language you want to learn',
      gender: 'Gender / 性别',
      age: 'Age / 年龄',
      multiHelp: 'Multiple choices allowed',
      learningHelp: 'Choose the language you want to practice with others',
      later: 'Later',
      save: 'Save',
      saving: 'Saving...',
      saveFailed: 'Save failed. Please try again later.',
      required: 'Please complete all partner profile fields.',
      ageHelp: 'Uses NodeBB’s existing age field; no extra custom age field is needed'
    },
    my: {
      dialogLabel: 'ဘာသာစကားမိတ်ဖက်အချက်အလက်ဖြည့်ပါ',
      title: 'ဘာသာစကားမိတ်ဖက်အချက်အလက်ဖြည့်ပါ',
      desc: 'ပိုကောင်းသောဘာသာစကားမိတ်ဖက်များနှင့် အနီးအနားရှိလူများကို အကြံပြုနိုင်ရန် ဖြည့်ပါ။ ရွေးချယ်စရာများတွင် တရုတ်၊ အင်္ဂလိပ်၊ မြန်မာ၊ ဗီယက်နမ် ဘာသာစကားအညွှန်းများပါသည်။',
      nationality: 'နိုင်ငံသား / Nationality',
      nativeLanguage: 'မိခင်ဘာသာစကား / Native language',
      learningLanguage: 'သင်ယူလိုသောဘာသာစကား',
      gender: 'လိင် / Gender',
      age: 'အသက် / Age',
      multiHelp: 'တစ်ခုထက်ပိုရွေးနိုင်သည်',
      learningHelp: 'အခြားသူများနှင့် လေ့ကျင့်လိုသောဘာသာစကားကိုရွေးပါ',
      later: 'နောက်မှ',
      save: 'သိမ်းမည်',
      saving: 'သိမ်းနေသည်...',
      saveFailed: 'သိမ်းဆည်းမှုမအောင်မြင်ပါ။ ခဏနောက်မှ ထပ်ကြိုးစားပါ။',
      required: 'ဘာသာစကားမိတ်ဖက်အချက်အလက်များကို ပြည့်စုံအောင်ဖြည့်ပါ။',
      ageHelp: 'NodeBB ၏ ရှိပြီးသား age field ကိုအသုံးပြုသည်။ age custom field အသစ်မလိုပါ'
    },
    vi: {
      dialogLabel: 'Hoàn thiện hồ sơ bạn học',
      title: 'Hoàn thiện hồ sơ bạn học',
      desc: 'Thông tin này giúp Peipe gợi ý bạn học ngôn ngữ và người ở gần chính xác hơn. Các lựa chọn có nhãn tiếng Trung, English, Myanmar và Tiếng Việt.',
      nationality: 'Quốc tịch / Nationality',
      nativeLanguage: 'Tiếng mẹ đẻ / Native language',
      learningLanguage: 'Ngôn ngữ muốn học',
      gender: 'Giới tính / Gender',
      age: 'Tuổi / Age',
      multiHelp: 'Có thể chọn nhiều mục',
      learningHelp: 'Chọn ngôn ngữ bạn muốn luyện tập với người khác',
      later: 'Để sau',
      save: 'Lưu',
      saving: 'Đang lưu...',
      saveFailed: 'Lưu thất bại, vui lòng thử lại sau.',
      required: 'Vui lòng điền đầy đủ hồ sơ bạn học.',
      ageHelp: 'Dùng trường age có sẵn của NodeBB; không cần tạo thêm trường tuổi tùy chỉnh'
    }
  };

  function bp() {
    return (window.config && window.config.relative_path) || '';
  }

  function csrf() {
    return (window.config && window.config.csrf_token) || '';
  }

  function isLoggedIn() {
    return !!(window.app && window.app.user && Number(window.app.user.uid) > 0);
  }

  function isAdminPage() {
    return String(window.location.pathname || '').indexOf('/admin') !== -1;
  }

  function currentLang() {
    const candidates = [
      window.app && window.app.user && window.app.user.language,
      window.app && window.app.user && window.app.user.lang,
      window.config && window.config.userLang,
      document.documentElement && document.documentElement.lang,
      navigator.language,
      navigator.userLanguage
    ];

    const raw = String(candidates.find(Boolean) || '').toLowerCase();
    if (raw.startsWith('my') || raw.startsWith('mm') || raw.includes('burmese')) return 'my';
    if (raw.startsWith('vi')) return 'vi';
    if (raw.startsWith('en')) return 'en';
    return 'zh';
  }

  function t(key) {
    const lang = currentLang();
    return (TEXTS[lang] && TEXTS[lang][key]) || TEXTS.zh[key] || key;
  }

  function toQuery(params) {
    const q = new URLSearchParams();
    Object.keys(params || {}).forEach((key) => {
      if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
        q.set(key, params[key]);
      }
    });
    const s = q.toString();
    return s ? `?${s}` : '';
  }

  function jsonFetch(url, options) {
    return fetch(url, options || {}).then((res) => {
      return res.json().catch(() => ({})).then((data) => {
        if (!res.ok) {
          const err = new Error(data.message || `HTTP ${res.status}`);
          err.data = data;
          throw err;
        }
        return data;
      });
    });
  }

  api.list = function list(options) {
    const opts = options || {};
    return jsonFetch(`${bp()}/api/peipe-partners${toQuery(opts)}`, {
      credentials: 'same-origin'
    });
  };

  api.updateLocation = function updateLocation(loc) {
    return jsonFetch(`${bp()}/api/peipe-partners/location`, {
      method: 'PUT',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        'x-csrf-token': csrf()
      },
      body: JSON.stringify({ lat: loc.lat, lng: loc.lng })
    });
  };

  api.profileStatus = function profileStatus() {
    return jsonFetch(`${bp()}/api/peipe-partners/me/profile-status`, {
      credentials: 'same-origin'
    });
  };

  api.updateProfile = function updateProfile(profile) {
    return jsonFetch(`${bp()}/api/peipe-partners/me/profile`, {
      method: 'PUT',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        'x-csrf-token': csrf()
      },
      body: JSON.stringify(profile)
    });
  };

  api.locallyFreshLocation = function locallyFreshLocation(storageKey, ttlMs) {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (!data || !data.updatedAt || Date.now() - Number(data.updatedAt) > ttlMs) return null;
      return data;
    } catch (err) {
      return null;
    }
  };

  function optionLabel(opt) {
    // Keep the full multi-language label in the select so users from different
    // countries can understand it even before their account language is set.
    return opt.label || (opt.labels && (opt.labels[currentLang()] || opt.labels.en || opt.labels.zh)) || opt.value;
  }

  function optionHtml(options, selected) {
    const selectedSet = new Set(Array.isArray(selected) ? selected : [selected].filter(Boolean));
    return (options || []).map((opt) => {
      const sel = selectedSet.has(opt.value) || selectedSet.has(opt.code) ? ' selected' : '';
      return `<option value="${escapeHtml(opt.value)}"${sel}>${escapeHtml(optionLabel(opt))}</option>`;
    }).join('');
  }

  function escapeHtml(value) {
    const div = document.createElement('div');
    div.textContent = String(value == null ? '' : value);
    return div.innerHTML;
  }

  function shouldSkipPopup() {
    if (!isLoggedIn() || isAdminPage()) return true;
    if (document.getElementById('peipe-profile-modal')) return true;
    try {
      const until = Number(sessionStorage.getItem(DISMISS_KEY) || 0);
      return until && Date.now() < until;
    } catch (err) {
      return false;
    }
  }

  function dismissPopup() {
    try {
      sessionStorage.setItem(DISMISS_KEY, String(Date.now() + DISMISS_MS));
    } catch (err) {}
    const el = document.getElementById('peipe-profile-modal');
    if (el) el.remove();
  }

  function selectValues(selectEl) {
    return Array.prototype.slice.call(selectEl.options)
      .filter((opt) => opt.selected)
      .map((opt) => opt.value);
  }

  function showProfileModal(status) {
    const opts = status.options || {};
    const p = status.profile || {};
    const wrapper = document.createElement('div');
    wrapper.id = 'peipe-profile-modal';
    wrapper.innerHTML = `
      <style>
        #peipe-profile-modal{position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.38);display:flex;align-items:flex-end;justify-content:center;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"PingFang SC","Microsoft YaHei",sans-serif}
        #peipe-profile-modal .ppm-sheet{width:100%;max-width:520px;background:#fff;border-radius:22px 22px 0 0;padding:18px 18px 20px;box-shadow:0 -12px 36px rgba(0,0,0,.16)}
        #peipe-profile-modal .ppm-title{font-size:20px;font-weight:800;color:#111;margin-bottom:6px}
        #peipe-profile-modal .ppm-desc{font-size:13px;line-height:1.45;color:#666;margin-bottom:14px}
        #peipe-profile-modal .ppm-field{margin-bottom:12px}
        #peipe-profile-modal label{display:block;font-size:13px;font-weight:700;color:#333;margin-bottom:6px}
        #peipe-profile-modal select,#peipe-profile-modal input{width:100%;box-sizing:border-box;border:1px solid #e5e7eb;background:#f8f9fb;border-radius:14px;min-height:44px;padding:8px 12px;font-size:15px;outline:none}
        #peipe-profile-modal select[multiple]{height:108px}
        #peipe-profile-modal .ppm-help{font-size:11px;color:#999;margin-top:4px}
        #peipe-profile-modal .ppm-error{display:none;font-size:12px;color:#d93025;margin:8px 0}
        #peipe-profile-modal .ppm-actions{display:flex;gap:10px;margin-top:14px}
        #peipe-profile-modal button{border:0;border-radius:999px;height:44px;font-size:15px;font-weight:700;cursor:pointer}
        #peipe-profile-modal .ppm-later{flex:1;background:#f1f3f5;color:#555}
        #peipe-profile-modal .ppm-save{flex:2;background:#ffd100;color:#111}
        #peipe-profile-modal .ppm-save[disabled]{opacity:.55}
      </style>
      <div class="ppm-sheet" role="dialog" aria-modal="true" aria-label="${escapeHtml(t('dialogLabel'))}">
        <div class="ppm-title">${escapeHtml(t('title'))}</div>
        <div class="ppm-desc">${escapeHtml(t('desc'))}</div>
        <form class="ppm-form">
          <div class="ppm-field">
            <label>${escapeHtml(t('nationality'))}</label>
            <select name="language_flag" required>${optionHtml(opts.countryOptions, p.language_flag)}</select>
          </div>
          <div class="ppm-field">
            <label>${escapeHtml(t('nativeLanguage'))}</label>
            <select name="language_fluent" multiple required>${optionHtml(opts.languageOptions, p.language_fluent || [])}</select>
            <div class="ppm-help">${escapeHtml(t('multiHelp'))}</div>
          </div>
          <div class="ppm-field">
            <label>${escapeHtml(t('learningLanguage'))}</label>
            <select name="language_learning" multiple required>${optionHtml(opts.languageOptions, p.language_learning || [])}</select>
            <div class="ppm-help">${escapeHtml(t('learningHelp'))}</div>
          </div>
          <div class="ppm-field">
            <label>${escapeHtml(t('gender'))}</label>
            <select name="gender" required>${optionHtml(opts.genderOptions, p.gender)}</select>
          </div>
          <div class="ppm-field">
            <label>${escapeHtml(t('age'))}</label>
            <input name="age" type="number" min="${opts.ageMin || 13}" max="${opts.ageMax || 99}" value="${escapeHtml(p.age || '')}" placeholder="18" required>
            <div class="ppm-help">${escapeHtml(t('ageHelp'))}</div>
          </div>
          <div class="ppm-error"></div>
          <div class="ppm-actions">
            <button type="button" class="ppm-later">${escapeHtml(t('later'))}</button>
            <button type="submit" class="ppm-save">${escapeHtml(t('save'))}</button>
          </div>
        </form>
      </div>`;

    document.body.appendChild(wrapper);
    wrapper.querySelector('.ppm-later').addEventListener('click', dismissPopup);
    wrapper.querySelector('.ppm-form').addEventListener('submit', function (e) {
      e.preventDefault();
      const form = e.currentTarget;
      const save = form.querySelector('.ppm-save');
      const errorEl = form.querySelector('.ppm-error');
      const payload = {
        language_flag: form.elements.language_flag.value,
        language_fluent: selectValues(form.elements.language_fluent),
        language_learning: selectValues(form.elements.language_learning),
        gender: form.elements.gender.value,
        age: form.elements.age.value
      };

      errorEl.style.display = 'none';
      save.disabled = true;
      save.textContent = t('saving');
      api.updateProfile(payload).then(() => {
        wrapper.remove();
        try { sessionStorage.removeItem(DISMISS_KEY); } catch (err) {}
      }).catch((err) => {
        errorEl.textContent = (err && err.data && err.data.error === 'profile_incomplete') ? t('required') : ((err && err.message) || t('saveFailed'));
        errorEl.style.display = 'block';
      }).finally(() => {
        save.disabled = false;
        save.textContent = t('save');
      });
    });
  }

  let checking = false;
  function maybeShowProfilePopup() {
    if (checking || shouldSkipPopup()) return;
    checking = true;
    api.profileStatus().then((status) => {
      if (status && status.complete === false) showProfileModal(status);
    }).catch(() => {}).finally(() => {
      checking = false;
    });
  }

  window.PeipePartnerAPI = api;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(maybeShowProfilePopup, 800));
  } else {
    setTimeout(maybeShowProfilePopup, 800);
  }

  if (window.jQuery) {
    window.jQuery(window)
      .off('action:ajaxify.end.peipePartnerProfile')
      .on('action:ajaxify.end.peipePartnerProfile', () => setTimeout(maybeShowProfilePopup, 400));
  }
}());

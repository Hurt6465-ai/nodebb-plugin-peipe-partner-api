'use strict';

const crypto = require('crypto');

const db = require.main.require('./src/database');
const User = require.main.require('./src/user');
const meta = require.main.require('./src/meta');
const nconf = require.main.require('nconf');
const winston = require.main.require('winston');

const SETTINGS = {
  poolTtlMs: 30 * 60 * 1000,
  seenTtlMs: 24 * 60 * 60 * 1000,
  locationClientTtlMs: 24 * 60 * 60 * 1000,
  locationServerTtlMs: 7 * 24 * 60 * 60 * 1000,
  activeLimitMs: 24 * 60 * 60 * 1000,
  maxPoolScan: 1000,
  defaultLimit: 20,
  maxLimit: 50,
  seenCap: 800,
  geoPrecision: 4
};

const KEYS = {
  pool: 'peipePartner:pool:v1',
  poolMeta: 'peipePartner:poolMeta:v1',
  seen: (mode, uid) => `peipePartner:seen:${mode}:${uid}`
};

const GEO_FIELDS = {
  // Your existing ACP custom user properties.
  lat: 'lat',
  lng: 'lng',

  // Plugin-managed hidden metadata. These do not need to be added in ACP.
  updatedAt: 'peipePartnerGeoUpdatedAt',
  expiresAt: 'peipePartnerGeoExpiresAt'
};

const USER_FIELDS = [
  'uid', 'username', 'userslug', 'picture', 'lastonline', 'status', 'banned',
  'aboutme', 'signature', 'fullname', 'age', 'birthday', 'birthdate', 'dob',
  'language_fluent', 'native_language', 'language_learning', 'target_language',
  'gender', 'sex',
  'countryCode', 'country_code', 'country', 'country_name', 'nationality', 'region', 'location', 'language_flag',
  GEO_FIELDS.lat, GEO_FIELDS.lng, GEO_FIELDS.updatedAt, GEO_FIELDS.expiresAt
];


const PARTNER_OPTIONS = {
  // Option values stay in Chinese so they match your ACP custom-property choices.
  // Labels include Chinese + English + Burmese + Vietnamese so the profile popup
  // is understandable even before the user has picked a site language.
  countryOptions: [
    { value: '中国', code: 'CN', label: '中国 / China / တရုတ် / Trung Quốc', labels: { zh: '中国', en: 'China', my: 'တရုတ်', vi: 'Trung Quốc' } },
    { value: '缅甸', code: 'MM', label: '缅甸 / Myanmar / မြန်မာ / Myanmar', labels: { zh: '缅甸', en: 'Myanmar', my: 'မြန်မာ', vi: 'Myanmar' } },
    { value: '越南', code: 'VN', label: '越南 / Vietnam / ဗီယက်နမ် / Việt Nam', labels: { zh: '越南', en: 'Vietnam', my: 'ဗီယက်နမ်', vi: 'Việt Nam' } },
    { value: '新加坡', code: 'SG', label: '新加坡 / Singapore / စင်ကာပူ / Singapore', labels: { zh: '新加坡', en: 'Singapore', my: 'စင်ကာပူ', vi: 'Singapore' } },
    { value: '泰国', code: 'TH', label: '泰国 / Thailand / ထိုင်း / Thái Lan', labels: { zh: '泰国', en: 'Thailand', my: 'ထိုင်း', vi: 'Thái Lan' } },
    { value: '日本', code: 'JP', label: '日本 / Japan / ဂျပန် / Nhật Bản', labels: { zh: '日本', en: 'Japan', my: 'ဂျပန်', vi: 'Nhật Bản' } },
    { value: '韩国', code: 'KR', label: '韩国 / Korea / ကိုရီးယား / Hàn Quốc', labels: { zh: '韩国', en: 'Korea', my: 'ကိုရီးယား', vi: 'Hàn Quốc' } },
    { value: '美国', code: 'US', label: '美国 / United States / အမေရိကန် / Hoa Kỳ', labels: { zh: '美国', en: 'United States', my: 'အမေရိကန်', vi: 'Hoa Kỳ' } },
    { value: '英国', code: 'GB', label: '英国 / United Kingdom / ဗြိတိန် / Vương quốc Anh', labels: { zh: '英国', en: 'United Kingdom', my: 'ဗြိတိန်', vi: 'Vương quốc Anh' } }
  ],
  languageOptions: [
    { value: '中文', code: 'CN', label: '中文 / Chinese / တရုတ်ဘာသာ / Tiếng Trung', labels: { zh: '中文', en: 'Chinese', my: 'တရုတ်ဘာသာ', vi: 'Tiếng Trung' } },
    { value: '缅甸语', code: 'MM', label: '缅甸语 / Burmese / မြန်မာဘာသာ / Tiếng Myanmar', labels: { zh: '缅甸语', en: 'Burmese', my: 'မြန်မာဘာသာ', vi: 'Tiếng Myanmar' } },
    { value: '越南语', code: 'VI', label: '越南语 / Vietnamese / ဗီယက်နမ်ဘာသာ / Tiếng Việt', labels: { zh: '越南语', en: 'Vietnamese', my: 'ဗီယက်နမ်ဘာသာ', vi: 'Tiếng Việt' } },
    { value: '英语', code: 'EN', label: '英语 / English / အင်္ဂလိပ်ဘာသာ / Tiếng Anh', labels: { zh: '英语', en: 'English', my: 'အင်္ဂလိပ်ဘာသာ', vi: 'Tiếng Anh' } },
    { value: '泰语', code: 'TH', label: '泰语 / Thai / ထိုင်းဘာသာ / Tiếng Thái', labels: { zh: '泰语', en: 'Thai', my: 'ထိုင်းဘာသာ', vi: 'Tiếng Thái' } },
    { value: '日语', code: 'JP', label: '日语 / Japanese / ဂျပန်ဘာသာ / Tiếng Nhật', labels: { zh: '日语', en: 'Japanese', my: 'ဂျပန်ဘာသာ', vi: 'Tiếng Nhật' } },
    { value: '韩语', code: 'KR', label: '韩语 / Korean / ကိုရီးယားဘာသာ / Tiếng Hàn', labels: { zh: '韩语', en: 'Korean', my: 'ကိုရီးယားဘာသာ', vi: 'Tiếng Hàn' } }
  ],
  genderOptions: [
    { value: '男', code: 'M', label: '男 / Male / ကျား / Nam', labels: { zh: '男', en: 'Male', my: 'ကျား', vi: 'Nam' } },
    { value: '女', code: 'F', label: '女 / Female / မ / Nữ', labels: { zh: '女', en: 'Female', my: 'မ', vi: 'Nữ' } }
  ],
  ageMin: 13,
  ageMax: 99
};

const PROFILE_REQUIRED_FIELDS = ['language_flag', 'language_fluent', 'language_learning', 'gender', 'age'];

const COUNTRY_KEYWORDS = {
  cn: ['cn', 'china', '中国', '中华人民共和国', 'zh-cn'],
  tw: ['tw', 'taiwan', '台湾', 'zh-tw'],
  hk: ['hk', 'hong kong', '香港'],
  us: ['us', 'usa', 'united states', '美国'],
  gb: ['gb', 'uk', 'united kingdom', 'great britain', 'england', '英国'],
  mm: ['mm', 'myanmar', 'burma', '缅甸'],
  vn: ['vn', 'vi', 'vietnam', '越南'],
  th: ['th', 'thailand', '泰国'],
  jp: ['jp', 'japan', '日本'],
  kr: ['kr', 'korea', 'south korea', '韩国', '南韩'],
  sg: ['sg', 'singapore', '新加坡'],
  la: ['la', 'laos', '老挝'],
  my: ['my', 'malaysia', '马来西亚'],
  ph: ['ph', 'philippines', '菲律宾'],
  id: ['id', 'indonesia', '印尼', '印度尼西亚'],
  kh: ['kh', 'cambodia', '柬埔寨'],
  in: ['in', 'india', '印度'],
  fr: ['fr', 'france', '法国'],
  de: ['de', 'germany', '德国'],
  br: ['br', 'brazil', '巴西'],
  ca: ['ca', 'canada', '加拿大'],
  au: ['au', 'australia', '澳大利亚'],
  ru: ['ru', 'russia', '俄罗斯']
};

let scheduler = null;
let memoryPool = null;
let memoryPoolBuiltAt = 0;
let buildInFlight = null;

function relativePath() {
  return nconf.get('relative_path') || '';
}

function nowMs() {
  return Date.now();
}

function isLoggedIn(req) {
  return Number(req.uid || (req.user && req.user.uid) || 0) > 0;
}

function getReqUid(req) {
  return Number(req.uid || (req.user && req.user.uid) || 0);
}

function cleanText(value) {
  return String(value == null ? '' : value).replace(/["\[\]{}]/g, '').trim();
}

function stripHtml(value) {
  return String(value == null ? '' : value).replace(/<[^>]+>/g, '').trim();
}

function parseLangList(value) {
  if (!value) return [];

  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed.map(item => cleanText(item)).filter(Boolean);
    }
    const one = cleanText(parsed);
    return one ? [one] : [];
  } catch (err) {
    const cleaned = cleanText(value);
    if (!cleaned) return [];

    return cleaned
      .split(/[、,，;；|\s]+/)
      .map(item => cleanText(item))
      .filter(Boolean);
  }
}

function firstLangCode(value) {
  const list = parseLangList(value);
  return toLangCode(list[0] || '');
}

function langCodes(value) {
  const seen = new Set();
  const out = [];

  for (const item of parseLangList(value)) {
    const code = toLangCode(item);
    if (code && code !== '未知' && !seen.has(code)) {
      seen.add(code);
      out.push(code);
    }
  }

  return out;
}

function toLangCode(value) {
  if (!value) return '未知';

  const s = cleanText(value).toLowerCase();
  const map = {
    cn: 'CN', zh: 'CN', 'zh-cn': 'CN', china: 'CN', chinese: 'CN', 中文: 'CN', 汉语: 'CN',
    en: 'EN', us: 'EN', uk: 'EN', english: 'EN', 英语: 'EN',
    vi: 'VI', vn: 'VI', vietnam: 'VI', vietnamese: 'VI', 越南: 'VI', 越南语: 'VI',
    mm: 'MM', my: 'MM', myanmar: 'MM', burmese: 'MM', 缅甸: 'MM', 缅甸语: 'MM',
    th: 'TH', thai: 'TH', thailand: 'TH', 泰语: 'TH',
    jp: 'JP', ja: 'JP', japan: 'JP', japanese: 'JP', 日语: 'JP',
    kr: 'KR', ko: 'KR', korea: 'KR', korean: 'KR', 韩语: 'KR'
  };

  for (const key of Object.keys(map)) {
    if (s === key || s.includes(key)) return map[key];
  }

  if (/^[a-z]{2}$/.test(s)) return s.toUpperCase();
  return s.length >= 2 ? s.slice(0, 2).toUpperCase() : '未知';
}

function normalizeGender(value) {
  const s = String(value == null ? '' : value).toLowerCase().trim();
  if (!s) return '';
  if (s === '男' || s === 'm' || s === 'male' || s.includes('男')) return 'M';
  if (s === '女' || s === 'f' || s === 'female' || s.includes('女')) return 'F';
  return '';
}

function normalizeAge(value) {
  const raw = String(value == null ? '' : value).trim();
  if (!raw) return 0;

  const direct = Number(raw.replace(/[岁\s]/g, ''));
  if (Number.isFinite(direct) && direct >= PARTNER_OPTIONS.ageMin && direct <= PARTNER_OPTIONS.ageMax) {
    return Math.floor(direct);
  }

  // Optional birthday compatibility: yyyy-mm-dd / yyyy/mm/dd.
  const m = raw.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (m) {
    const y = Number(m[1]);
    const mo = Number(m[2]) - 1;
    const d = Number(m[3]);
    const b = new Date(y, mo, d);
    if (!Number.isNaN(b.getTime())) {
      const today = new Date();
      let age = today.getFullYear() - b.getFullYear();
      const beforeBirthday = today.getMonth() < b.getMonth() || (today.getMonth() === b.getMonth() && today.getDate() < b.getDate());
      if (beforeBirthday) age -= 1;
      if (age >= PARTNER_OPTIONS.ageMin && age <= PARTNER_OPTIONS.ageMax) return age;
    }
  }

  return 0;
}

function resolveAge(u) {
  return normalizeAge(u.age || u.birthday || u.birthdate || u.dob);
}

function normalizeCountryValue(value) {
  const code = matchCountryCode(value);
  const opt = PARTNER_OPTIONS.countryOptions.find(item => item.code.toLowerCase() === code);
  return opt ? opt.value : cleanText(value);
}

function normalizeLanguageValues(value) {
  const codes = langCodes(value);
  const values = [];
  for (const code of codes) {
    const opt = PARTNER_OPTIONS.languageOptions.find(item => item.code === code);
    if (opt && !values.includes(opt.value)) values.push(opt.value);
  }
  if (values.length) return values;
  return parseLangList(value);
}

function profileMissingFields(u) {
  const missing = [];
  if (!matchCountryCode(u.language_flag)) missing.push('language_flag');
  if (!langCodes(u.language_fluent).length) missing.push('language_fluent');
  if (!langCodes(u.language_learning).length) missing.push('language_learning');
  if (!normalizeGender(u.gender)) missing.push('gender');
  if (!resolveAge(u)) missing.push('age');
  return missing;
}

function matchCountryCode(value) {
  const txt = cleanText(value).toLowerCase();
  if (!txt) return '';

  if (/^[a-z]{2}$/.test(txt) && COUNTRY_KEYWORDS[txt]) return txt;

  for (const [code, keywords] of Object.entries(COUNTRY_KEYWORDS)) {
    if (keywords.some(keyword => txt === keyword || txt.includes(keyword))) return code;
  }

  return '';
}

function resolveCountryCode(u) {
  const candidates = [
    u.countryCode,
    u.country_code,
    u.country,
    u.country_name,
    u.nationality,
    u.region,
    u.location,
    u.language_flag
  ];

  for (const item of candidates) {
    const code = matchCountryCode(item);
    if (code) return code;
  }

  return '';
}

function shortBio(u) {
  let bio = stripHtml(u.aboutme || u.signature || '');
  if (!bio) bio = '暂无介绍';
  if (bio.length > 60) bio = `${bio.slice(0, 60)}…`;
  return bio;
}

function isOnlineUser(u, now) {
  const lastOnline = Number(u.lastonline || 0);
  return u.status === 'online' || (lastOnline && now - lastOnline < 10 * 60 * 1000);
}

function isActiveUser(u, now) {
  const lastOnline = Number(u.lastonline || 0);
  return u.status === 'online' || (lastOnline && now - lastOnline < SETTINGS.activeLimitMs);
}

function makePictureUrl(u) {
  const base = relativePath();
  const username = u.username || 'U';
  let pic = u.picture;

  if (!pic) {
    return `https://ui-avatars.com/api/?background=random&color=fff&size=128&name=${encodeURIComponent(username)}`;
  }

  if (pic.startsWith('http') || pic.startsWith('//')) return pic;
  return `${base}${pic}`;
}

function makeProfileLink(u) {
  return `${relativePath()}/user/${encodeURIComponent(u.userslug || '')}/topics`;
}

function timeText(ms) {
  const ts = Number(ms || 0);
  if (!ts) return '最近在线';

  let diff = nowMs() - ts;
  if (diff < 0) diff = 0;

  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}小时前`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}天前`;

  return '7天前';
}

function validGeo(u, now) {
  const lat = Number(u[GEO_FIELDS.lat]);
  const lng = Number(u[GEO_FIELDS.lng]);
  const expiresAt = Number(u[GEO_FIELDS.expiresAt] || 0);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  if (!expiresAt || expiresAt <= now) return null;

  return { lat, lng };
}

function haversineKm(a, b) {
  const R = 6371;
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLng = (b.lng - a.lng) * Math.PI / 180;
  const lat1 = a.lat * Math.PI / 180;
  const lat2 = b.lat * Math.PI / 180;

  const x = Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function distanceText(km) {
  if (!Number.isFinite(km)) return '';
  if (km < 1) return '1km内';
  if (km < 3) return '3km内';
  if (km < 5) return '5km内';
  if (km < 10) return '10km内';
  if (km < 30) return '30km内';
  if (km < 100) return '同城附近';
  return '100km外';
}

function stableNoise(seed) {
  const digest = crypto.createHash('sha1').update(String(seed)).digest('hex').slice(0, 8);
  return parseInt(digest, 16) / 0xffffffff;
}

function cycleKey() {
  return Math.floor(nowMs() / SETTINGS.poolTtlMs);
}

function scoreUser(card, viewerUid, mode, extra) {
  const seed = `${mode}:${viewerUid}:${cycleKey()}:${card.uid}`;
  const noise = stableNoise(seed) * 10;
  let score = noise;

  if (card.isOnline) score += 60;
  score += Math.max(0, 40 - ((nowMs() - Number(card.lastonline || 0)) / (60 * 60 * 1000)));
  if (card.picture && !String(card.picture).includes('ui-avatars.com')) score += 5;
  if (card.bio && card.bio !== '暂无介绍') score += 5;
  if (card.age) score += 3;
  if (card.nativeCode !== '未知' && card.learnCode !== '未知') score += 8;

  if (mode === 'nearby' && extra && Number.isFinite(extra.distanceKm)) {
    score += Math.max(0, 80 - Math.min(extra.distanceKm, 80));
  }

  return score;
}

function decorateUser(u, now) {
  const nativeSource = u.language_fluent || u.native_language;
  const learnSource = u.language_learning || u.target_language;
  const nativeCodes = langCodes(nativeSource);
  const learnCodes = langCodes(learnSource);
  const nativeCode = nativeCodes[0] || firstLangCode(nativeSource);
  const learnCode = learnCodes[0] || firstLangCode(learnSource);
  const genderCode = normalizeGender(u.gender || u.sex);
  const countryCode = resolveCountryCode(u);
  const age = resolveAge(u);
  const isOnline = isOnlineUser(u, now);
  const geo = validGeo(u, now);

  return {
    uid: Number(u.uid || 0),
    username: u.username || '匿名用户',
    userslug: u.userslug || '',
    picture: makePictureUrl(u),
    genderCode,
    age,
    ageText: age ? `${age}岁` : '',
    nativeCode,
    learnCode,
    nativeCodes,
    learnCodes,
    bio: shortBio(u),
    countryCode,
    flagSrc: countryCode ? `https://flagcdn.com/w40/${countryCode}.png` : '',
    isOnline,
    statusText: isOnline ? '当前在线' : timeText(u.lastonline),
    lastonline: Number(u.lastonline || 0),
    profileLink: makeProfileLink(u),
    hasGeo: !!geo,
    geoUpdatedAt: Number(u[GEO_FIELDS.updatedAt] || 0),
    _geo: geo
  };
}

async function safeGetObject(key) {
  try {
    return await db.getObject(key);
  } catch (err) {
    winston.warn(`[peipe-partner-api] db.getObject failed for ${key}: ${err.message}`);
    return null;
  }
}

async function safeSetObject(key, data) {
  try {
    await db.setObject(key, data);
  } catch (err) {
    winston.warn(`[peipe-partner-api] db.setObject failed for ${key}: ${err.message}`);
  }
}

async function getCandidateUids() {
  const sets = ['users:online', 'users:joindate'];
  const out = [];
  const seen = new Set();

  for (const set of sets) {
    try {
      const ids = await db.getSortedSetRevRange(set, 0, SETTINGS.maxPoolScan - 1);
      for (const id of ids || []) {
        const uid = Number(id);
        if (uid > 0 && !seen.has(uid)) {
          seen.add(uid);
          out.push(uid);
        }
      }
    } catch (err) {
      winston.warn(`[peipe-partner-api] failed reading ${set}: ${err.message}`);
    }
  }

  return out;
}

async function rebuildPool() {
  const current = nowMs();
  const uids = await getCandidateUids();
  if (!uids.length) {
    memoryPool = [];
    memoryPoolBuiltAt = current;
    await safeSetObject(KEYS.pool, { data: '[]' });
    await safeSetObject(KEYS.poolMeta, { builtAt: current, count: 0 });
    return [];
  }

  const rows = await User.getUsersFields(uids, USER_FIELDS);
  const cards = [];

  for (const row of rows || []) {
    if (!row || !row.uid) continue;
    if (String(row.banned || '') === '1') continue;
    if (!isActiveUser(row, current)) continue;

    const card = decorateUser(row, current);
    if (!card.uid || !card.userslug) continue;
    cards.push(card);
  }

  cards.sort((a, b) => Number(b.lastonline || 0) - Number(a.lastonline || 0));

  memoryPool = cards;
  memoryPoolBuiltAt = current;

  await safeSetObject(KEYS.pool, { data: JSON.stringify(cards) });
  await safeSetObject(KEYS.poolMeta, { builtAt: current, count: cards.length });

  winston.info(`[peipe-partner-api] rebuilt pool: ${cards.length} cards`);
  return cards;
}

async function ensurePool() {
  const current = nowMs();

  if (memoryPool && current - memoryPoolBuiltAt < SETTINGS.poolTtlMs) {
    return memoryPool;
  }

  if (buildInFlight) return buildInFlight;

  buildInFlight = (async () => {
    const metaObj = await safeGetObject(KEYS.poolMeta);
    const builtAt = Number(metaObj && metaObj.builtAt || 0);

    if (builtAt && current - builtAt < SETTINGS.poolTtlMs) {
      const stored = await safeGetObject(KEYS.pool);
      try {
        const cards = JSON.parse(stored && stored.data || '[]');
        if (Array.isArray(cards)) {
          memoryPool = cards;
          memoryPoolBuiltAt = builtAt;
          return cards;
        }
      } catch (err) {
        winston.warn(`[peipe-partner-api] invalid stored pool json: ${err.message}`);
      }
    }

    return rebuildPool();
  })();

  try {
    return await buildInFlight;
  } finally {
    buildInFlight = null;
  }
}

async function getSeen(mode, uid) {
  if (!uid) return { ts: nowMs(), ids: [] };
  const key = KEYS.seen(mode, uid);
  const obj = await safeGetObject(key);
  const ts = Number(obj && obj.ts || 0);

  if (!ts || nowMs() - ts > SETTINGS.seenTtlMs) {
    return { ts: nowMs(), ids: [] };
  }

  const ids = String(obj && obj.ids || '')
    .split(',')
    .map(Number)
    .filter(Boolean);

  return { ts, ids };
}

async function saveSeen(mode, uid, selectedUids) {
  if (!uid || !selectedUids.length) return;

  const seen = await getSeen(mode, uid);
  const merged = [];
  const exists = new Set();

  for (const id of seen.ids.concat(selectedUids)) {
    if (!exists.has(id)) {
      exists.add(id);
      merged.push(id);
    }
  }

  const capped = merged.slice(Math.max(0, merged.length - SETTINGS.seenCap));
  await safeSetObject(KEYS.seen(mode, uid), {
    ts: nowMs(),
    ids: capped.join(',')
  });
}

function publicCard(card, extra, viewerUid) {
  const out = {
    uid: card.uid,
    username: card.username,
    userslug: card.userslug,
    picture: card.picture,
    genderCode: card.genderCode,
    age: card.age || 0,
    ageText: card.ageText || '',
    nativeCode: card.nativeCode,
    learnCode: card.learnCode,
    nativeCodes: card.nativeCodes || [],
    learnCodes: card.learnCodes || [],
    bio: card.bio,
    countryCode: card.countryCode,
    flagSrc: card.flagSrc,
    isOnline: card.isOnline,
    statusText: card.statusText,
    lastonline: card.lastonline,
    profileLink: card.profileLink,
    canChat: !!viewerUid
  };

  if (extra && extra.distanceText) out.distanceText = extra.distanceText;
  return out;
}

function parseLimit(req) {
  const limit = Number(req.query && req.query.limit || SETTINGS.defaultLimit);
  if (!Number.isFinite(limit) || limit <= 0) return SETTINGS.defaultLimit;
  return Math.min(Math.floor(limit), SETTINGS.maxLimit);
}

function parseCursor(req) {
  const raw = String(req.query && req.query.cursor || '0');
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.floor(n);
}

function parseMode(req) {
  const mode = String(req.query && req.query.mode || req.query && req.query.type || 'recommend').toLowerCase();
  return mode === 'nearby' ? 'nearby' : 'recommend';
}

function getViewerGeoFromPool(pool, viewerUid) {
  const me = pool.find(item => Number(item.uid) === Number(viewerUid));
  return me && me._geo ? me._geo : null;
}

async function getViewerGeoFromDb(viewerUid) {
  if (!viewerUid) return null;
  try {
    const fields = await User.getUserFields(viewerUid, [GEO_FIELDS.lat, GEO_FIELDS.lng, GEO_FIELDS.expiresAt]);
    return validGeo(fields || {}, nowMs());
  } catch (err) {
    winston.warn(`[peipe-partner-api] failed loading viewer geo: ${err.message}`);
    return null;
  }
}

function selectCards(items, viewerUid, limit, cursor, seenIds) {
  const seenSet = new Set((seenIds || []).map(Number));

  // Logged-in users get anti-repeat distribution. Do not apply an offset cursor to
  // this path, because the seen list is updated after every response. Applying an
  // offset after updating seen would skip valid users on page 2+.
  if (viewerUid) {
    const unseen = [];
    const repeated = [];

    for (const item of items) {
      if (seenSet.has(Number(item.card.uid))) repeated.push(item);
      else unseen.push(item);
    }

    const page = unseen.slice(0, limit);
    if (page.length < limit && repeated.length) {
      page.push(...repeated.slice(0, limit - page.length));
    }

    return {
      page,
      nextCursor: unseen.length > limit ? String(Number(cursor || 0) + 1) : ''
    };
  }

  // Anonymous visitors do not have a durable seen list, so cursor pagination is OK.
  const start = Math.min(cursor, Math.max(0, items.length));
  const page = items.slice(start, start + limit);
  const nextCursor = start + page.length < items.length ? String(start + page.length) : '';
  return { page, nextCursor };
}

async function list(req, res) {
  try {
    const viewerUid = getReqUid(req);
    const mode = parseMode(req);
    const limit = parseLimit(req);
    const cursor = parseCursor(req);
    const pool = await ensurePool();
    const current = nowMs();

    let viewerGeo = null;
    if (mode === 'nearby') {
      if (!isLoggedIn(req)) {
        return res.status(401).json({ error: 'login_required', message: '请先登录' });
      }

      viewerGeo = getViewerGeoFromPool(pool, viewerUid) || await getViewerGeoFromDb(viewerUid);
      if (!viewerGeo) {
        return res.json({
          mode,
          needLocation: true,
          users: [],
          nextCursor: '',
          refreshAfter: Math.floor(SETTINGS.poolTtlMs / 1000),
          message: '开启位置后可以发现附近语伴'
        });
      }
    }

    const candidates = [];

    for (const card of pool) {
      if (!card || !card.uid) continue;
      if (viewerUid && Number(card.uid) === Number(viewerUid)) continue;

      let extra = {};
      if (mode === 'nearby') {
        if (!card._geo) continue;
        const km = haversineKm(viewerGeo, card._geo);
        if (!Number.isFinite(km)) continue;
        extra = {
          distanceKm: km,
          distanceText: distanceText(km)
        };
      }

      candidates.push({
        card,
        extra,
        score: scoreUser(card, viewerUid || 0, mode, extra)
      });
    }

    candidates.sort((a, b) => b.score - a.score);

    const seen = await getSeen(mode, viewerUid);
    const picked = selectCards(candidates, viewerUid, limit, cursor, seen.ids);
    const selectedUids = picked.page.map(item => item.card.uid);

    await saveSeen(mode, viewerUid, selectedUids);

    return res.json({
      mode,
      needLocation: false,
      users: picked.page.map(item => publicCard(item.card, item.extra, viewerUid)),
      nextCursor: picked.nextCursor,
      refreshAfter: Math.floor(SETTINGS.poolTtlMs / 1000),
      poolCount: pool.length,
      candidateCount: candidates.length,
      locationClientTtl: Math.floor(SETTINGS.locationClientTtlMs / 1000),
      locationServerTtl: Math.floor(SETTINGS.locationServerTtlMs / 1000),
      now: current
    });
  } catch (err) {
    winston.error(`[peipe-partner-api] list failed: ${err.stack || err.message}`);
    return res.status(500).json({ error: 'internal_error', message: '语伴列表加载失败' });
  }
}

function parseLatLng(req) {
  const body = req.body || {};
  const lat = Number(body.lat);
  const lng = Number(body.lng);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;

  return {
    lat: Number(lat.toFixed(SETTINGS.geoPrecision)),
    lng: Number(lng.toFixed(SETTINGS.geoPrecision))
  };
}

async function updateLocation(req, res) {
  try {
    const uid = getReqUid(req);
    if (!uid) {
      return res.status(401).json({ error: 'login_required', message: '请先登录' });
    }

    const loc = parseLatLng(req);
    if (!loc) {
      return res.status(400).json({ error: 'invalid_location', message: '位置参数无效' });
    }

    const existing = await User.getUserFields(uid, [GEO_FIELDS.updatedAt]);
    const lastUpdatedAt = Number(existing && existing[GEO_FIELDS.updatedAt] || 0);
    const current = nowMs();

    if (lastUpdatedAt && current - lastUpdatedAt < SETTINGS.locationClientTtlMs) {
      return res.json({
        ok: true,
        skipped: true,
        reason: 'location_recently_updated',
        updatedAt: lastUpdatedAt,
        nextAllowedAt: lastUpdatedAt + SETTINGS.locationClientTtlMs
      });
    }

    const expiresAt = current + SETTINGS.locationServerTtlMs;

    await User.setUserFields(uid, {
      [GEO_FIELDS.lat]: String(loc.lat),
      [GEO_FIELDS.lng]: String(loc.lng),
      [GEO_FIELDS.updatedAt]: String(current),
      [GEO_FIELDS.expiresAt]: String(expiresAt)
    });

    // Make nearby usable immediately without waiting for the next 30-minute rebuild.
    memoryPoolBuiltAt = 0;

    return res.json({
      ok: true,
      skipped: false,
      updatedAt: current,
      expiresAt,
      nextAllowedAt: current + SETTINGS.locationClientTtlMs
    });
  } catch (err) {
    winston.error(`[peipe-partner-api] updateLocation failed: ${err.stack || err.message}`);
    return res.status(500).json({ error: 'internal_error', message: '位置保存失败' });
  }
}


async function profileStatus(req, res) {
  try {
    const uid = getReqUid(req);
    if (!uid) {
      return res.status(401).json({ error: 'login_required', message: '请先登录' });
    }

    const fields = await User.getUserFields(uid, [
      'language_flag', 'language_fluent', 'language_learning', 'gender', 'age', 'birthday', 'birthdate', 'dob'
    ]);
    const currentProfile = fields || {};
    const missing = profileMissingFields(currentProfile);

    return res.json({
      ok: true,
      complete: missing.length === 0,
      missing,
      requiredFields: PROFILE_REQUIRED_FIELDS,
      profile: {
        language_flag: currentProfile.language_flag || '',
        language_fluent: normalizeLanguageValues(currentProfile.language_fluent),
        language_learning: normalizeLanguageValues(currentProfile.language_learning),
        gender: currentProfile.gender || '',
        age: resolveAge(currentProfile) || ''
      },
      options: PARTNER_OPTIONS
    });
  } catch (err) {
    winston.error(`[peipe-partner-api] profileStatus failed: ${err.stack || err.message}`);
    return res.status(500).json({ error: 'internal_error', message: '资料状态加载失败' });
  }
}

function normalizeProfilePayload(body) {
  body = body || {};
  const country = normalizeCountryValue(body.language_flag || body.country || body.nationality);
  const fluent = normalizeLanguageValues(body.language_fluent || body.native_language || body.nativeLanguages);
  const learning = normalizeLanguageValues(body.language_learning || body.target_language || body.learningLanguages);
  const genderRaw = body.gender;
  const genderCode = normalizeGender(genderRaw);
  const age = normalizeAge(body.age);

  const data = {};
  if (country) data.language_flag = country;
  if (fluent.length) data.language_fluent = JSON.stringify(fluent);
  if (learning.length) data.language_learning = JSON.stringify(learning);
  if (genderCode) data.gender = genderCode === 'M' ? '男' : '女';
  if (age) data.age = String(age);

  const missing = profileMissingFields(data);
  return { data, missing };
}

async function updateProfile(req, res) {
  try {
    const uid = getReqUid(req);
    if (!uid) {
      return res.status(401).json({ error: 'login_required', message: '请先登录' });
    }

    const parsed = normalizeProfilePayload(req.body || {});
    if (parsed.missing.length) {
      return res.status(400).json({
        error: 'profile_incomplete',
        message: '请完整填写语伴资料',
        missing: parsed.missing,
        options: PARTNER_OPTIONS
      });
    }

    await User.setUserFields(uid, parsed.data);

    // Make list/profile changes visible immediately.
    memoryPoolBuiltAt = 0;

    return res.json({
      ok: true,
      complete: true,
      profile: parsed.data
    });
  } catch (err) {
    winston.error(`[peipe-partner-api] updateProfile failed: ${err.stack || err.message}`);
    return res.status(500).json({ error: 'internal_error', message: '资料保存失败' });
  }
}

function startScheduler() {
  if (scheduler) return;

  ensurePool().catch(err => {
    winston.warn(`[peipe-partner-api] initial pool build failed: ${err.message}`);
  });

  scheduler = setInterval(() => {
    rebuildPool().catch(err => {
      winston.warn(`[peipe-partner-api] scheduled pool build failed: ${err.message}`);
    });
  }, SETTINGS.poolTtlMs);

  if (scheduler.unref) scheduler.unref();
}

function stopScheduler() {
  if (scheduler) clearInterval(scheduler);
  scheduler = null;
}

module.exports = {
  list,
  updateLocation,
  profileStatus,
  updateProfile,
  startScheduler,
  stopScheduler,
  _private: {
    SETTINGS,
    GEO_FIELDS,
    PARTNER_OPTIONS,
    rebuildPool,
    ensurePool
  }
};

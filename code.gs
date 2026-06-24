// SECRET_KEY と SPREADSHEET_ID は、コードに直接書かず
// Apps Script の「プロジェクトの設定」→「スクリプト プロパティ」で管理します。
// 必須: SECRET_KEY, SPREADSHEET_ID
// 任意: CALENDAR_ID
var prop = PropertiesService.getScriptProperties().getProperties();

const CONFIG = {
  // URLを知っている人が開けてしまうのを少し防ぐための簡易キー。
  // スクリプト プロパティ SECRET_KEY に長いランダム文字列を設定してください。
  SECRET_KEY: prop.SECRET_KEY || '',

  // 通常は primary でOK。別カレンダーを使うならスクリプト プロパティ CALENDAR_ID かここを変更。
  CALENDAR_ID: prop.CALENDAR_ID || 'primary',

  // スクリプト プロパティ SPREADSHEET_ID に管理用スプレッドシートIDを設定してください。
  SPREADSHEET_ID: prop.SPREADSHEET_ID || '',
  TIMETABLE_SHEET_NAME: 'time_table',
  PERIOD_SHEET_NAME: 'period',
  SPECIAL_DAY_SHEET_NAME: 'special',
  INDIVIDUAL_CHANGES_SHEET_NAME: 'kobetsu',
  SETTING_SHEET_NAME: 'setting',
  TERM_SHEET_NAME: 'term',

  // 学校の時程に合わせて変更してください。
  PERIODS: [
    { id: '1', label: '1時間目', start: '08:50', end: '10:20' },
    { id: '2', label: '2時間目', start: '10:30', end: '12:00' },
    { id: 'lunch', label: '昼休み', start: '12:00', end: '13:00' },
    { id: '3', label: '3時間目', start: '13:00', end: '14:30' },
    { id: '4', label: '4時間目', start: '14:40', end: '16:10' },
    { id: '5', label: '5時間目', start: '16:20', end: '17:50' },
    { id: 'after', label: '放課後', start: '17:50', end: '18:00' },
  ],

  // JavaScriptの曜日: 0=日, 1=月, 2=火, ... 6=土
  // まずはここにベタ書き。あとでGoogle Sheets化すればOK。
  TIMETABLE: {
    1: {
      '1': '1年A組 国語',
      '2': '空き',
      '3': '2年B組 国語',
      '4': '教材研究',
      '5': '3年A組 国語',
    },
    2: {
      '1': '2年A組 国語',
      '2': '1年B組 国語',
      '3': '空き',
      '4': '3年B組 国語',
      '5': '探究',
    },
    3: {},
    4: {},
    5: {},
    6: {},
    0: {},
  },
};

const DEFAULT_DISPLAY_SETTINGS = {
  nightStart: '22:00',
  nightEnd: '06:00',
  showSeconds: true,
  refreshMinutes: 5,
  burnInShiftMinutes: 5,
  burnInShiftAmount: 12,
  maxTodayEvents: 5,
  maxTomorrowEvents: 3,
  maxTomorrowPeriods: 5,
  defaultMode: 'normal',
  nightOpacity: 0.58,
  nightBrightness: 0.72,
  appName: '置き時計',
  shortName: '置き時計',
  themeColor: '#05070a',
  backgroundColor: '#05070a',
  faviconUrl: '',
  appleTouchIconUrl: '',
  icon192Url: '',
  icon512Url: '',
  enableWakeLock: true,
  enableFullscreen: true,
  showInstallHint: true,
  showTermLabel: true,
  currentTerm: '',
};

function doGet(e) {
  const key = e?.parameter?.k || '';

  if (CONFIG.SECRET_KEY && key !== CONFIG.SECRET_KEY) {
    return HtmlService
      .createHtmlOutput('Unauthorized')
      .setTitle('Unauthorized');
  }

  if (e?.parameter?.manifest === '1') {
    return createWebAppManifestOutput(key);
  }

  const settings = getSafeDashboardSettings();
  const useLegacy = e && e.parameter && e.parameter.legacy === '1';
  const template = HtmlService.createTemplateFromFile(useLegacy ? 'legacy' : 'index');
  template.appName = settings.appName;
  template.themeColor = settings.themeColor;
  template.backgroundColor = settings.backgroundColor;
  template.manifestUrl = `?manifest=1&k=${encodeURIComponent(key)}`;
  template.faviconHref = getFaviconHref(settings);
  template.appleTouchIconHref = getAppleTouchIconHref(settings);

  const output = template
    .evaluate()
    .setTitle(settings.appName)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, viewport-fit=cover');

  // GASでは通常の <link rel="icon"> だけではファビコンが反映されない場合があるため、
  // 外部URLが指定されている場合は HtmlOutput#setFaviconUrl でも指定する。
  if (settings.faviconUrl) {
    output.setFaviconUrl(settings.faviconUrl);
  }

  return output;
}

function getSafeDashboardSettings() {
  try {
    return getDashboardSettingsFromSheet();
  } catch (error) {
    return { ...DEFAULT_DISPLAY_SETTINGS };
  }
}

function createWebAppManifestOutput(key) {
  const settings = getSafeDashboardSettings();
  const startUrl = CONFIG.SECRET_KEY
    ? `?k=${encodeURIComponent(key)}`
    : './';

  const manifest = {
    name: settings.appName,
    short_name: settings.shortName || settings.appName,
    start_url: startUrl,
    scope: './',
    display: 'standalone',
    orientation: 'any',
    background_color: settings.backgroundColor,
    theme_color: settings.themeColor,
    icons: getManifestIcons(settings),
  };

  return ContentService
    .createTextOutput(JSON.stringify(manifest, null, 2))
    .setMimeType(ContentService.MimeType.JSON);
}

function getFaviconHref(settings) {
  return settings.faviconUrl
    || settings.icon192Url
    || settings.appleTouchIconUrl
    || createIconDataUri(settings.appName, 32, settings);
}

function getAppleTouchIconHref(settings) {
  return settings.appleTouchIconUrl
    || settings.icon192Url
    || settings.icon512Url
    || settings.faviconUrl
    || createIconDataUri(settings.appName, 180, settings);
}

function getManifestIcons(settings) {
  const icon192 = settings.icon192Url
    || settings.appleTouchIconUrl
    || settings.faviconUrl
    || createIconDataUri(settings.appName, 192, settings);

  const icon512 = settings.icon512Url
    || settings.icon192Url
    || settings.appleTouchIconUrl
    || settings.faviconUrl
    || createIconDataUri(settings.appName, 512, settings);

  return [
    {
      src: icon192,
      sizes: '192x192',
      type: getImageMimeType(icon192),
      purpose: 'any maskable',
    },
    {
      src: icon512,
      sizes: '512x512',
      type: getImageMimeType(icon512),
      purpose: 'any maskable',
    },
  ];
}

function getImageMimeType(url) {
  const text = String(url || '').toLowerCase();

  if (text.startsWith('data:image/svg+xml')) return 'image/svg+xml';
  if (text.startsWith('data:image/png')) return 'image/png';
  if (text.startsWith('data:image/jpeg')) return 'image/jpeg';
  if (text.startsWith('data:image/webp')) return 'image/webp';
  if (/\.svg(\?|#|$)/.test(text)) return 'image/svg+xml';
  if (/\.webp(\?|#|$)/.test(text)) return 'image/webp';
  if (/\.jpe?g(\?|#|$)/.test(text)) return 'image/jpeg';
  if (/\.ico(\?|#|$)/.test(text)) return 'image/x-icon';

  return 'image/png';
}

function createIconDataUri(appName, size, settings = DEFAULT_DISPLAY_SETTINGS) {
  const safeName = String(appName || '置き時計');
  const initials = safeName.includes('時計') ? '時' : safeName.slice(0, 1);
  const escaped = escapeXml(initials || '時');
  const background = normalizeColorSetting(settings.backgroundColor, DEFAULT_DISPLAY_SETTINGS.backgroundColor);
  const accent = normalizeColorSetting(settings.themeColor, DEFAULT_DISPLAY_SETTINGS.themeColor);
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${Math.round(size * 0.22)}" fill="${background}"/>
  <circle cx="${size / 2}" cy="${size / 2}" r="${size * 0.34}" fill="${accent}" stroke="#f5f7fb" stroke-opacity="0.8" stroke-width="${Math.max(4, size * 0.035)}"/>
  <text x="50%" y="55%" text-anchor="middle" dominant-baseline="middle" font-family="system-ui, sans-serif" font-size="${size * 0.34}" font-weight="800" fill="#f5f7fb">${escaped}</text>
</svg>`.trim();

  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}


function getCachePrefix() {
  const props = PropertiesService.getScriptProperties();
  return props.getProperty('DASHBOARD_CACHE_PREFIX') || 'v1';
}

function makeCacheKey(key) {
  return `${getCachePrefix()}:${key}`;
}

function clearDashboardCache() {
  // CacheServiceには「このアプリのキャッシュを全部消す」APIがないため、
  // キーの先頭に付ける接頭辞を更新して、古いキャッシュを参照しないようにする。
  // 古いキャッシュは数分で自然に失効する。
  const prefix = `v${Date.now()}`;
  PropertiesService.getScriptProperties().setProperty('DASHBOARD_CACHE_PREFIX', prefix);

  return {
    ok: true,
    prefix,
    clearedAtMs: Date.now(),
  };
}

function getDashboardData() {
  const now = new Date();

  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  return {
    today: buildDayDashboardData(now),
    tomorrow: buildDayDashboardData(tomorrow),
    settings: getDashboardSettingsFromSheet(),
  };
}

function buildDayDashboardData(targetDate) {
  const calendar = CONFIG.CALENDAR_ID === 'primary'
    ? CalendarApp.getDefaultCalendar()
    : CalendarApp.getCalendarById(CONFIG.CALENDAR_ID);

  const events = calendar.getEventsForDay(targetDate)
    .map(event => ({
      title: event.getTitle(),
      startMs: event.getStartTime().getTime(),
      endMs: event.getEndTime().getTime(),
      isAllDay: event.isAllDayEvent(),
    }))
    .sort((a, b) => a.startMs - b.startMs);

  const actualDay = targetDate.getDay();
  const term = getTermForDate(targetDate);
  const dayPlan = getTodayPlan(targetDate);

  // termシートで「休業」扱いになっている日は、specialシートに明示的な行がない限り授業なしにする。
  // 例: 夏季休業・春季休業。ただし、specialにその日だけ「通常」「短縮」などを書けば上書きできる。
  const isVacationDay = Boolean(term.isVacation && !dayPlan.isExplicit);
  const timetable = isVacationDay
    ? createEmptyTimetable()
    : getTimetableFromSheet(term.id);

  // 特別日課シートで「時間割曜日」が指定されていればそれを使う。
  // 空欄なら実際の曜日を使う。
  const timetableDay = dayPlan.timetableDay !== null && dayPlan.timetableDay !== undefined
    ? dayPlan.timetableDay
    : actualDay;

  const periods = dayPlan.type === '休校' || isVacationDay
    ? []
    : getPeriodsFromSheet(dayPlan.type);

  const individualChanges = getIndividualChangesForDate(targetDate);

  const periodsToday = periods
    .map(period => {
      const timetableEntry = normalizeTimetableEntry(timetable[timetableDay]?.[period.id]);
      const individualEntry = individualChanges[period.id] || null;

      const merged = mergePeriodEntry(period, timetableEntry, individualEntry);

      if (merged.hidden) {
        return null;
      }

      return {
        ...period,
        label: merged.label || period.label,
        subject: merged.subject,
        room: merged.room,
        memo: merged.memo,
        status: merged.status,
        start: merged.start,
        end: merged.end,
        startMs: timeToDate(targetDate, merged.start).getTime(),
        endMs: timeToDate(targetDate, merged.end).getTime(),
      };
    })
    .filter(Boolean);

  return {
    nowMs: targetDate.getTime(),
    dateLabel: formatJapaneseDate(targetDate),
    scheduleType: dayPlan.type,
    scheduleMemo: dayPlan.memo,
    actualDay,
    timetableDay,
    timetableDayLabel: getDayLabel(timetableDay),
    isSubstituteTimetableDay: timetableDay !== actualDay,
    term: term.id,
    termLabel: term.label,
    termMemo: term.memo,
    termKind: term.kind,
    isVacation: isVacationDay,
    periodsToday,
    events,
  };
}

function createEmptyTimetable() {
  return {
    0: {},
    1: {},
    2: {},
    3: {},
    4: {},
    5: {},
    6: {},
  };
}

function getTermForDate(date) {
  const cache = CacheService.getScriptCache();
  const cacheKey = makeCacheKey(`term:${formatDateKey(date)}`);
  const cached = cache.get(cacheKey);

  if (cached) {
    return JSON.parse(cached);
  }

  const settings = getDashboardSettingsFromSheet();
  const manualTerm = normalizeTermId(settings.currentTerm);

  if (manualTerm) {
    const manual = findTermDefinitionById(manualTerm) || createTermObject(manualTerm, 'setting指定', '');
    cache.put(cacheKey, JSON.stringify(manual), 300);
    return manual;
  }

  const defaultTerm = createTermObject('通年', '', '授業');
  const targetKey = formatDateKey(date);
  const matchedTerms = getTermDefinitionsFromSheet()
    .filter(term => term.startKey <= targetKey && targetKey <= term.endKey)
    .sort((a, b) => {
      const priorityDiff = getTermDefinitionPriority(b) - getTermDefinitionPriority(a);
      if (priorityDiff !== 0) return priorityDiff;

      // 同じ優先度なら下の行を優先。前期の中に夏季休業を後から書く運用でも上書きできる。
      return b.rowIndex - a.rowIndex;
    });

  const term = matchedTerms[0]
    ? toTermOutput(matchedTerms[0])
    : defaultTerm;

  cache.put(cacheKey, JSON.stringify(term), 300);
  return term;
}

function getTermDefinitionsFromSheet() {
  const cache = CacheService.getScriptCache();
  const cacheKey = makeCacheKey('termDefinitions');
  const cached = cache.get(cacheKey);

  if (cached) {
    return JSON.parse(cached);
  }

  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = ss.getSheetByName(CONFIG.TERM_SHEET_NAME);

  if (!sheet) {
    cache.put(cacheKey, JSON.stringify([]), 300);
    return [];
  }

  const values = sheet.getDataRange().getValues();
  const rows = values.slice(1);
  const terms = [];

  rows.forEach((row, index) => {
    const termId = normalizeTermId(row[0]);
    const startValue = row[1];
    const endValue = row[2];
    const memo = String(row[3] || '').trim();
    const kind = normalizeTermKind(row[4], termId);

    if (!termId || !startValue || !endValue) return;

    terms.push({
      id: termId,
      label: termId,
      startKey: formatDateKey(parseSheetDate(startValue)),
      endKey: formatDateKey(parseSheetDate(endValue)),
      memo,
      kind,
      isVacation: isVacationTerm(kind, termId),
      rowIndex: index,
    });
  });

  cache.put(cacheKey, JSON.stringify(terms), 300);
  return terms;
}

function findTermDefinitionById(termId) {
  const normalized = normalizeTermId(termId);
  const match = getTermDefinitionsFromSheet()
    .filter(term => term.id === normalized)
    .sort((a, b) => b.rowIndex - a.rowIndex)[0];

  return match ? toTermOutput(match) : null;
}

function toTermOutput(termDefinition) {
  return {
    id: termDefinition.id,
    label: termDefinition.label || termDefinition.id,
    memo: termDefinition.memo || '',
    kind: termDefinition.kind || '授業',
    isVacation: Boolean(termDefinition.isVacation),
  };
}

function createTermObject(termId, memo, kind) {
  const id = normalizeTermId(termId) || '通年';
  const normalizedKind = normalizeTermKind(kind, id);

  return {
    id,
    label: id,
    memo: String(memo || '').trim(),
    kind: normalizedKind,
    isVacation: isVacationTerm(normalizedKind, id),
  };
}

function getTermDefinitionPriority(term) {
  if (term.isVacation) return 100;
  if (term.id === '通年') return 0;
  return 10;
}

function normalizeTermKind(value, termId) {
  const text = String(value || '').trim();
  if (text) return text;

  // kind列を省略しても「夏季休業」「春季休業」などのterm名なら休業扱いにする。
  return isVacationTerm('', termId) ? '休業' : '授業';
}

function isVacationTerm(kind, termId) {
  const text = `${String(kind || '')} ${String(termId || '')}`.trim().toLowerCase();
  return /休業|休暇|休み|vacation|holiday|break/.test(text);
}

function normalizeTermId(value) {
  return String(value || '')
    .trim()
    .replace(/\s+/g, '');
}

function getDashboardSettingsFromSheet() {
  const cache = CacheService.getScriptCache();
  const cacheKey = makeCacheKey('settings');
  const cached = cache.get(cacheKey);

  if (cached) {
    return JSON.parse(cached);
  }

  const settings = { ...DEFAULT_DISPLAY_SETTINGS };
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = ss.getSheetByName(CONFIG.SETTING_SHEET_NAME);

  if (!sheet) {
    cache.put(cacheKey, JSON.stringify(settings), 300);
    return settings;
  }

  const values = sheet.getDataRange().getValues();
  const rows = values.slice(1);

  rows.forEach(row => {
    const key = String(row[0] || '').trim();
    if (!key || !Object.prototype.hasOwnProperty.call(settings, key)) return;

    settings[key] = parseSettingValue(key, row[1], settings[key]);
  });

  const normalized = normalizeDashboardSettings(settings);
  cache.put(cacheKey, JSON.stringify(normalized), 300);

  return normalized;
}

function parseSettingValue(key, value, defaultValue) {
  if (value === null || value === undefined || value === '') {
    return defaultValue;
  }

  if (key === 'nightStart' || key === 'nightEnd') {
    return normalizeTime(value) || defaultValue;
  }

  if (typeof defaultValue === 'boolean') {
    if (value === true || value === false) return value;

    const text = String(value).trim().toLowerCase();
    if (['true', 'yes', 'y', 'on', '1'].includes(text)) return true;
    if (['false', 'no', 'n', 'off', '0'].includes(text)) return false;

    return defaultValue;
  }

  if (typeof defaultValue === 'number') {
    const number = Number(value);
    return Number.isFinite(number) ? number : defaultValue;
  }

  return String(value || '').trim() || defaultValue;
}

function normalizeDashboardSettings(settings) {
  const result = { ...DEFAULT_DISPLAY_SETTINGS, ...settings };

  result.refreshMinutes = clampNumber(result.refreshMinutes, 1, 60, DEFAULT_DISPLAY_SETTINGS.refreshMinutes);
  result.burnInShiftMinutes = clampNumber(result.burnInShiftMinutes, 1, 60, DEFAULT_DISPLAY_SETTINGS.burnInShiftMinutes);
  result.burnInShiftAmount = clampNumber(result.burnInShiftAmount, 0, 40, DEFAULT_DISPLAY_SETTINGS.burnInShiftAmount);
  result.maxTodayEvents = Math.round(clampNumber(result.maxTodayEvents, 0, 20, DEFAULT_DISPLAY_SETTINGS.maxTodayEvents));
  result.maxTomorrowEvents = Math.round(clampNumber(result.maxTomorrowEvents, 0, 20, DEFAULT_DISPLAY_SETTINGS.maxTomorrowEvents));
  result.maxTomorrowPeriods = Math.round(clampNumber(result.maxTomorrowPeriods, 0, 20, DEFAULT_DISPLAY_SETTINGS.maxTomorrowPeriods));
  result.nightOpacity = clampNumber(result.nightOpacity, 0.1, 1, DEFAULT_DISPLAY_SETTINGS.nightOpacity);
  result.nightBrightness = clampNumber(result.nightBrightness, 0.1, 1, DEFAULT_DISPLAY_SETTINGS.nightBrightness);

  if (!['normal', 'today', 'tomorrow'].includes(result.defaultMode)) {
    result.defaultMode = DEFAULT_DISPLAY_SETTINGS.defaultMode;
  }

  result.nightStart = normalizeTime(result.nightStart) || DEFAULT_DISPLAY_SETTINGS.nightStart;
  result.nightEnd = normalizeTime(result.nightEnd) || DEFAULT_DISPLAY_SETTINGS.nightEnd;
  result.showSeconds = Boolean(result.showSeconds);
  result.enableWakeLock = Boolean(result.enableWakeLock);
  result.enableFullscreen = Boolean(result.enableFullscreen);
  result.showInstallHint = Boolean(result.showInstallHint);
  result.showTermLabel = Boolean(result.showTermLabel);
  result.currentTerm = normalizeStringSetting(result.currentTerm, DEFAULT_DISPLAY_SETTINGS.currentTerm, 32);
  result.appName = normalizeStringSetting(result.appName, DEFAULT_DISPLAY_SETTINGS.appName, 32);
  result.shortName = normalizeStringSetting(result.shortName, result.appName, 16);
  result.themeColor = normalizeColorSetting(result.themeColor, DEFAULT_DISPLAY_SETTINGS.themeColor);
  result.backgroundColor = normalizeColorSetting(result.backgroundColor, DEFAULT_DISPLAY_SETTINGS.backgroundColor);
  result.faviconUrl = normalizeFaviconUrlSetting(result.faviconUrl, DEFAULT_DISPLAY_SETTINGS.faviconUrl);
  result.appleTouchIconUrl = normalizeImageUrlSetting(result.appleTouchIconUrl, DEFAULT_DISPLAY_SETTINGS.appleTouchIconUrl);
  result.icon192Url = normalizeImageUrlSetting(result.icon192Url, DEFAULT_DISPLAY_SETTINGS.icon192Url);
  result.icon512Url = normalizeImageUrlSetting(result.icon512Url, DEFAULT_DISPLAY_SETTINGS.icon512Url);

  return result;
}

function normalizeStringSetting(value, fallback, maxLength) {
  const text = String(value || '').trim();
  return text ? text.slice(0, maxLength) : fallback;
}

function normalizeColorSetting(value, fallback) {
  const text = String(value || '').trim();
  return /^#[0-9a-fA-F]{6}$/.test(text) ? text : fallback;
}

function normalizeFaviconUrlSetting(value, fallback) {
  const text = String(value || '').trim();
  if (!text) return fallback || '';
  if (text.length > 2048) return fallback || '';

  // HtmlOutput#setFaviconUrl は画像拡張子つきのURLが安定。
  if (/^https:\/\/.+\.(png|ico|jpg|jpeg|svg|webp)(\?.*)?$/i.test(text)) {
    return text;
  }

  return fallback || '';
}

function normalizeImageUrlSetting(value, fallback) {
  const text = String(value || '').trim();
  if (!text) return fallback || '';
  if (text.length > 4096) return fallback || '';

  if (/^https:\/\/.+\.(png|ico|jpg|jpeg|svg|webp)(\?.*)?$/i.test(text)) {
    return text;
  }

  // 既定の自動生成アイコン用。settingにdata URIを直接入れる運用は想定外だが、
  // 既存データ互換のため安全な画像data URIだけ許可する。
  if (/^data:image\/(png|jpeg|webp|svg\+xml);/i.test(text)) {
    return text;
  }

  return fallback || '';
}

function clampNumber(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
}

function timeToDate(baseDate, hhmm) {
  const [hour, minute] = hhmm.split(':').map(Number);
  const d = new Date(baseDate);
  d.setHours(hour, minute, 0, 0);
  return d;
}

function getTimetableFromSheet(activeTermId) {
  const termId = normalizeTermId(activeTermId || '通年');
  const cache = CacheService.getScriptCache();
  const cached = cache.get(makeCacheKey(`timetable:${termId}`));

  if (cached) {
    return JSON.parse(cached);
  }

  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = ss.getSheetByName(CONFIG.TIMETABLE_SHEET_NAME);

  if (!sheet) {
    throw new Error(`シート「${CONFIG.TIMETABLE_SHEET_NAME}」が見つかりません`);
  }

  const values = sheet.getDataRange().getValues();
  const rows = values.slice(1);

  const timetable = {
    0: {},
    1: {},
    2: {},
    3: {},
    4: {},
    5: {},
    6: {},
  };

  const priorities = {
    0: {},
    1: {},
    2: {},
    3: {},
    4: {},
    5: {},
    6: {},
  };

  rows.forEach(row => {
    const dayText = String(row[0] || '').trim();
    const periodId = String(row[1] || '').trim();
    const subject = String(row[2] || '').trim();
    const room = String(row[3] || '').trim();
    const memo = String(row[4] || '').trim();
    const startOverride = normalizeTime(row[5]);
    const endOverride = normalizeTime(row[6]);
    const termText = String(row[7] || '').trim();

    if (!dayText || !periodId) return;

    const day = parseDay(dayText);
    if (day === null) return;

    const termPriority = getTimetableTermPriority(termText, termId);
    if (termPriority < 0) return;

    const currentPriority = priorities[day][periodId] ?? -1;
    if (termPriority < currentPriority) return;

    timetable[day][periodId] = {
      subject,
      room,
      memo,
      startOverride,
      endOverride,
      term: termText,
    };
    priorities[day][periodId] = termPriority;
  });

  cache.put(makeCacheKey(`timetable:${termId}`), JSON.stringify(timetable), 300);

  return timetable;
}

function getTimetableTermPriority(termText, activeTermId) {
  const terms = parseTimetableTermList(termText);

  if (!terms.length || terms.includes('通年') || terms.includes('全期') || terms.includes('all')) {
    return 0;
  }

  if (terms.includes(normalizeTermId(activeTermId))) {
    return 2;
  }

  return -1;
}

function parseTimetableTermList(termText) {
  return String(termText || '')
    .split(/[,\u3001\/／\s]+/)
    .map(normalizeTermId)
    .filter(Boolean);
}


function parseDay(value) {
  const text = String(value).trim();

  const map = {
    '日': 0,
    '日曜': 0,
    '日曜日': 0,
    '0': 0,

    '月': 1,
    '月曜': 1,
    '月曜日': 1,
    '1': 1,

    '火': 2,
    '火曜': 2,
    '火曜日': 2,
    '2': 2,

    '水': 3,
    '水曜': 3,
    '水曜日': 3,
    '3': 3,

    '木': 4,
    '木曜': 4,
    '木曜日': 4,
    '4': 4,

    '金': 5,
    '金曜': 5,
    '金曜日': 5,
    '5': 5,

    '土': 6,
    '土曜': 6,
    '土曜日': 6,
    '6': 6,
  };

  return Object.prototype.hasOwnProperty.call(map, text) ? map[text] : null;
}

function getTodayPlan(date) {
  const cache = CacheService.getScriptCache();
  const cacheKey = makeCacheKey(`todayPlan:${formatDateKey(date)}`);
  const cached = cache.get(cacheKey);

  if (cached) {
    return JSON.parse(cached);
  }

  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = ss.getSheetByName(CONFIG.SPECIAL_DAY_SHEET_NAME);

  const defaultPlan = {
    type: '通常',
    memo: '',
    timetableDay: null,
    isExplicit: false,
  };

  if (!sheet) {
    return defaultPlan;
  }

  const targetKey = formatDateKey(date);
  const values = sheet.getDataRange().getValues();
  const rows = values.slice(1);

  for (const row of rows) {
    const dateValue = row[0];
    const type = String(row[1] || '').trim();
    const memo = String(row[2] || '').trim();
    const timetableDayText = String(row[3] || '').trim();

    if (!dateValue || !type) continue;

    const rowKey = formatDateKey(parseSheetDate(dateValue));

    if (rowKey === targetKey) {
      const parsedTimetableDay = timetableDayText
        ? parseDay(timetableDayText)
        : null;

      const plan = {
        type,
        memo,
        timetableDay: parsedTimetableDay,
        isExplicit: true,
      };

      cache.put(cacheKey, JSON.stringify(plan), 300);
      return plan;
    }
  }

  cache.put(cacheKey, JSON.stringify(defaultPlan), 300);
  return defaultPlan;
}

function getPeriodsFromSheet(scheduleType) {
  const cache = CacheService.getScriptCache();
  const cacheKey = makeCacheKey(`periods:${scheduleType}`);
  const cached = cache.get(cacheKey);

  if (cached) {
    return JSON.parse(cached);
  }

  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = ss.getSheetByName(CONFIG.PERIOD_SHEET_NAME);

  if (!sheet) {
    return CONFIG.PERIODS;
  }

  const values = sheet.getDataRange().getValues();
  const rows = values.slice(1);

  const periods = rows
    .filter(row => String(row[0] || '').trim() === scheduleType)
    .map(row => ({
      id: String(row[1] || '').trim(),
      label: String(row[2] || '').trim(),
      start: normalizeTime(row[3]),
      end: normalizeTime(row[4]),
    }))
    .filter(period => period.id && period.label && period.start && period.end);

  const result = periods.length ? periods : CONFIG.PERIODS;

  cache.put(cacheKey, JSON.stringify(result), 300);
  return result;
}

function normalizeTime(value) {
  const timezone = Session.getScriptTimeZone();

  if (value instanceof Date) {
    return Utilities.formatDate(value, timezone, 'HH:mm');
  }

  if (typeof value === 'number') {
    const totalMinutes = Math.round(value * 24 * 60);
    const hour = Math.floor(totalMinutes / 60);
    const minute = totalMinutes % 60;
    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  }

  return String(value || '').trim();
}

function parseSheetDate(value) {
  if (value instanceof Date) {
    return value;
  }

  return new Date(value);
}

function formatDateKey(date) {
  return Utilities.formatDate(
    date,
    Session.getScriptTimeZone(),
    'yyyy-MM-dd'
  );
}

function formatJapaneseDate(date) {
  const weekdays = ['日', '月', '火', '水', '木', '金', '土'];

  return Utilities.formatDate(
    date,
    Session.getScriptTimeZone(),
    `yyyy年M月d日 ${weekdays[date.getDay()]}曜日`
  );
}

function getDayLabel(day) {
  const labels = ['日', '月', '火', '水', '木', '金', '土'];
  return labels[day] || '';
}

function normalizeTimetableEntry(entry) {
  if (!entry) {
    return {
      subject: '',
      room: '',
      memo: '',
      startOverride: '',
      endOverride: '',
      term: '',
    };
  }

  // 古い形式 timetable[day][periodId] = '授業名' との互換用
  if (typeof entry === 'string') {
    return {
      subject: entry,
      room: '',
      memo: '',
      startOverride: '',
      endOverride: '',
      term: '',
    };
  }

  return {
    subject: entry.subject || '',
    room: entry.room || '',
    memo: entry.memo || '',
    startOverride: entry.startOverride || '',
    endOverride: entry.endOverride || '',
    term: entry.term || '',
  };
}

function getIndividualChangesForDate(date) {
  const cache = CacheService.getScriptCache();
  const cacheKey = makeCacheKey(`individualChanges:${formatDateKey(date)}`);
  const cached = cache.get(cacheKey);

  if (cached) {
    return JSON.parse(cached);
  }

  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = ss.getSheetByName(CONFIG.INDIVIDUAL_CHANGES_SHEET_NAME);

  if (!sheet) {
    return {};
  }

  const targetKey = formatDateKey(date);
  const values = sheet.getDataRange().getValues();
  const rows = values.slice(1);

  const changes = {};

  rows.forEach(row => {
    const dateValue = row[0];
    const periodId = String(row[1] || '').trim();

    if (!dateValue || !periodId) return;

    const rowKey = formatDateKey(parseSheetDate(dateValue));
    if (rowKey !== targetKey) return;

    const subject = String(row[2] || '').trim();
    const room = String(row[3] || '').trim();
    const memo = String(row[4] || '').trim();
    const startOverride = normalizeTime(row[5]);
    const endOverride = normalizeTime(row[6]);
    const status = String(row[7] || '変更').trim();

    changes[periodId] = {
      subject,
      room,
      memo,
      startOverride,
      endOverride,
      status,
    };
  });

  cache.put(cacheKey, JSON.stringify(changes), 300);

  return changes;
}

function mergePeriodEntry(period, timetableEntry, individualEntry) {
  const base = {
    label: period.label,
    subject: timetableEntry.subject || '',
    room: timetableEntry.room || '',
    memo: timetableEntry.memo || '',
    status: '',
    start: timetableEntry.startOverride || period.start,
    end: timetableEntry.endOverride || period.end,
    hidden: false,
  };

  if (!individualEntry) {
    return base;
  }

  const status = individualEntry.status || '変更';

  if (status === '削除') {
    return {
      ...base,
      hidden: true,
    };
  }

  if (status === '休講') {
    return {
      ...base,
      subject: individualEntry.subject || '休講',
      room: individualEntry.room || '',
      memo: individualEntry.memo || base.memo,
      status,
      start: individualEntry.startOverride || base.start,
      end: individualEntry.endOverride || base.end,
    };
  }

  return {
    ...base,
    subject: individualEntry.subject || base.subject,
    room: individualEntry.room || base.room,
    memo: individualEntry.memo || base.memo,
    status,
    start: individualEntry.startOverride || base.start,
    end: individualEntry.endOverride || base.end,
  };
}

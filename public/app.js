const app = document.querySelector('#app');
const breadcrumbs = document.querySelector('#breadcrumbs');
const sidebar = document.querySelector('#sidebar');
const toast = document.querySelector('#toast');
const searchModal = document.querySelector('#search-modal');
const searchInput = document.querySelector('#global-search');
const searchResults = document.querySelector('#search-results');
const authModal = document.querySelector('#auth-modal');
const authForm = document.querySelector('#auth-form');
// 교재 PDF 는 정적 루트 밖(private/)에 있고, 인증된 요청에만 응답한다.
// 같은 출처이므로 세션 쿠키가 자동으로 붙어 iframe 과 다운로드 모두 동작한다.
const PDF_URL = '/api/pdf';
const PDF_DOWNLOAD_URL = '/api/pdf?download=1';

const icons = {
  arrow: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>',
  play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 10 7-10 7V5Z" /></svg>',
  book: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5v-16ZM4 5.5v16M7 7h9M7 11h9" /></svg>',
  pen: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 20 4.2-1 10.9-10.9a2.1 2.1 0 0 0-3-3L5.2 16 4 20Z" /><path d="m13.8 6.2 4 4M4.5 20h5" /></svg>',
  star: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 2.2 4.45 4.9.71-3.55 3.46.84 4.88L12 14.2l-4.39 2.3.84-4.88L4.9 8.16l4.9-.71L12 3Z" /></svg>',
  clock: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5" /><path d="M12 7v5l3 2" /></svg>',
  check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4.5 4.5L19 7" /></svg>',
  bookmark: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 4.5A1.5 1.5 0 0 1 7.5 3h9A1.5 1.5 0 0 1 18 4.5V21l-6-3.5L6 21V4.5Z" /></svg>',
  rotate: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12a8 8 0 1 0 2.3-5.65L4 8.7" /><path d="M4 4v4.7h4.7" /></svg>',
  chart: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 19V5M4 19h16" /><path d="m7 15 3-4 3 2 5-7" /></svg>',
  search: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4 4" /></svg>',
  chevron: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>',
  info: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5" /><path d="M12 10v6M12 7.2v.1" /></svg>'
};

// 학습 콘텐츠(단원·문제)는 서버에서 받아온다.
// 로그인하지 않으면 /api/content 가 401 을 주므로, 정적 파일만 내려받아서는 문제를 볼 수 없다.
let units = [];
let questionBank = [];
let mockQuestions = [];
let aiMockQuestions = [];
let mockSets = [];
let contentLoaded = false;

function applyContent(payload) {
  const source = payload && typeof payload === "object" ? payload : {};
  units = Array.isArray(source.units) ? source.units : [];
  questionBank = Array.isArray(source.questionBank) ? source.questionBank : [];
  mockQuestions = Array.isArray(source.mockQuestions) ? source.mockQuestions : [];
  aiMockQuestions = Array.isArray(source.aiMockQuestions) ? source.aiMockQuestions : [];
  mockSets = Array.isArray(source.mockSets) ? source.mockSets : [];
  contentLoaded = units.length > 0 && questionBank.length > 0;
}

function clearContent() {
  units = [];
  questionBank = [];
  mockQuestions = [];
  aiMockQuestions = [];
  mockSets = [];
  contentLoaded = false;
}

// --- 서버 API ---------------------------------------------------------------
// 계정과 학습 기록은 전부 서버 DB 에 있다. 브라우저에는 아무것도 저장하지 않는다.
// (세션은 HttpOnly 쿠키라 JS 에서 읽을 수 없다.)

const API_BASE = '/api';

class ApiError extends Error {
  constructor(status, code, message) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

async function apiRequest(method, path, body) {
  const options = {
    method,
    credentials: 'same-origin',
    headers: { Accept: 'application/json' }
  };
  if (body !== undefined) {
    options.headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(body);
  }

  let response;
  try {
    response = await fetch(API_BASE + path, options);
  } catch (error) {
    throw new ApiError(0, 'NETWORK_ERROR', '서버에 연결할 수 없어요. 서버가 실행 중인지 확인해주세요.');
  }

  let payload = null;
  if (response.status !== 204) {
    try {
      payload = await response.json();
    } catch (error) {
      payload = null;
    }
  }

  if (!response.ok) {
    const detail = (payload && payload.error) || {};
    // 세션이 끊겼으면 즉시 로그인 화면으로 되돌린다.
    if (response.status === 401 && !['/auth/me', '/auth/login', '/auth/logout'].includes(path)) {
      handleSessionExpired();
    }
    throw new ApiError(response.status, detail.code || 'REQUEST_FAILED', detail.message || '요청을 처리하지 못했어요.');
  }

  return payload ? payload.data : null;
}

const api = {
  get: (path) => apiRequest('GET', path),
  post: (path, body) => apiRequest('POST', path, body === undefined ? {} : body),
  put: (path, body) => apiRequest('PUT', path, body === undefined ? {} : body),
  del: (path) => apiRequest('DELETE', path)
};

// --- 세션 -------------------------------------------------------------------
// 로그인 여부와 역할은 오직 서버 응답(/api/auth/me)으로만 판단한다.

let session = null;
let authMode = 'login';
let examTimerId = null;
let firstUserWillBeAdmin = false;
let legacyImportCandidate = null;
let resumeSaveTimer = null;

function isAuthenticated() { return Boolean(session); }
function isAdmin() { return Boolean(session && session.role === 'admin'); }

function emptyStudyState() {
  return { bookmarked: [], history: {}, wrongIds: [], resumeQuestionId: 'q-01' };
}

function normalizeStudyState(source = {}) {
  const history = source && source.history && typeof source.history === 'object' && !Array.isArray(source.history) ? source.history : {};
  return {
    bookmarked: Array.isArray(source.bookmarked) ? [...new Set(source.bookmarked)] : [],
    history: { ...history },
    wrongIds: Array.isArray(source.wrongIds) ? [...new Set(source.wrongIds)] : [],
    resumeQuestionId: typeof source.resumeQuestionId === 'string' ? source.resumeQuestionId : 'q-01'
  };
}

// --- 예전 버전의 localStorage 데이터 --------------------------------------
// 이전 버전은 계정과 평문 비밀번호를 브라우저에 저장했다.
// 비밀번호와 계정은 절대 이관하지 않는다. 학습 기록만, 사용자가 동의할 때 한 번 가져온다.

const LEGACY_ACCOUNT_KEY = 'certain-users-v1';
const LEGACY_SESSION_KEY = 'certain-session-v1';
const LEGACY_V0_KEYS = ['certain-bookmarks', 'certain-history', 'certain-wrong', 'certain-resume-question'];

function safeGetItem(key) {
  try { return localStorage.getItem(key); } catch (error) { return null; }
}

function safeSetItem(key, value) {
  try { localStorage.setItem(key, value); return true; } catch (error) { return false; }
}

function safeRemoveItem(key) {
  try { localStorage.removeItem(key); } catch (error) { /* 저장소를 못 써도 앱은 동작한다 */ }
}

function normalizeLoginId(value) {
  return String(value === null || value === undefined ? '' : value).normalize('NFKC').trim().toLowerCase();
}

// v0 키와 예전 세션 표시는 더 이상 쓰지 않으므로 정리한다.
// 계정 저장소(certain-users-v1)는 학습 기록 가져오기에 필요하므로 남겨둔다.
LEGACY_V0_KEYS.forEach((key) => safeRemoveItem(key));
safeRemoveItem(LEGACY_SESSION_KEY);

function readLegacyAccounts() {
  try {
    const raw = safeGetItem(LEGACY_ACCOUNT_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
  } catch (error) {
    return null;
  }
}

/**
 * 로그인한 아이디와 같은 예전 기록이 이 브라우저에 있는지 확인한다.
 * 비밀번호는 읽지도, 보내지도 않는다.
 */
function findLegacyStudyState(loginId) {
  const accounts = readLegacyAccounts();
  if (!accounts) return null;

  const target = normalizeLoginId(loginId);
  for (const [key, record] of Object.entries(accounts)) {
    if (normalizeLoginId(key) !== target) continue;
    if (!record || typeof record !== 'object') continue;
    const study = normalizeStudyState(record.study);
    const count = study.bookmarked.length + study.wrongIds.length + Object.keys(study.history).length;
    if (!count) return null;
    return { key, study, count, bookmarks: study.bookmarked.length, wrongs: study.wrongIds.length };
  }
  return null;
}

/** 가져오기를 마친 계정 항목은 브라우저에서 지운다(평문 비밀번호도 함께 사라진다). */
function forgetLegacyAccount(key) {
  const accounts = readLegacyAccounts();
  if (!accounts) return;
  delete accounts[key];
  if (Object.keys(accounts).length === 0) safeRemoveItem(LEGACY_ACCOUNT_KEY);
  else safeSetItem(LEGACY_ACCOUNT_KEY, JSON.stringify(accounts));
}

// state 초기화가 getRoute() 를 호출하므로 이 상수는 반드시 그 앞에 있어야 한다.
const STUDY_ROUTES = ['dashboard', 'learn', 'study', 'practice', 'mock', 'notes', 'pdf'];

const state = {
  route: getRoute(),
  selectedUnit: 'deploy',
  learnScope: 'all',
  mockScope: 'all',
  mockUnitFilter: 'deploy',
  practiceIndex: 0,
  practiceFilter: 'all',
  practiceUnit: null,
  practiceSelected: null,
  practiceSubmitted: false,
  ...emptyStudyState(),
  examActive: false,
  examMode: 'book',
  examUnitFilter: 'all',
  examSet: 1,
  examIndex: 0,
  examAnswers: {},
  examSubmitted: false,
  examQuestionIds: [],
  examTimeLeft: 0
};

function getRoute() {
  const route = window.location.hash.replace('#', '').split('/')[0];
  if (route === 'admin') return 'admin';
  return STUDY_ROUTES.includes(route) ? route : 'dashboard';
}

// 콘텐츠를 아직 못 받았을 때(로그아웃 상태)도 렌더러가 죽지 않도록 빈 단원을 돌려준다.
const EMPTY_UNIT = { id: '', number: '00', title: '', code: '', description: '', goal: '', topics: [], highlight: '' };

function getUnit(id) { return units.find((unit) => unit.id === id) || units[0] || EMPTY_UNIT; }
function getQuestion(id) { return questionBank.find((question) => question.id === id); }
function getAiQuestion(id) { return aiMockQuestions.find((question) => question.id === id); }

function shuffleQuestions(list) {
  const shuffled = [...list];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
  }
  return shuffled;
}
// --- 학습 상태 동기화 -------------------------------------------------------
// 저장은 전부 서버 API 로 한다. 게스트(비로그인) 저장은 존재하지 않는다.

function reportSyncError(error) {
  // 401 은 이미 게이트로 되돌리는 처리를 했으므로 토스트를 겹쳐 띄우지 않는다.
  if (error instanceof ApiError && error.status === 401) return;
  showToast(error && error.message ? error.message : '저장하지 못했어요.');
}

function applyServerStudyState(next) {
  Object.assign(state, normalizeStudyState(next));
}

/** 학습 상태 전체를 서버에 밀어 넣는다. 개별 API 로 처리하기 어려운 경우에만 쓴다. */
async function pushStudyState() {
  if (!isAuthenticated()) return;
  try {
    applyServerStudyState(await api.put('/study/state', { state: normalizeStudyState(state) }));
  } catch (error) {
    reportSyncError(error);
  }
}

/** 이어풀기 위치는 문제를 넘길 때마다 바뀌므로 디바운스해서 보낸다. */
function saveResumeQuestion(questionId) {
  window.clearTimeout(resumeSaveTimer);
  resumeSaveTimer = window.setTimeout(() => {
    if (!isAuthenticated()) return;
    api.put('/study/resume', { questionId }).catch(reportSyncError);
  }, 500);
}

function setResumeQuestion(questionId) {
  if (!questionId) return;
  state.resumeQuestionId = questionId;
  saveResumeQuestion(questionId);
}

function resetTransientState() {
  state.practiceIndex = 0;
  state.practiceFilter = 'all';
  state.practiceUnit = null;
  state.practiceSelected = null;
  state.practiceSubmitted = false;
  state.examActive = false;
  state.examAnswers = {};
  state.examSubmitted = false;
  state.examQuestionIds = [];
  state.examTimeLeft = 0;
}

function applyStudyState(study) {
  Object.assign(state, normalizeStudyState(study));
  resetTransientState();
}

function setAuthMessage(message, isError = true) {
  const messageElement = document.querySelector('#auth-message');
  if (!messageElement) return;
  messageElement.textContent = message;
  messageElement.classList.toggle('is-error', isError);
  messageElement.classList.toggle('is-success', !isError);
}

function updateAuthModal() {
  if (!authModal) return;
  const isRegister = authMode === 'register';
  const title = document.querySelector('#auth-title');
  const description = document.querySelector('#auth-description');
  const confirmField = document.querySelector('#auth-password-confirm-field');
  const submit = document.querySelector('#auth-submit');
  const switchButton = document.querySelector('#auth-switch');
  const adminNotice = document.querySelector('#auth-admin-notice');
  if (title) title.textContent = isRegister ? '회원가입' : '로그인';
  if (description) description.textContent = isRegister ? '아이디와 비밀번호를 만들면 학습 기록이 서버에 저장돼요.' : '로그인해야 단원 학습·문제 풀이·모의고사·오답노트·교재 PDF를 이용할 수 있어요.';
  if (confirmField) confirmField.hidden = !isRegister;
  if (submit) {
    submit.textContent = isRegister ? '계정 만들기' : '로그인';
    submit.disabled = false;
  }
  if (switchButton) switchButton.textContent = isRegister ? '이미 계정이 있어요 · 로그인' : '처음이에요 · 회원가입';
  // 첫 가입자는 관리자가 된다는 사실을 회원가입 화면에서만 알린다.
  if (adminNotice) adminNotice.hidden = !(isRegister && firstUserWillBeAdmin);
  setAuthMessage('');
}

/** 로그인 전에는 인증 창을 닫을 수 없다(공부 화면이 뒤에 없기 때문). */
function isAuthLocked() {
  return !isAuthenticated();
}

function openAuth(mode = 'login') {
  if (!authModal) return;
  authMode = mode;
  updateAuthModal();
  authModal.classList.add('is-open');
  authModal.classList.toggle('is-locked', isAuthLocked());
  authModal.setAttribute('aria-hidden', 'false');
  const closeButton = authModal.querySelector('.auth-close');
  if (closeButton) closeButton.hidden = isAuthLocked();
  window.setTimeout(() => document.querySelector('#auth-id')?.focus(), 30);
}

function closeAuth() {
  if (!authModal) return;
  // 비로그인 상태에서는 닫기를 무시한다.
  if (isAuthLocked()) return;
  authModal.classList.remove('is-open');
  authModal.classList.remove('is-locked');
  authModal.setAttribute('aria-hidden', 'true');
  authForm?.reset();
  setAuthMessage('');
}

async function handleAuthSubmit(event) {
  event.preventDefault();
  const idInput = document.querySelector('#auth-id');
  const passwordInput = document.querySelector('#auth-password');
  const confirmInput = document.querySelector('#auth-password-confirm');
  const submit = document.querySelector('#auth-submit');
  const loginId = idInput?.value.trim() || '';
  const password = passwordInput?.value || '';
  const isRegister = authMode === 'register';

  // 아래 검사는 사용자 경험을 위한 것이다. 실제 강제는 서버가 다시 한다.
  if (!/^[a-z0-9가-힣_-]{1,20}$/i.test(normalizeLoginId(loginId))) {
    setAuthMessage('아이디는 영문·숫자·한글·_·-만 사용할 수 있어요.');
    return;
  }
  if (password.length < 4) {
    setAuthMessage('비밀번호는 4자 이상 입력해주세요.');
    return;
  }
  if (isRegister && password !== (confirmInput?.value || '')) {
    setAuthMessage('비밀번호가 서로 달라요.');
    return;
  }

  if (submit) submit.disabled = true;
  setAuthMessage(isRegister ? '계정을 만드는 중이에요…' : '로그인하는 중이에요…', false);

  try {
    const result = isRegister
      ? await api.post('/auth/register', { loginId, password, passwordConfirm: confirmInput?.value || '' })
      : await api.post('/auth/login', { loginId, password });

    session = result.user;
    await enterAuthenticatedApp();

    if (isRegister && result.grantedAdmin) {
      showToast(`${session.loginId}님, 첫 번째 계정이라 관리자 권한이 부여됐어요.`);
    } else if (isRegister) {
      showToast(`${session.loginId}님 계정이 만들어졌어요. 학습 기록이 서버에 저장됩니다.`);
    } else {
      showToast(`${session.loginId}님으로 로그인했어요. 학습 기록을 불러왔습니다.`);
    }
  } catch (error) {
    setAuthMessage(error && error.message ? error.message : '요청을 처리하지 못했어요.');
  } finally {
    if (submit) submit.disabled = false;
  }
}

async function logout() {
  stopExamTimer();
  window.clearTimeout(resumeSaveTimer);
  try {
    await api.post('/auth/logout');
  } catch (error) {
    // 서버에 닿지 못해도 로컬 세션은 버린다.
  }
  session = null;
  await refreshBootstrapStatus();
  leaveAuthenticatedApp();
  showToast('로그아웃했어요. 다시 로그인해야 학습 기능을 이용할 수 있습니다.');
}

/** 세션이 만료되었거나 서버에서 폐기된 경우. */
function handleSessionExpired() {
  if (!session) return;
  session = null;
  stopExamTimer();
  window.clearTimeout(resumeSaveTimer);
  leaveAuthenticatedApp();
  showToast('로그인이 만료되었어요. 다시 로그인해주세요.');
}

/**
 * 헤더/사이드바에 서버가 알려준 사용자 정보를 반영한다.
 * 역할 표시는 서버 응답(session.role)만 근거로 삼는다.
 */
function updateAccountUI() {
  const user = session;
  const profileName = document.querySelector('#profile-name');
  const profileStatus = document.querySelector('#profile-status');
  const profileAction = document.querySelector('#profile-auth-action');
  const topAvatar = document.querySelector('#top-avatar');
  const profileAvatar = document.querySelector('#profile-avatar');
  const headerGuestActions = document.querySelector('#header-guest-actions');
  const headerUserActions = document.querySelector('#header-user-actions');
  const headerUserName = document.querySelector('#header-user-name');
  const headerRoleBadge = document.querySelector('#header-user-role');
  const profileRole = document.querySelector('#profile-role');
  const adminNav = document.querySelector('.nav-item[data-route="admin"]');

  if (profileName) profileName.textContent = user ? user.loginId : '로그인 필요';
  if (profileStatus) profileStatus.textContent = user ? '학습 기록이 서버에 저장됩니다' : '로그인해야 이용할 수 있어요';
  if (profileAction) {
    profileAction.textContent = user ? '로그아웃' : '로그인';
    profileAction.dataset.action = user ? 'logout' : 'open-auth';
  }

  const initial = user && user.loginId ? user.loginId.slice(0, 1).toUpperCase() : '?';
  if (topAvatar) topAvatar.textContent = initial;
  if (profileAvatar) profileAvatar.textContent = initial;

  if (headerGuestActions) headerGuestActions.hidden = Boolean(user);
  if (headerUserActions) headerUserActions.hidden = !user;
  if (headerUserName) headerUserName.textContent = user ? `${user.loginId}님` : '';

  const roleLabel = isAdmin() ? '관리자' : '학습자';
  if (headerRoleBadge) {
    headerRoleBadge.textContent = user ? roleLabel : '';
    headerRoleBadge.hidden = !user;
    headerRoleBadge.classList.toggle('is-admin', isAdmin());
  }
  if (profileRole) {
    profileRole.textContent = user ? roleLabel : '';
    profileRole.hidden = !user;
    profileRole.classList.toggle('is-admin', isAdmin());
  }

  // 관리자 메뉴를 숨기는 것은 편의일 뿐이다. 실제 차단은 서버의 requireRole 이 한다.
  if (adminNav) adminNav.hidden = !isAdmin();
}

function updateMockTimeLabels() {
  if (state.route !== 'mock') return;
  if (!state.examActive) {
    const aiCard = document.querySelector('.ai-mock-card');
    const aiTime = aiCard?.querySelector('.mock-meta span');
    if (aiTime) aiTime.innerHTML = `${icons.clock}${state.mockScope === 'all' ? '60분' : '10분'}`;
    return;
  }
  if (state.examMode !== 'ai') return;
  const fullExam = state.examUnitFilter === 'all';
  const timer = document.querySelector('.timer');
  const examStats = document.querySelectorAll('.exam-side .mini-stat strong');
  if (timer) timer.innerHTML = `${icons.clock} ${formatExamTime(state.examTimeLeft || (fullExam ? 3600 : 600))}`;
  if (examStats[2]) examStats[2].textContent = fullExam ? '60분' : '10분';
}

function examDurationSeconds(mode, unitFilter) {
  if (mode === 'ai') return unitFilter === 'all' ? 60 * 60 : 10 * 60;
  return 30 * 60;
}

function formatExamTime(seconds) {
  const safeSeconds = Math.max(0, Number(seconds) || 0);
  const minutes = Math.floor(safeSeconds / 60).toString().padStart(2, '0');
  const remainder = Math.floor(safeSeconds % 60).toString().padStart(2, '0');
  return `${minutes}:${remainder}`;
}

function stopExamTimer() {
  if (examTimerId) window.clearInterval(examTimerId);
  examTimerId = null;
}

function startExamTimer() {
  stopExamTimer();
  examTimerId = window.setInterval(() => {
    if (!state.examActive) { stopExamTimer(); return; }
    state.examTimeLeft = Math.max(0, state.examTimeLeft - 1);
    updateMockTimeLabels();
    if (state.examTimeLeft === 0) {
      stopExamTimer();
      state.examActive = false;
      showToast('시험 시간이 끝났어요.');
      render();
    }
  }, 1000);
}

function resumePractice() {
  const questionIndex = questionBank.findIndex((question) => question.id === state.resumeQuestionId);
  state.practiceFilter = 'all';
  state.practiceUnit = null;
  state.practiceIndex = questionIndex >= 0 ? questionIndex : 0;
  state.practiceSelected = null;
  state.practiceSubmitted = false;
  navigate('practice');
}

async function resetState() {
  if (!isAuthenticated()) return;
  if (!window.confirm('저장된 북마크, 오답 기록, 이어 풀기 위치를 모두 초기화할까요?')) return;
  stopExamTimer();
  state.learnScope = 'all';
  state.mockScope = 'all';
  state.mockUnitFilter = 'deploy';
  state.practiceIndex = 0;
  state.practiceSelected = null;
  state.practiceSubmitted = false;
  state.examActive = false;
  state.examAnswers = {};
  state.examSubmitted = false;
  state.examQuestionIds = [];
  state.examTimeLeft = 0;

  try {
    applyServerStudyState(await api.del('/study/state'));
    showToast('학습 기록을 초기화했어요.');
  } catch (error) {
    reportSyncError(error);
  }
  render();
}

function navigate(route) {
  // 비로그인 상태에서는 어떤 공부 화면으로도 이동할 수 없다.
  if (!isAuthenticated()) {
    openAuth('login');
    return;
  }
  if (route === 'admin' && !isAdmin()) {
    showToast('관리자만 이용할 수 있는 메뉴예요.');
    return;
  }
  state.route = route;
  if (window.location.hash !== `#${route}`) window.location.hash = route;
  closeSidebar();
  window.scrollTo({ top: 0, behavior: 'smooth' });
  render();
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('is-visible');
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove('is-visible'), 2600);
}

function closeSidebar() { sidebar.classList.remove('is-open'); }

function setBreadcrumb(label) {
  const base = '<span>학습 공간</span><b>/</b>';
  breadcrumbs.innerHTML = `${base}<strong>${label}</strong>`;
}

function updateNav() {
  document.querySelectorAll('.nav-item[data-route]').forEach((item) => item.classList.toggle('is-active', item.dataset.route === state.route || (state.route === 'study' && item.dataset.route === 'learn')));
}

function render() {
  updateAccountUI();

  // 게이트: 로그인하지 않았거나 콘텐츠를 아직 못 받았으면 공부 화면을 그리지 않는다.
  if (!isAuthenticated() || !contentLoaded) {
    app.innerHTML = '';
    setBreadcrumb('로그인');
    return;
  }

  // 권한이 없는 라우트에 남아 있으면 대시보드로 되돌린다.
  if (state.route === 'admin' && !isAdmin()) state.route = 'dashboard';

  updateNav();
  if (state.route === 'dashboard') { setBreadcrumb('대시보드'); app.innerHTML = renderDashboard(); }
  if (state.route === 'learn') { setBreadcrumb('단원 학습'); app.innerHTML = renderLearn(); }
  if (state.route === 'study') { setBreadcrumb(`${getUnit(state.selectedUnit).title} · 학습`); app.innerHTML = renderStudy(); }
  if (state.route === 'practice') { setBreadcrumb('문제 풀기'); app.innerHTML = renderPractice(); }
  if (state.route === 'mock') { setBreadcrumb(state.examActive ? `${state.examMode === 'ai' ? 'AI ' : ''}${state.examSet}회 모의고사` : '모의고사 풀기'); app.innerHTML = state.examActive ? renderExam() : renderMock(); }
  if (state.route === 'notes') { setBreadcrumb('오답노트'); app.innerHTML = renderNotes(); }
  if (state.route === 'pdf') { setBreadcrumb('교재 원본 PDF'); app.innerHTML = renderPdfViewer(); }
  if (state.route === 'admin') { setBreadcrumb('계정 관리'); app.innerHTML = renderAdmin(); loadAdminUsers(); }
  updateMockTimeLabels();
}

function renderPdfViewer() {
  return `
    <div class="screen-toolbar pdf-screen-toolbar">
      <div><div class="eyebrow">REFERENCE PDF</div><h1 class="page-title">교재 원본 PDF</h1><p class="page-subtitle">학습 내용과 문제의 원문을 확인할 때 사용하는 교재입니다. 브라우저 안에서 페이지를 넘기며 바로 볼 수 있어요.</p></div>
      <div class="toolbar-actions"><a class="button button-secondary" href="${PDF_URL}" target="_blank" rel="noopener">새 탭에서 열기 ${icons.arrow}</a><a class="button button-primary" href="${PDF_DOWNLOAD_URL}">PDF 저장 ${icons.arrow}</a></div>
    </div>
    <section class="pdf-viewer-layout">
      <div class="pdf-frame-wrap"><iframe class="pdf-frame" src="${PDF_URL}#view=FitH" title="정보처리산업기사 학습교재 원본 PDF"></iframe></div>
      <aside class="pdf-info-panel"><div class="eyebrow">PDF REFERENCE</div><h2>원문을 옆에 두고 공부하세요.</h2><p>단원 학습이나 문제 풀이 중 교재 표현과 페이지를 확인할 때 사용할 수 있습니다.</p><div class="pdf-info-list"><div><span>파일</span><strong>SW개발 학습교재</strong></div><div><span>구성</span><strong>9개 단원 · 모의평가</strong></div><div><span>사용법</span><strong>스크롤 · 확대 · 페이지 검색</strong></div></div><a class="text-button pdf-download-link" href="${PDF_DOWNLOAD_URL}">원본 파일 다운로드 ${icons.arrow}</a></aside>
    </section>`;
}

function renderDashboard() {
  const resumeQuestion = getQuestion(state.resumeQuestionId) || questionBank[0];
  const resumeUnit = getUnit(resumeQuestion.unit);
  return `
    <div class="stack-gap">
      <section class="hero">
        <div class="hero-copy">
          <div class="eyebrow">오늘 공부</div>
          <h1>오늘 공부할 내용을<br /><span>골라보세요.</span></h1>
          <p>개념을 읽거나 문제를 풀면서 정보처리산업기사 필기 내용을 차근차근 정리해보세요.</p>
          <div class="hero-actions">
            <button class="button button-primary" data-action="resume-practice">이어서 풀기 ${icons.arrow}</button>
            <button class="button button-secondary" data-action="go-mock">모의고사 풀기 ${icons.play}</button>
          </div>
        </div>
      </section>

      <section class="stats-grid">
        <article class="stat-card stat-card-action" data-action="resume-practice"><div class="stat-top"><span>이어서 풀기</span><span class="stat-icon">${icons.play}</span></div><div class="stat-value"><strong>${String(questionBank.findIndex((item) => item.id === resumeQuestion.id) + 1).padStart(2, '0')}</strong><span>번 문제</span></div><div class="stat-trend">${resumeUnit.title}</div></article>
        <article class="stat-card"><div class="stat-top"><span>오답노트</span><span class="stat-icon">${icons.rotate}</span></div><div class="stat-value"><strong>${state.wrongIds.length}</strong><span>문제</span></div><div class="stat-trend">다시 확인할 문제</div></article>
        <article class="stat-card"><div class="stat-top"><span>북마크</span><span class="stat-icon">${icons.bookmark}</span></div><div class="stat-value"><strong>${state.bookmarked.length}</strong><span>문제</span></div><div class="stat-trend">저장해둔 문제</div></article>
      </section>

      <section>
        <div class="section-heading"><div><h2>공부 방법 선택</h2><p>원하는 방식으로 공부를 시작하세요.</p></div></div>
        <div class="quick-grid">
          <button class="quick-card" data-action="go-learn"><span class="quick-icon">${icons.book}</span><span><strong>단원 공부하기</strong><p>전체 단원 또는<br />특정 단원만 선택</p></span><span class="arrow">${icons.chevron}</span></button>
          <button class="quick-card" data-action="go-mock"><span class="quick-icon">${icons.pen}</span><span><strong>모의고사 풀기</strong><p>전체 범위 또는<br />단원별로 선택</p></span><span class="arrow">${icons.chevron}</span></button>
          <button class="quick-card" data-action="go-notes"><span class="quick-icon">${icons.rotate}</span><span><strong>단원별 틀린 문제</strong><p>어떤 단원을 더<br />공부할지 확인</p></span><span class="arrow">${icons.chevron}</span></button>
        </div>
      </section>

      <section class="dashboard-columns">
        <div class="panel panel-padding">
          <div class="section-heading"><div><h2>필수 능력단위</h2><p>공부하고 싶은 단원을 골라 시작하세요.</p></div><button class="text-button" data-route="learn">전체 보기 ${icons.arrow}</button></div>
          <div class="unit-grid">${units.map(renderUnitCard).join('')}</div>
        </div>
        <div class="panel panel-padding recent-panel">
          <div class="section-heading"><div><h2>최근 학습</h2><p>마지막으로 보던 곳에서 이어가세요.</p></div><button class="text-button" data-action="reset-state">초기화</button></div>
          <button class="recent-row" data-action="resume-practice"><span class="recent-row-icon">${icons.play}</span><span><strong>${resumeQuestion.question}</strong><small>${resumeUnit.title} · 교재 p.${resumeQuestion.sourcePage}</small></span><span class="recent-row-arrow">${icons.arrow}</span></button>
          <button class="recent-row" data-action="go-learn"><span class="recent-row-icon blue">${icons.book}</span><span><strong>단원 목록에서 다시 고르기</strong><small>9개 필수 능력단위 · 개념부터 학습</small></span><span class="recent-row-arrow">${icons.arrow}</span></button>
        </div>
      </section>

      <button class="review-card" data-action="resume-practice"><div><div class="review-label">RESUME YOUR SESSION · ${String(questionBank.findIndex((item) => item.id === resumeQuestion.id) + 1).padStart(2, '0')}</div><h3>마지막으로 풀던 문제부터 이어갈까요?</h3><p>${resumeQuestion.question}</p></div><span class="review-arrow">${icons.arrow}</span></button>
    </div>`;
}

function renderUnitCard(unit) {
  return `<button class="unit-card" data-action="select-unit-dashboard" data-unit="${unit.id}"><span class="unit-index">UNIT ${unit.number}</span><span class="unit-status">학습하기</span><h3>${unit.title}</h3><small>${unit.topics[0][0]} · ${unit.topics[1][0]}</small><span class="unit-card-link">단원 열기 ${icons.arrow}</span></button>`;
}

function renderLearn() {
  const unit = getUnit(state.selectedUnit);
  return `
    <div class="screen-toolbar"><div><div class="eyebrow">CURRICULUM</div><h1 class="page-title">단원 공부하기</h1><p class="page-subtitle">전체 단원을 한 번에 보거나, 필요한 단원 하나만 골라 공부할 수 있어요.</p></div><div class="toolbar-actions"><button class="button button-secondary" data-action="resume-practice">이어서 풀기 ${icons.arrow}</button></div></div>
    <div class="study-scope-switch"><button class="scope-button ${state.learnScope === 'all' ? 'is-active' : ''}" data-action="set-learn-scope" data-scope="all">전체 같이 보기</button><button class="scope-button ${state.learnScope === 'unit' ? 'is-active' : ''}" data-action="set-learn-scope" data-scope="unit">특정 단원만 보기</button></div>
    ${state.learnScope === 'all' ? renderAllUnitStudy() : renderSpecificUnitStudy(unit)}`;
}

function renderAllUnitStudy() {
  return `<section class="panel all-unit-panel"><div class="section-heading"><div><h2>전체 단원</h2><p>교재의 9개 필수 능력단위를 모두 살펴볼 수 있어요.</p></div><span class="muted-label">9개 단원</span></div><div class="all-unit-grid">${units.map((item) => `<article class="all-unit-card"><div class="all-unit-card-head"><span class="unit-index">UNIT ${item.number}</span><span class="all-unit-card-count">${item.topics.length}개 주제</span></div><h3>${item.title}</h3><p>${item.description}</p><div class="all-unit-topics">${item.topics.slice(0, 3).map((topic) => `<span>${topic[0]}</span>`).join('')}</div><div class="all-unit-card-actions"><button class="text-button" data-action="select-study-unit" data-unit="${item.id}">자세히 보기 ${icons.arrow}</button><button class="button button-primary" data-action="start-study-unit" data-unit="${item.id}">공부하기 ${icons.play}</button></div></article>`).join('')}</div></section>`;
}

function renderSpecificUnitStudy(unit) {
  return `<div class="learn-layout">
    <aside class="panel unit-sidebar"><div class="sidebar-label" style="margin:10px 10px 8px">단원 선택</div>${units.map((item) => `<button class="unit-side-item ${item.id === unit.id ? 'is-active' : ''}" data-action="select-study-unit" data-unit="${item.id}"><span class="unit-side-number">${item.number}</span><span class="unit-side-copy"><strong>${item.title}</strong><span>${item.topics.length}개 학습 주제</span></span><span class="unit-side-arrow">${icons.chevron}</span></button>`).join('')}</aside>
    <section class="panel learn-detail">
      <div class="detail-top"><div class="detail-title-wrap"><span class="detail-number">${unit.number}</span><div><h2>${unit.title}</h2><p class="detail-code">${unit.code}</p></div></div><div class="detail-side-note"><strong>${unit.topics.length}개</strong><span>학습 주제</span></div></div>
      <div class="detail-goal"><label>LEARNING GOAL</label><p>${unit.goal}</p></div>
      <h3 class="topic-heading">이 단원에서 배우는 것</h3>
      <div class="topic-grid">${unit.topics.map((topic, index) => `<article class="topic-card"><span>0${index + 1}</span><div><strong>${topic[0]}</strong><small>${topic[1]}</small></div></article>`).join('')}</div>
      <div class="detail-footer"><p>핵심 흐름 · ${unit.highlight}</p><button class="button button-primary" data-action="start-study">학습 시작 ${icons.play}</button></div>
    </section>
  </div>`;
}

function renderStudy() {
  const unit = getUnit(state.selectedUnit);
  const isDeploy = unit.id === 'deploy';
  return `
    <div class="screen-toolbar"><div><button class="text-button" data-route="learn">${icons.chevron} 단원 목록으로</button><div class="eyebrow" style="margin-top:21px">UNIT ${unit.number} · ${unit.title}</div><h1 class="page-title">${isDeploy ? '애플리케이션 배포 환경 구성' : unit.topics[0][0]}</h1><p class="page-subtitle">${unit.description}</p></div><div class="toolbar-actions"><span class="muted-label">학습 1 / 4</span><button class="button button-secondary" data-action="go-practice-unit">이 단원 문제 풀기 ${icons.arrow}</button></div></div>
    <div class="study-layout">
      <article class="panel study-article">
        <div class="article-meta"><span>학습 목표</span><b>약 8분</b></div>
        <div class="study-callout"><strong>${unit.goal}</strong><span>개념을 읽은 뒤 아래 핵심 정리로 기억을 확인해보세요.</span></div>
        <h2>배포 환경의 개념</h2>
        <p>배포 환경이란 개발이 완료된 소스코드를 실행 가능한 형태로 변환하고, 이를 운영 서버까지 전달하는 데 필요한 전체 시스템·도구·절차의 집합을 말합니다.</p>
        <p>형상관리 도구, 빌드 도구, 정적·동적 테스트 도구, 배포 자동화 도구가 서로 연계되어 하나의 파이프라인을 구성합니다.</p>
        <div class="study-compare"><div class="compare-head"><span>웹 서버와 WAS를 구분해 기억하기</span>${icons.info}</div><div class="compare-row"><strong>웹 서버</strong><span>HTML·이미지 등 정적 콘텐츠 응답, 부하 분산</span><em>Apache · Nginx</em></div><div class="compare-row"><strong>WAS</strong><span>동적 비즈니스 로직 처리, DB 연동</span><em>Tomcat · JBoss</em></div></div>
        <h2>핵심 정리</h2>
        <div class="key-points"><div><span>01</span><p>배포 파이프라인은 형상관리 → 빌드 → 정적분석 → 테스트 → 패키징 → 배포 순서로 이어집니다.</p></div><div><span>02</span><p>운영 환경 장애에 대비해 이전 정상 버전으로 되돌리는 롤백 절차를 준비해야 합니다.</p></div><div><span>03</span><p>개발·테스트·운영 환경과 계정·데이터베이스를 분리하면 실수로 운영 데이터가 훼손되는 사고를 줄일 수 있습니다.</p></div></div>
        <div class="article-next"><button class="button button-secondary" data-route="learn">이전</button><button class="button button-primary" data-action="go-practice-unit">내용 확인 문제 풀기 ${icons.arrow}</button></div>
      </article>
      <aside class="panel study-outline"><div class="side-panel-title"><h3>${unit.title}</h3><span>4개 학습</span></div><div class="study-steps">${unit.topics.map((topic, index) => `<button class="study-step ${index === 0 ? 'is-active' : ''}"><span>${index === 0 ? icons.check : `0${index + 1}`}</span><div><strong>${topic[0]}</strong><small>${index === 0 ? '학습 중' : '다음 학습'}</small></div></button>`).join('')}</div><div class="side-divider"></div><p class="study-resume-note">읽던 내용과 문제 위치는 자동으로 저장돼요. 다음에 바로 이어갈 수 있습니다.</p><button class="button button-primary study-quiz-button" data-action="go-practice-unit">단원 문제 풀기 ${icons.play}</button></aside>
    </div>`;
}

function getPracticeQuestions() {
  let list = [...questionBank];
  if (state.practiceUnit) list = list.filter((question) => question.unit === state.practiceUnit);
  if (state.practiceFilter === 'wrong') list = list.filter((question) => state.wrongIds.includes(question.id));
  if (state.practiceFilter === 'bookmarked') list = list.filter((question) => state.bookmarked.includes(question.id));
  return list;
}

function renderPractice() {
  const list = getPracticeQuestions();
  if (!list.length) return `<div class="empty-state"><div><h2>아직 저장한 문제가 없어요</h2><p>문제를 풀며 북마크를 남기면 여기에 모아둘 수 있어요.</p><button class="button button-primary" data-action="set-practice-all">전체 문제 보기</button></div></div>`;
  if (state.practiceIndex >= list.length) state.practiceIndex = 0;
  const question = list[state.practiceIndex];
  const isAnswered = state.practiceSubmitted;
  return `
    <div class="practice-top"><div><div class="eyebrow">RECALL MODE</div><h1 class="page-title">문제 풀기</h1><p class="page-subtitle">답을 고르기 전에, 왜 그런지 먼저 떠올려보세요.</p></div><div class="practice-tabs">${[['all','전체 문제'], ['wrong','오답'], ['bookmarked','북마크']].map(([id,label]) => `<button class="practice-tab ${state.practiceFilter === id ? 'is-active' : ''}" data-action="set-practice-filter" data-filter="${id}">${label}${id === 'wrong' ? ` ${state.wrongIds.length}` : ''}</button>`).join('')}</div></div>
    <div class="question-layout">
      <article class="panel question-card">
        <div class="question-meta"><span><strong>${String(state.practiceIndex + 1).padStart(2, '0')}</strong> / ${String(list.length).padStart(2, '0')} · ${getUnit(question.unit).title}</span><span class="question-tag">${question.tag}</span></div>
        <div class="question-line"><span class="muted-label">${question.source} · p.${question.sourcePage}</span><span class="line"></span><span class="muted-label">${question.difficulty}</span></div>
        <h2 class="question-title">${question.question}</h2>
        <div class="choices">${question.choices.map((choice, index) => `<button class="choice ${isAnswered && index === question.answer ? 'is-correct' : ''} ${isAnswered && state.practiceSelected === index && index !== question.answer ? 'is-wrong' : ''} ${!isAnswered && state.practiceSelected === index ? 'is-selected' : ''}" data-action="select-practice-choice" data-choice="${index}"><span class="choice-number">${index + 1}</span><span>${choice}</span></button>`).join('')}</div>
        ${isAnswered ? `<div class="question-feedback"><strong>${state.practiceSelected === question.answer ? '정답이에요. 정확하게 기억했어요!' : '복습이 필요해요. 해설을 확인해보세요.'}</strong><p>${question.explanation}</p></div>` : ''}
        <div class="question-actions"><div class="question-actions-left"><button class="bookmark-button ${state.bookmarked.includes(question.id) ? 'is-bookmarked' : ''}" data-action="toggle-bookmark">${icons.bookmark}<span>${state.bookmarked.includes(question.id) ? '저장됨' : '북마크'}</span></button><button class="bookmark-button" data-action="show-hint">${icons.info}<span>힌트</span></button></div>${isAnswered ? `<button class="button button-primary" data-action="next-practice">다음 문제 ${icons.arrow}</button>` : `<button class="button button-primary" data-action="submit-practice" ${state.practiceSelected === null ? 'disabled' : ''}>정답 확인 ${icons.check}</button>`}</div>
      </article>
      <aside class="panel question-side"><div class="side-panel-title"><h3>문제 진행</h3><span>${state.practiceIndex + 1} / ${list.length}</span></div><div class="question-map">${list.map((item, index) => `<button class="map-button ${index === state.practiceIndex ? 'is-current' : ''} ${state.history[item.id] === true ? 'is-done' : ''} ${state.history[item.id] === false ? 'is-wrong' : ''}" data-action="select-practice-question" data-index="${index}">${String(index + 1).padStart(2, '0')}</button>`).join('')}</div><div class="side-divider"></div><div class="mini-stat-list"><div class="mini-stat"><span>현재 단원</span><strong>${getUnit(question.unit).number} · ${getUnit(question.unit).title}</strong></div><div class="mini-stat"><span>푼 문제</span><strong>${Object.keys(state.history).length}문제</strong></div><div class="mini-stat"><span>권장 학습</span><strong>10분</strong></div></div><div class="hint-card"><label>STUDY TIP</label><p>문제를 맞히는 것보다 틀린 이유를 설명할 수 있는지가 더 중요해요.</p></div></aside>
    </div>`;
}

function renderMock() {
  const selectedUnit = getUnit(state.mockUnitFilter);
  const aiQuestions = state.mockScope === 'unit' ? aiMockQuestions.filter((question) => question.unit === state.mockUnitFilter) : aiMockQuestions;
  return `
    <div class="mock-hero"><div><div class="eyebrow">MOCK TEST</div><h1 class="page-title">모의고사 풀기</h1><p class="page-subtitle">전체 범위로 풀거나, 한 단원만 골라 집중해서 풀 수 있어요.</p></div><div class="mock-filter">${icons.clock} 교재 기반 + AI 재구성</div></div>
    <div class="study-scope-switch mock-scope-switch"><button class="scope-button ${state.mockScope === 'all' ? 'is-active' : ''}" data-action="set-mock-scope" data-scope="all">전체 같이 보기</button><button class="scope-button ${state.mockScope === 'unit' ? 'is-active' : ''}" data-action="set-mock-scope" data-scope="unit">특정 단원만 보기</button></div>
    ${state.mockScope === 'unit' ? `<div class="mock-unit-picker"><span>풀 단원</span><div class="unit-filter-pills">${units.map((unit) => `<button class="unit-filter-pill ${unit.id === state.mockUnitFilter ? 'is-active' : ''}" data-action="set-mock-unit" data-unit="${unit.id}">${unit.number}. ${unit.title}</button>`).join('')}</div></div>` : ''}
    <div class="mock-grid">${state.mockScope === 'all' ? mockSets.map((mock) => `<article class="mock-card"><div class="mock-card-top"><span class="mock-card-number">MOCK TEST 0${mock.no}</span><span class="mock-card-status">${mock.status}</span></div><h3>${mock.title}</h3><p>${mock.description}</p><div class="mock-card-bottom"><div class="mock-meta"><span>${icons.clock}${mock.time}</span><span>${icons.pen}${mock.questions}문항</span></div><span class="mock-score">${mock.score}</span><button class="button button-secondary" data-action="start-exam" data-exam="${mock.no}">${mock.status === '최근 응시' ? '다시 풀기' : '시작하기'} ${icons.arrow}</button></div></article>`).join('') : `<article class="mock-card unit-mock-card"><div class="mock-card-top"><span class="mock-card-number">UNIT MOCK</span><span class="mock-card-status">${selectedUnit.number} 단원</span></div><h3>${selectedUnit.title} 집중 모의고사</h3><p>${selectedUnit.description}와 연결된 문제만 모아 집중해서 풀어보세요.</p><div class="mock-card-bottom"><div class="mock-meta"><span>${icons.clock}10분</span><span>${icons.pen}${questionBank.filter((question) => question.unit === selectedUnit.id).length + aiQuestions.length}문항</span></div><span class="mock-score">단원별</span><button class="button button-secondary" data-action="start-ai-exam" data-unit="${selectedUnit.id}">시작하기 ${icons.arrow}</button></div></article>`}<article class="mock-card ai-mock-card"><div class="mock-card-top"><span class="mock-card-number">AI MOCK TEST</span><span class="mock-card-status">AI 재구성</span></div><h3>${state.mockScope === 'unit' ? `${selectedUnit.title} AI 모의고사` : 'AI 모의고사'}</h3><p>교재의 개념과 기존 문제를 분석해 표현과 상황을 새롭게 바꾼 문제예요.</p><div class="mock-card-bottom"><div class="mock-meta"><span>${icons.clock}15분</span><span>${icons.pen}${aiQuestions.length}문항</span></div><span class="mock-score">새 문제</span><button class="button button-primary" data-action="start-ai-exam" data-unit="${state.mockScope === 'unit' ? state.mockUnitFilter : 'all'}">AI 모의고사 시작 ${icons.arrow}</button></div></article></div>
    <div class="mock-empty"><strong>문제 구성 안내</strong> · 기존 모의고사는 PDF 원문 기준이고, AI 모의고사는 같은 개념을 다른 표현과 상황으로 재구성한 연습용 문제입니다.</div>`;
}

function currentExamQuestions() {
  if (state.examMode === 'ai') {
    const source = state.examUnitFilter === 'all' ? aiMockQuestions : aiMockQuestions.filter((question) => question.unit === state.examUnitFilter);
    if (!state.examQuestionIds.length) return source;
    const ordered = state.examQuestionIds.map(getAiQuestion).filter((question) => question && (state.examUnitFilter === 'all' || question.unit === state.examUnitFilter));
    return ordered.length ? ordered : source;
  }
  return mockQuestions;
}

function currentExamQuestion() { return currentExamQuestions()[state.examIndex]; }

function renderExam() {
  const questions = currentExamQuestions();
  const question = currentExamQuestion();
  const selected = state.examAnswers[state.examIndex];
  const submitted = state.examSubmitted;
  const total = questions.length;
  const title = state.examMode === 'ai' ? 'AI 모의고사' : `${state.examSet}회 · ${mockSets[state.examSet - 1].title}`;
  const label = state.examMode === 'ai' ? 'AI 재구성 모의고사' : `실전 모의고사 ${state.examSet}회`;
  return `
    <div class="exam-topbar"><div><button class="text-button" data-action="exit-exam">${icons.chevron} 모의고사 목록</button><h2 style="margin-top:13px">${title}</h2></div><div class="timer">${icons.clock} ${state.examMode === 'ai' ? '15:00' : '28:42'}</div></div>
    <div class="exam-layout"><article class="panel exam-question-card"><div class="question-meta"><span><strong>${String(state.examIndex + 1).padStart(2, '0')}</strong> / ${total}</span><span class="question-tag">${question.type}</span></div><div class="question-line"><span class="muted-label">${label}</span><span class="line"></span><span class="muted-label">${getUnit(question.unit).title}</span></div><h2 class="question-title">${question.question}</h2>${question.choices ? `<div class="choices">${question.choices.map((choice, index) => `<button class="choice ${submitted && index === question.answer ? 'is-correct' : ''} ${submitted && selected === index && index !== question.answer ? 'is-wrong' : ''} ${!submitted && selected === index ? 'is-selected' : ''}" data-action="select-exam-choice" data-choice="${index}"><span class="choice-number">${index + 1}</span><span>${choice}</span></button>`).join('')}</div>` : `<input class="answer-input" id="exam-answer" value="${selected || ''}" placeholder="답안을 입력하세요" ${submitted ? 'disabled' : ''} />`}${submitted ? `<div class="question-feedback ${question.choices ? '' : 'is-neutral'}"><strong>${question.choices ? (selected === question.answer ? '정답입니다.' : '오답입니다.') : '답안이 저장되었어요.'}</strong><p>${question.explanation}</p>${question.aiReason ? `<p class="ai-reason">${question.aiReason}</p>` : ''}</div>` : ''}<div class="question-actions"><div class="question-actions-left"><span class="muted-label">${question.type === '서술형' ? '핵심어를 포함해 작성하세요.' : '가장 적절한 답을 선택하세요.'}</span></div>${submitted ? `<button class="button button-primary" data-action="next-exam">${state.examIndex === total - 1 ? '시험 결과 보기' : '다음 문항'} ${icons.arrow}</button>` : `<button class="button button-primary" data-action="submit-exam">답안 제출 ${icons.check}</button>`}</div></article><aside class="panel exam-side"><div class="side-panel-title"><h3>문항 목록</h3><span>${total}문항</span></div><p>현재 문항 ${state.examIndex + 1} / ${total}</p><div class="question-map">${questions.map((item, index) => `<button class="map-button ${index === state.examIndex ? 'is-current' : ''} ${state.examAnswers[index] !== undefined ? 'is-done' : ''}" data-action="select-exam-question" data-index="${index}">${String(index + 1).padStart(2, '0')}</button>`).join('')}</div><div class="side-divider"></div><div class="mini-stat-list"><div class="mini-stat"><span>문제 유형</span><strong>${state.examMode === 'ai' ? '개념 응용형' : '객관식·서술형'}</strong></div><div class="mini-stat"><span>문제 수</span><strong>${total}문항</strong></div><div class="mini-stat"><span>제한 시간</span><strong>${state.examMode === 'ai' ? '15분' : '30분'}</strong></div></div><button class="button button-secondary exam-submit" data-action="exit-exam">나중에 이어 풀기</button></aside></div>`;
}

function renderNotes() {
  const notes = state.wrongIds.map(getQuestion).filter(Boolean);
  const unitStats = units.map((unit) => ({ unit, count: notes.filter((question) => question.unit === unit.id).length }));
  const recommended = [...unitStats].sort((a, b) => b.count - a.count)[0];
  const recommendationTitle = recommended.count ? recommended.unit.title : '아직 오답이 없어요';
  const recommendationText = recommended.count ? '현재 가장 많은 오답이 쌓인 단원입니다. 개념을 다시 읽고 문제를 풀어보세요.' : '문제를 풀면 단원별 오답이 자동으로 정리됩니다.';
  return `
    <div class="screen-toolbar"><div><div class="eyebrow">WRONG ANSWERS</div><h1 class="page-title">단원별 틀린 문제</h1><p class="page-subtitle">어떤 단원에서 자주 틀리는지 확인하고, 필요한 부분부터 다시 공부하세요.</p></div><div class="toolbar-actions"><button class="button button-primary" data-action="review-all-notes">전체 오답 풀기 ${icons.play}</button></div></div>
    <div class="notes-summary"><article class="notes-summary-card lime"><div class="notes-summary-top"><span>다시 봐야 할 문제</span><strong>${notes.length}</strong></div><h3>저장한 오답을 정리해요</h3><p>단원별 카드를 눌러 해당 단원의 오답만 모아 풀 수 있어요.</p></article><article class="notes-summary-card"><div class="notes-summary-top"><span>먼저 공부할 단원</span><strong style="color:var(--red)">${recommended.count}문제</strong></div><h3>${recommendationTitle}</h3><p>${recommendationText}</p></article></div>
    <section class="wrong-unit-section"><div class="section-heading"><div><h2>단원별 오답 수</h2><p>문제가 있는 단원부터 우선 복습하는 것을 추천해요.</p></div></div><div class="wrong-unit-grid">${unitStats.map(({ unit, count }) => `<button class="wrong-unit-card ${recommended.unit.id === unit.id && count > 0 ? 'is-recommended' : ''}" data-action="review-unit-wrongs" data-unit="${unit.id}"><span class="wrong-unit-number">${unit.number}</span><span class="wrong-unit-copy"><strong>${unit.title}</strong><small>${count ? `${count}개 오답` : '틀린 문제 없음'}</small></span><span class="wrong-unit-arrow">${icons.arrow}</span></button>`).join('')}</div></section>
    <div class="section-heading"><div><h2>저장한 오답</h2><p>최근에 틀린 문제부터 표시합니다.</p></div><select class="filter-select" aria-label="오답 필터"><option>최근 오답순</option><option>단원별</option><option>난이도순</option></select></div>
    <div class="notes-list">${notes.slice(0, 6).map((question, index) => `<article class="note-card"><span class="note-number">${String(index + 1).padStart(2, '0')}</span><div><h3>${question.question}</h3><p>${getUnit(question.unit).title} · 교재 p.${question.sourcePage}</p><div class="note-tags"><span class="note-tag">${question.tag}</span><span class="note-tag" style="color:var(--red);background:rgba(255,126,138,.08)">${question.difficulty}</span></div></div><button class="icon-button" data-action="review-note" data-question="${question.id}" aria-label="문제 다시 풀기">${icons.arrow}</button></article>`).join('')}</div>`;
}

function handlePracticeChoice(index) {
  if (state.practiceSubmitted) return;
  state.practiceSelected = index;
  render();
}

/**
 * 정답 확인. 채점은 서버가 한다.
 * 화면은 먼저 갱신하고(낙관적), 서버가 돌려준 학습 상태로 덮어쓴다.
 */
async function submitPractice() {
  const list = getPracticeQuestions();
  const question = list[state.practiceIndex];
  if (!question) return;
  if (state.practiceSelected === null) { showToast('먼저 답을 선택해주세요.'); return; }

  const selected = state.practiceSelected;
  state.practiceSubmitted = true;
  state.resumeQuestionId = question.id;
  state.history[question.id] = selected === question.answer;
  if (selected !== question.answer && !state.wrongIds.includes(question.id)) state.wrongIds.unshift(question.id);
  render();

  try {
    const result = await api.post('/study/answers', { questionId: question.id, selectedIndex: selected });
    // 서버 판정이 최종이다.
    applyServerStudyState(result.state);
    render();
  } catch (error) {
    reportSyncError(error);
  }
}

function nextPractice() {
  const list = getPracticeQuestions();
  state.practiceIndex = (state.practiceIndex + 1) % list.length;
  setResumeQuestion(list[state.practiceIndex].id);
  state.practiceSelected = null;
  state.practiceSubmitted = false;
  render();
}

/** 북마크 토글. 화면을 먼저 바꾸고 실패하면 되돌린다. */
async function toggleBookmark(questionId) {
  const wasBookmarked = state.bookmarked.includes(questionId);
  state.bookmarked = wasBookmarked
    ? state.bookmarked.filter((id) => id !== questionId)
    : [questionId, ...state.bookmarked];
  render();

  try {
    if (wasBookmarked) await api.del(`/study/bookmarks/${encodeURIComponent(questionId)}`);
    else await api.post('/study/bookmarks', { questionId });
  } catch (error) {
    state.bookmarked = wasBookmarked
      ? [questionId, ...state.bookmarked.filter((id) => id !== questionId)]
      : state.bookmarked.filter((id) => id !== questionId);
    reportSyncError(error);
    render();
  }
}

// --- 앱 게이트 ---------------------------------------------------------------
// 로그인하지 않으면 공부 화면 자체가 존재하지 않는다.

function lockAppShell(locked) {
  document.body.classList.toggle('is-locked', locked);
}

async function refreshBootstrapStatus() {
  try {
    const data = await api.get('/auth/bootstrap-status');
    firstUserWillBeAdmin = Boolean(data && data.firstUserWillBeAdmin);
  } catch (error) {
    firstUserWillBeAdmin = false;
  }
}

/** 로그아웃/세션 만료 시: 콘텐츠와 학습 상태를 메모리에서 지우고 로그인 화면으로. */
function leaveAuthenticatedApp() {
  clearContent();
  adminUsers = null;
  legacyImportCandidate = null;
  hideLegacyImportBanner();
  Object.assign(state, emptyStudyState());
  resetTransientState();
  state.route = 'dashboard';
  if (window.location.hash) {
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
  }
  lockAppShell(true);
  render();
  openAuth(authMode === 'register' ? 'register' : 'login');
}

/** 로그인 직후: 콘텐츠와 학습 상태를 서버에서 받아 공부 화면을 연다. */
async function enterAuthenticatedApp() {
  lockAppShell(false);
  closeAuth();

  try {
    const [contentPayload, study] = await Promise.all([api.get('/content'), api.get('/study/state')]);
    applyContent(contentPayload);
    applyStudyState(study);
  } catch (error) {
    reportSyncError(error);
    return;
  }

  if (units[0]) {
    state.selectedUnit = units[0].id;
    state.mockUnitFilter = units[0].id;
  }
  state.route = getRoute();
  render();
  maybeOfferLegacyImport();
}

// --- 예전 기록 가져오기 ------------------------------------------------------

function maybeOfferLegacyImport() {
  if (!session || session.localImportAt) return;
  const candidate = findLegacyStudyState(session.loginId);
  if (!candidate) return;
  legacyImportCandidate = candidate;

  const banner = document.querySelector('#legacy-import');
  const text = document.querySelector('#legacy-import-text');
  if (text) {
    text.textContent = `이 브라우저에 예전 학습 기록이 남아 있어요. 북마크 ${candidate.bookmarks}개 · 오답 ${candidate.wrongs}개를 이 계정으로 가져올까요?`;
  }
  if (banner) banner.hidden = false;
}

function hideLegacyImportBanner() {
  const banner = document.querySelector('#legacy-import');
  if (banner) banner.hidden = true;
}

async function importLegacyState() {
  if (!legacyImportCandidate) return;
  const candidate = legacyImportCandidate;
  try {
    const result = await api.post('/study/import-local', { state: candidate.study });
    applyServerStudyState(result.state);
    // 가져온 뒤에는 브라우저에서 지운다. 예전 버전이 남긴 평문 비밀번호도 함께 사라진다.
    forgetLegacyAccount(candidate.key);
    if (session) session.localImportAt = new Date().toISOString();
    showToast(`예전 기록 ${result.imported}개를 가져왔어요.`);
  } catch (error) {
    reportSyncError(error);
  } finally {
    legacyImportCandidate = null;
    hideLegacyImportBanner();
    render();
  }
}

function dismissLegacyImport() {
  legacyImportCandidate = null;
  hideLegacyImportBanner();
}

// --- 관리자 화면 -------------------------------------------------------------

let adminUsers = null;

/** 사용자 아이디는 사용자 입력이므로 반드시 이스케이프해서 넣는다. */
function escapeHtml(value) {
  return String(value === null || value === undefined ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
}

function renderAdmin() {
  return `
    <div class="screen-toolbar">
      <div><div class="eyebrow">ADMIN</div><h1 class="page-title">계정 관리</h1><p class="page-subtitle">가입한 계정의 권한과 상태를 관리합니다. 가장 먼저 가입한 계정이 관리자입니다.</p></div>
      <div class="toolbar-actions"><button class="button button-secondary" data-action="reload-admin-users">새로고침 ${icons.rotate}</button></div>
    </div>
    <section class="panel panel-padding">
      <div class="section-heading"><div><h2>사용자 목록</h2><p>권한 변경은 서버에서 다시 검증되며, 마지막 관리자는 강등할 수 없습니다.</p></div></div>
      <div class="admin-table-wrap">
        <table class="admin-table">
          <thead><tr><th>아이디</th><th>권한</th><th>상태</th><th>가입일</th><th>최근 로그인</th><th>학습 기록</th><th>관리</th></tr></thead>
          <tbody id="admin-user-rows"><tr><td colspan="7" class="admin-empty">불러오는 중…</td></tr></tbody>
        </table>
      </div>
    </section>`;
}

function renderAdminRows() {
  const tbody = document.querySelector('#admin-user-rows');
  if (!tbody) return;

  if (!adminUsers) {
    tbody.innerHTML = '<tr><td colspan="7" class="admin-empty">불러오는 중…</td></tr>';
    return;
  }
  if (!adminUsers.length) {
    tbody.innerHTML = '<tr><td colspan="7" class="admin-empty">계정이 없습니다.</td></tr>';
    return;
  }

  tbody.innerHTML = adminUsers
    .map((user) => {
      const isSelf = session && user.id === session.id;
      const roleLabel = user.role === 'admin' ? '관리자' : '학습자';
      const statusLabel = user.status === 'active' ? '사용 중' : '중지됨';
      const actions = isSelf
        ? '<span class="admin-self">본인</span>'
        : `<button class="admin-action" data-action="admin-set-role" data-user="${user.id}" data-role="${user.role === 'admin' ? 'user' : 'admin'}">${user.role === 'admin' ? '관리자 해제' : '관리자 지정'}</button>` +
          `<button class="admin-action" data-action="admin-set-status" data-user="${user.id}" data-status="${user.status === 'active' ? 'disabled' : 'active'}">${user.status === 'active' ? '사용 중지' : '사용 재개'}</button>` +
          `<button class="admin-action is-danger" data-action="admin-delete-user" data-user="${user.id}">삭제</button>`;

      return `<tr>
        <td class="admin-id">${escapeHtml(user.loginId)}</td>
        <td><span class="admin-badge ${user.role === 'admin' ? 'is-admin' : ''}">${roleLabel}</span></td>
        <td><span class="admin-badge ${user.status === 'active' ? '' : 'is-off'}">${statusLabel}</span></td>
        <td>${formatDate(user.createdAt)}</td>
        <td>${formatDate(user.lastLoginAt)}</td>
        <td>북마크 ${user.bookmarkCount} · 오답 ${user.wrongCount}</td>
        <td class="admin-actions">${actions}</td>
      </tr>`;
    })
    .join('');
}

async function loadAdminUsers() {
  if (!isAdmin()) return;
  try {
    const data = await api.get('/admin/users');
    adminUsers = data.users;
  } catch (error) {
    adminUsers = [];
    reportSyncError(error);
  }
  if (state.route === 'admin') renderAdminRows();
}

async function updateAdminUser(userId, patch) {
  try {
    await apiRequest('PATCH', `/admin/users/${encodeURIComponent(userId)}`, patch);
    await loadAdminUsers();
    showToast('변경했어요.');
  } catch (error) {
    reportSyncError(error);
  }
}

async function deleteAdminUser(userId) {
  const target = (adminUsers || []).find((user) => String(user.id) === String(userId));
  const label = target ? target.loginId : '이 계정';
  if (!window.confirm(`${label} 계정과 학습 기록을 모두 삭제할까요? 되돌릴 수 없습니다.`)) return;
  try {
    await api.del(`/admin/users/${encodeURIComponent(userId)}`);
    await loadAdminUsers();
    showToast('계정을 삭제했어요.');
  } catch (error) {
    reportSyncError(error);
  }
}

function startExam(no, mode = 'book', unitFilter = 'all') {
  state.examSet = Number(no) || 1;
  state.examMode = mode;
  state.examUnitFilter = unitFilter;
  state.examIndex = 0;
  state.examAnswers = {};
  state.examSubmitted = false;
  state.examActive = true;
  const aiSource = mode === 'ai' ? (unitFilter === 'all' ? aiMockQuestions : aiMockQuestions.filter((question) => question.unit === unitFilter)) : [];
  state.examQuestionIds = mode === 'ai' ? shuffleQuestions(aiSource).map((question) => question.id) : [];
  state.examTimeLeft = examDurationSeconds(mode, unitFilter);
  navigate('mock');
  startExamTimer();
}

function submitExam() {
  const question = currentExamQuestion();
  if (question.choices) {
    if (state.examAnswers[state.examIndex] === undefined) { showToast('답을 선택해주세요.'); return; }
  } else {
    const input = document.querySelector('#exam-answer');
    if (!input || !input.value.trim()) { showToast('답안을 입력해주세요.'); return; }
    state.examAnswers[state.examIndex] = input.value.trim();
  }
  state.examSubmitted = true;
  render();
}

function nextExam() {
  const questions = currentExamQuestions();
  if (state.examIndex === questions.length - 1) {
    const correct = questions.filter((question, index) => question.choices && state.examAnswers[index] === question.answer).length;
    stopExamTimer();
    state.examActive = false;
    showToast(`${state.examMode === 'ai' ? 'AI 모의고사' : '모의고사'}를 완료했어요. 객관식 ${correct}개 정답`);
    render();
    return;
  }
  state.examIndex += 1;
  state.examSubmitted = false;
  render();
}

function openSearch() {
  // 검색은 문제·단원 데이터를 다루므로 로그인 상태에서만 연다.
  if (!isAuthenticated() || !contentLoaded) return;
  searchModal.classList.add('is-open');
  searchModal.setAttribute('aria-hidden', 'false');
  searchInput.value = '';
  renderSearchResults('');
  window.setTimeout(() => searchInput.focus(), 30);
}

function closeSearch() {
  searchModal.classList.remove('is-open');
  searchModal.setAttribute('aria-hidden', 'true');
}

function renderSearchResults(query) {
  const normalized = query.trim().toLowerCase();
  const unitResults = units.filter((unit) => !normalized || `${unit.title} ${unit.description} ${unit.topics.flat().join(' ')}`.toLowerCase().includes(normalized)).slice(0, 5);
  const questionResults = questionBank.filter((question) => !normalized || `${question.question} ${question.tag}`.toLowerCase().includes(normalized)).slice(0, 4);
  if (!normalized) {
    searchResults.innerHTML = `<div class="search-placeholder">단원명이나 개념을 검색해보세요.<br />예: 정규화, WAS, 리팩토링</div>`;
    return;
  }
  if (!unitResults.length && !questionResults.length) { searchResults.innerHTML = '<div class="search-placeholder">검색 결과가 없어요.</div>'; return; }
  searchResults.innerHTML = [...unitResults.map((unit) => `<button class="search-result" data-action="search-navigate" data-route="learn" data-unit="${unit.id}"><span class="search-result-icon">${icons.book}</span><span><strong>${unit.title}</strong><span>단원 학습 · ${unit.topics.map((topic) => topic[0]).join(' · ')}</span></span></button>`), ...questionResults.map((question) => `<button class="search-result" data-action="search-question" data-question="${question.id}"><span class="search-result-icon">${icons.pen}</span><span><strong>${question.question}</strong><span>${getUnit(question.unit).title} · ${question.tag}</span></span></button>`)].join('');
}

/** 로그인해야만 쓸 수 있는 동작. 비로그인 상태에서는 로그인 창을 띄운다. */
const PUBLIC_ACTIONS = new Set(['open-auth', 'close-auth', 'toggle-auth-mode', 'logout', 'open-sidebar', 'close-sidebar']);

document.addEventListener('click', (event) => {
  const routeElement = event.target.closest('[data-route]');
  if (routeElement) {
    if (routeElement.dataset.route === 'learn' && routeElement.dataset.unit) state.selectedUnit = routeElement.dataset.unit;
    navigate(routeElement.dataset.route);
    return;
  }

  const actionElement = event.target.closest('[data-action]');
  if (!actionElement) return;
  const action = actionElement.dataset.action;

  if (!isAuthenticated() && !PUBLIC_ACTIONS.has(action)) {
    openAuth('login');
    return;
  }

  if (action === 'open-sidebar') sidebar.classList.add('is-open');
  if (action === 'close-sidebar') closeSidebar();
  if (action === 'open-search') openSearch();
  if (action === 'close-search') closeSearch();
  if (action === 'open-auth') openAuth(actionElement.dataset.authMode || 'login');
  if (action === 'close-auth') closeAuth();
  if (action === 'toggle-auth-mode') { authMode = authMode === 'login' ? 'register' : 'login'; authForm?.reset(); updateAuthModal(); }
  if (action === 'logout') logout();
  if (action === 'go-learn') { state.learnScope = 'all'; navigate('learn'); }
  if (action === 'go-mock') { state.mockScope = 'all'; navigate('mock'); }
  if (action === 'go-notes') navigate('notes');
  if (action === 'go-practice') { state.practiceUnit = null; state.practiceIndex = 0; navigate('practice'); }
  if (action === 'resume-practice' || action === 'continue-learning') resumePractice();
  if (action === 'reset-state') resetState();
  if (action === 'start-mock') startExam(1);
  if (action === 'select-unit-dashboard') { state.selectedUnit = actionElement.dataset.unit; state.learnScope = 'unit'; navigate('learn'); }
  if (action === 'select-unit') { state.selectedUnit = actionElement.dataset.unit; render(); }
  if (action === 'set-learn-scope') { state.learnScope = actionElement.dataset.scope; render(); }
  if (action === 'select-study-unit') { state.selectedUnit = actionElement.dataset.unit; state.learnScope = 'unit'; render(); }
  if (action === 'start-study-unit') { state.selectedUnit = actionElement.dataset.unit; state.learnScope = 'unit'; navigate('study'); }
  if (action === 'start-study') navigate('study');
  if (action === 'go-practice-unit') { state.practiceUnit = state.selectedUnit; state.practiceIndex = 0; state.practiceFilter = 'all'; state.practiceSelected = null; state.practiceSubmitted = false; navigate('practice'); }
  if (action === 'set-practice-filter') { state.practiceFilter = actionElement.dataset.filter; state.practiceUnit = null; state.practiceIndex = 0; state.practiceSelected = null; state.practiceSubmitted = false; render(); }
  if (action === 'set-practice-all') { state.practiceFilter = 'all'; state.practiceUnit = null; state.practiceIndex = 0; render(); }
  if (action === 'select-practice-choice') handlePracticeChoice(Number(actionElement.dataset.choice));
  if (action === 'submit-practice') submitPractice();
  if (action === 'next-practice') nextPractice();
  if (action === 'select-practice-question') { state.practiceIndex = Number(actionElement.dataset.index); const selectedQuestion = getPracticeQuestions()[state.practiceIndex]; setResumeQuestion(selectedQuestion?.id); state.practiceSelected = null; state.practiceSubmitted = false; render(); }
  if (action === 'toggle-bookmark') {
    const question = getPracticeQuestions()[state.practiceIndex];
    if (!question) return;
    toggleBookmark(question.id);
  }
  if (action === 'show-hint') showToast('힌트: 문제의 핵심 용어를 먼저 떠올려보세요.');
  if (action === 'start-exam') startExam(actionElement.dataset.exam);
  if (action === 'set-mock-scope') { state.mockScope = actionElement.dataset.scope; render(); }
  if (action === 'set-mock-unit') { state.mockScope = 'unit'; state.mockUnitFilter = actionElement.dataset.unit; render(); }
  if (action === 'start-ai-exam') startExam(1, 'ai', actionElement.dataset.unit || 'all');
  if (action === 'exit-exam') { stopExamTimer(); state.examActive = false; navigate('mock'); }
  if (action === 'select-exam-choice' && !state.examSubmitted) { state.examAnswers[state.examIndex] = Number(actionElement.dataset.choice); render(); }
  if (action === 'select-exam-question') { state.examIndex = Number(actionElement.dataset.index); state.examSubmitted = false; render(); }
  if (action === 'submit-exam') submitExam();
  if (action === 'next-exam') nextExam();
  if (action === 'review-note') {
    const question = getQuestion(actionElement.dataset.question);
    const index = questionBank.findIndex((item) => item.id === question.id);
    setResumeQuestion(question.id);
    state.practiceFilter = 'all'; state.practiceUnit = null; state.practiceIndex = index; state.practiceSelected = null; state.practiceSubmitted = false; navigate('practice');
  }
  if (action === 'review-all-notes') { state.practiceFilter = 'wrong'; state.practiceUnit = null; state.practiceIndex = 0; state.practiceSelected = null; state.practiceSubmitted = false; navigate('practice'); }
  if (action === 'review-unit-wrongs') {
    const unitQuestions = questionBank.filter((question) => question.unit === actionElement.dataset.unit && state.wrongIds.includes(question.id));
    state.practiceFilter = 'wrong'; state.practiceUnit = actionElement.dataset.unit; state.practiceIndex = 0; state.practiceSelected = null; state.practiceSubmitted = false;
    if (unitQuestions[0]) setResumeQuestion(unitQuestions[0].id);
    navigate('practice');
  }
  if (action === 'search-navigate') { state.selectedUnit = actionElement.dataset.unit; closeSearch(); navigate('learn'); }
  if (action === 'search-question') { const index = questionBank.findIndex((item) => item.id === actionElement.dataset.question); setResumeQuestion(actionElement.dataset.question); state.practiceFilter = 'all'; state.practiceUnit = null; state.practiceIndex = index; state.practiceSelected = null; state.practiceSubmitted = false; closeSearch(); navigate('practice'); }

  // 예전 기록 가져오기
  if (action === 'import-legacy') importLegacyState();
  if (action === 'dismiss-legacy') dismissLegacyImport();

  // 관리자 화면
  if (action === 'reload-admin-users') loadAdminUsers();
  if (action === 'admin-set-role') updateAdminUser(actionElement.dataset.user, { role: actionElement.dataset.role });
  if (action === 'admin-set-status') updateAdminUser(actionElement.dataset.user, { status: actionElement.dataset.status });
  if (action === 'admin-delete-user') deleteAdminUser(actionElement.dataset.user);
});

searchInput.addEventListener('input', (event) => renderSearchResults(event.target.value));
authForm?.addEventListener('submit', handleAuthSubmit);

window.addEventListener('hashchange', () => {
  // 비로그인 상태에서는 주소창으로도 공부 화면에 들어갈 수 없다.
  if (!isAuthenticated()) {
    if (window.location.hash) {
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }
    openAuth(authMode === 'register' ? 'register' : 'login');
    return;
  }
  state.route = getRoute();
  render();
});

window.addEventListener('keydown', (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); openSearch(); }
  if (event.key === 'Escape') { closeSearch(); closeAuth(); }
});

// --- 부팅 -------------------------------------------------------------------
// 로그인 여부는 서버의 /api/auth/me 로만 판단한다.

async function boot() {
  lockAppShell(true);
  try {
    const me = await api.get('/auth/me');
    firstUserWillBeAdmin = Boolean(me.firstUserWillBeAdmin);
    if (me.authenticated) {
      session = me.user;
      await enterAuthenticatedApp();
      return;
    }
  } catch (error) {
    showToast(error && error.message ? error.message : '서버에 연결할 수 없어요.');
  }
  session = null;
  leaveAuthenticatedApp();
}

boot();

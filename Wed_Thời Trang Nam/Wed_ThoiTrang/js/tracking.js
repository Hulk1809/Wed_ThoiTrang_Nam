// js/tracking.js - Data tracking cho Data Mining (UserBehavior + VideoTracking)
const TRACKING_API = (location.protocol === 'https:' ? 'https://localhost:7070' : 'http://localhost:5281') + '/api';

function getTrackingUserId() {
  try {
    const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
    return userInfo.id || userInfo.userId || null;
  } catch {
    return null;
  }
}

function getCurrentPageName() {
  const path = window.location.pathname;
  if (path.includes('index')) return 'index';
  if (path.includes('sanpham')) return 'sanpham';
  if (path.includes('chitietsp')) return 'chitietsp';
  if (path.includes('giohang')) return 'giohang';
  if (path.includes('thanhtoan')) return 'thanhtoan';
  if (path.includes('cuahang')) return 'cuahang';
  if (path.includes('yeu-thich')) return 'yeu-thich';
  if (path.includes('admin')) return 'admin';
  return 'unknown';
}

function getProductIdFromPage() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  return id ? Number(id) : null;
}

async function trackUserEvent(eventType, productId = null, eventData = null, extra = {}) {
  const userId = getTrackingUserId();
  if (!userId) return;

  const payload = {
    userId,
    eventType,
    productId,
    eventData: eventData || '',
    pageName: extra.pageName || getCurrentPageName(),
    durationSeconds: extra.durationSeconds ?? null,
    interest: extra.interest ? JSON.stringify(extra.interest) : null,
    startedAt: extra.startedAt || new Date().toISOString(),
    endedAt: extra.endedAt || new Date().toISOString()
  };

  try {
    const res = await fetch(`${TRACKING_API}/userbehavior`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true // Đảm bảo request hoàn thành ngay cả khi tắt tab
    });
    if (res.ok) console.log(`[TRACKING] ${eventType}`, { productId, eventData });
  } catch (err) {
    console.warn('[TRACKING] Error:', err.message);
  }
}

async function trackVideoView(videoUrl, videoTitle, watchedSeconds, totalDuration, interest = null) {
  const userId = getTrackingUserId();
  if (!userId) return;

  const payload = {
    userId,
    videoUrl,
    videoTitle,
    watchedSeconds: Math.round(watchedSeconds),
    totalDuration: Math.round(totalDuration),
    interest: interest ? JSON.stringify(interest) : null,
    startedAt: new Date(Date.now() - watchedSeconds * 1000).toISOString(),
    endedAt: new Date().toISOString()
  };

  try {
    const res = await fetch(`${TRACKING_API}/videotracking`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true
    });
    if (res.ok) console.log(`[VIDEO] ${videoTitle}: ${watchedSeconds}s/${totalDuration}s`);
  } catch (err) {
    console.warn('[VIDEO] Error:', err.message);
  }
}

async function trackProductViewDuration(productId, durationSeconds, interest = null) {
  if (!productId || durationSeconds < 3) return;
  const userId = getTrackingUserId();
  if (!userId) return;

  const payload = {
    userId,
    eventType: 'view',
    productId: Number(productId),
    durationSeconds: Math.round(durationSeconds),
    pageName: 'chitietsp',
    interest: interest ? JSON.stringify(interest) : null,
    startedAt: new Date(Date.now() - durationSeconds * 1000).toISOString(),
    endedAt: new Date().toISOString()
  };

  try {
    const res = await fetch(`${TRACKING_API}/userbehavior`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true
    });
    if (res.ok) console.log(`[VIEW TIME] Product ${productId}: ${durationSeconds}s`);
  } catch (err) {
    console.warn('[VIEW TIME] Error:', err.message);
  }
}

// === Session helpers ===
const _productSessions = {};

function startProductViewTracking(productId, interest = null) {
  if (!productId) return;
  _productSessions[productId] = { startedAt: Date.now(), interest };
  trackUserEvent('view', Number(productId), 'product detail opened', { interest });
}

function flushProductViewTracking(productId) {
  const session = _productSessions[productId];
  if (!session) return;
  const duration = Math.round((Date.now() - session.startedAt) / 1000);
  delete _productSessions[productId];
  trackProductViewDuration(productId, duration, session.interest);
}

function flushAllProductViewTracking() {
  Object.keys(_productSessions).forEach(id => flushProductViewTracking(Number(id)));
}

function bindProductViewPageLifecycle(productId, interest = null) {
  startProductViewTracking(productId, interest);
  const flush = () => flushProductViewTracking(productId);
  window.addEventListener('pagehide', flush);
  window.addEventListener('beforeunload', flush);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush();
  });
}

// === BỔ SUNG CÁC TÍNH NĂNG TRACKING MỚI ===

// 1. Scroll Depth Tracking
const _sentScrollThresholds = new Set();
function bindScrollTracking() {
  window.addEventListener('scroll', () => {
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const scrollHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    if (scrollHeight <= 0) return;
    const percent = Math.round((scrollTop / scrollHeight) * 100);

    const thresholds = [25, 50, 75, 100];
    for (const t of thresholds) {
      if (percent >= t && !_sentScrollThresholds.has(t)) {
        _sentScrollThresholds.add(t);
        trackUserEvent('scroll', getProductIdFromPage(), `depth: ${t}%`);
      }
    }
  });

  // Ghi nhận điểm cuộn cuối cùng trước khi thoát trang
  window.addEventListener('pagehide', () => {
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const scrollHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    if (scrollHeight <= 0) return;
    const percent = Math.round((scrollTop / scrollHeight) * 100);
    trackUserEvent('exit_scroll', getProductIdFromPage(), `exit_depth: ${percent}%`);
  });
}

// 2. Heatmap Click Tracking (Tọa độ click chuột)
let _lastHeatmapClick = 0;
function bindHeatmapTracking() {
  document.addEventListener('click', (e) => {
    // Giới hạn tần suất click (500ms) tránh spam
    const now = Date.now();
    if (now - _lastHeatmapClick < 500) return;
    _lastHeatmapClick = now;

    const x = e.pageX;
    const y = e.pageY;
    const w = document.documentElement.scrollWidth || document.body.scrollWidth;
    const h = document.documentElement.scrollHeight || document.body.scrollHeight;

    // Tìm CSS selector của phần tử click
    let target = e.target;
    let selector = target.tagName.toLowerCase();
    if (target.id) {
      selector += `#${target.id}`;
    } else if (target.className) {
      // Lấy 2 class đầu tiên làm định danh
      const classes = target.className.trim().split(/\s+/).slice(0, 2).join('.');
      if (classes) selector += `.${classes}`;
    }

    const text = target.innerText ? target.innerText.trim().substring(0, 30) : '';

    trackUserEvent('click_heatmap', getProductIdFromPage(), JSON.stringify({
      x,
      y,
      width: w,
      height: h,
      selector: selector.substring(0, 100),
      text
    }));
  });
}

// 3. Auto Click Action Tracking (Mua ngay, Thêm giỏ hàng, Đăng ký)
function bindAutoClickActions() {
  document.body.addEventListener('click', (e) => {
    const target = e.target.closest('button, a, input[type="submit"]');
    if (!target) return;

    const text = target.innerText ? target.innerText.trim().toLowerCase() : (target.value ? target.value.trim().toLowerCase() : '');
    if (!text) return;

    const productId = getProductIdFromPage();

    if (text.includes('mua ngay') || text.includes('buy now')) {
      trackUserEvent('click_buy_now', productId, `Button text: "${target.innerText.trim()}"`);
    } else if (text.includes('thêm vào giỏ') || text.includes('add to cart')) {
      trackUserEvent('click_add_to_cart_btn', productId, `Button text: "${target.innerText.trim()}"`);
    } else if (text.includes('đăng ký') || text.includes('register') || text.includes('tạo tài khoản')) {
      trackUserEvent('click_register_btn', null, `Button text: "${target.innerText.trim()}"`);
    }
  });
}

// 4. Video Watch Tracking mở rộng (Play, Pause, End, Seek, Replay)
function bindVideoTracking(videoEl, videoTitle, interest = null) {
  if (!videoEl) return;
  let watchedSeconds = 0;
  let tickTimer = null;
  let prevTime = 0;
  let loopCount = 0;

  const getTotal = () => Math.round(videoEl.duration) || 60;

  const startTick = () => {
    if (tickTimer) return;
    tickTimer = setInterval(() => { watchedSeconds += 1; }, 1000);
  };

  const stopTick = () => {
    if (tickTimer) { clearInterval(tickTimer); tickTimer = null; }
  };

  const flush = () => {
    stopTick();
    if (watchedSeconds >= 3) {
      const url = videoEl.currentSrc || videoEl.querySelector('source')?.src || videoEl.src || '';
      trackVideoView(url, videoTitle, watchedSeconds, getTotal(), interest);
      watchedSeconds = 0; // reset
    }
  };

  // Play & Loop
  videoEl.addEventListener('play', () => {
    startTick();
    if (videoEl.currentTime === 0 && watchedSeconds > 0) {
      loopCount++;
      const url = videoEl.currentSrc || videoEl.src || '';
      trackUserEvent('video_replay', getProductIdFromPage(), JSON.stringify({
        videoTitle,
        loopCount,
        videoUrl: url
      }));
    }
    prevTime = videoEl.currentTime;
  });

  // Pause
  videoEl.addEventListener('pause', () => {
    stopTick();
    const url = videoEl.currentSrc || videoEl.src || '';
    trackUserEvent('video_pause', getProductIdFromPage(), JSON.stringify({
      videoTitle,
      stopAt: Math.round(videoEl.currentTime),
      videoUrl: url
    }));
  });

  // Seek
  videoEl.addEventListener('timeupdate', () => {
    if (!videoEl.seeking) {
      prevTime = videoEl.currentTime;
    }
  });

  videoEl.addEventListener('seeked', () => {
    const url = videoEl.currentSrc || videoEl.src || '';
    trackUserEvent('video_seek', getProductIdFromPage(), JSON.stringify({
      videoTitle,
      from: Math.round(prevTime),
      to: Math.round(videoEl.currentTime),
      videoUrl: url
    }));
    prevTime = videoEl.currentTime;
  });

  videoEl.addEventListener('ended', flush);
  window.addEventListener('pagehide', flush);
  window.addEventListener('beforeunload', flush);
}

// Track click vào sản phẩm từ danh sách
function trackProductClick(productId, productName) {
  trackUserEvent('click', Number(productId), `clicked: ${productName}`);
}

// Auto track page view khi load trang
function trackPageView() {
  const page = getCurrentPageName();
  if (page === 'unknown' || page === 'admin') return;
  trackUserEvent('page_view', null, `page: ${page}`);
}

// Khởi chạy các bộ theo dõi
document.addEventListener('DOMContentLoaded', () => {
  trackPageView();
  bindScrollTracking();
  bindHeatmapTracking();
  bindAutoClickActions();
});

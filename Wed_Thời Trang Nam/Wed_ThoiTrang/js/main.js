// js/main.js - Logic chung cho toàn site

// Load products từ product.js (giả sử load trước)
let products = window.products || []; // Nếu load trực tiếp, dùng global từ product.js
let cart = JSON.parse(localStorage.getItem('cart') || '[]');
let users = JSON.parse(localStorage.getItem('users') || '[]');

// Tracking: load js/tracking.js trước main.js

// Render Products (cho index.html, sanpham.html)
function renderProducts(filtered = products) {
  const container = document.getElementById('product-list') || document.querySelector('.products-grid') || document.getElementById('related-products');
  if (!container) return;
  container.innerHTML = filtered.slice(0, 12).map(p => `
    <div class="product-card bg-white rounded-lg shadow hover:shadow-lg transition">
      <img src="${p.image || 'images/default-product.jpg'}" alt="${p.name}" class="w-full h-48 object-cover rounded-t-lg">
      <div class="p-3">
        <h3 class="text-sm font-bold line-clamp-2">${p.name}</h3>
        <p class="text-red-600 font-bold">${p.price.toLocaleString()} VNĐ</p>
        ${p.discount > 0 ? `<span class="text-xs text-gray-500 line-through">${p.originalPrice.toLocaleString()} VNĐ</span>` : ''}
        <button onclick="addToCart(${p.id})" class="mt-2 w-full bg-red-600 text-white py-2 rounded hover:bg-red-700 transition">Thêm vào giỏ</button>
      </div>
    </div>
  `).join('');
}

// Mini Product Card (cho sản phẩm liên quan, sản phẩm nổi bật)
const renderMini = (p, label) => `
  <div class="bg-black/40 border border-white/10 rounded-2xl p-3 flex flex-col gap-2">
    <div class="flex items-center justify-between text-[11px] text-gray-400">
      <span>${label}</span>
      <span class="px-2 py-0.5 rounded-full bg-white/5 border border-white/10">${(p.category || '').toUpperCase()}</span>
    </div>
    <div class="flex gap-2 items-center">
      <img src="${p.image}" alt="${p.name}" class="w-12 h-12 rounded-xl object-cover border border-white/10" />
      <div class="flex-1">
        <p class="text-xs font-semibold line-clamp-2">${p.name}</p>
        <p class="text-[11px] text-red-300 font-semibold mt-0.5">${p.price.toLocaleString()} VNĐ</p>
      </div>
    </div>
    <div class="mt-1 flex gap-2">
      <button type="button"
              class="flex-1 text-[11px] bg-red-600 hover:bg-red-500 text-white py-1.5 rounded-xl flex items-center justify-center gap-1"
              onclick="addToCart(${p.id})">
        <i class="fas fa-cart-plus"></i>
        <span>Thêm vào giỏ</span>
      </button>
      <button type="button"
              class="flex-1 text-[11px] bg-white/10 hover:bg-white/20 text-gray-100 py-1.5 rounded-xl border border-white/10"
              onclick="window.location.href='chitietsp.html?id=${p.id}'">
        Xem chi tiết
      </button>
    </div>
  </div>`;

// Cart Functions
function addToCart(id, quantity = 1) {
  const p = products.find(x => x.id == id);
  if (!p) { alert('Sản phẩm không tồn tại!'); return; }
  if (!isLoggedIn()) {
    if (typeof showModal === 'function') showModal('Cần đăng nhập', 'Vui lòng đăng nhập trước khi thêm sản phẩm vào giỏ.', false);
    else alert('Vui lòng đăng nhập!');
    window.location.href = 'dang-nhap.html';
    return;
  }
  const item = { id: p.id, name: p.name, price: p.price, image: p.image, size: p.size?.[0] || 'M', color: p.color?.[0] || 'Đen', quantity };
  const exist = cart.find(i => i.id === item.id && i.size === item.size && i.color === item.color);
  if (exist) exist.quantity += quantity; else cart.push(item);
  localStorage.setItem('cart', JSON.stringify(cart));
  updateCartCount();
  // Sync ngay sau khi thêm (chỉ gửi productId + quantity)
  syncCartToBackend();
  // Track add_to_cart event
  trackUserEvent('add_to_cart', id, `quantity: ${quantity}`);
  if (typeof showModal === 'function') showModal('Thành công', `Đã thêm ${quantity} "${p.name}" vào giỏ!`, true); else alert(`Đã thêm ${quantity} "${p.name}" vào giỏ!`);
}

function updateQuantity(index, delta) {
  if (cart[index]) cart[index].quantity = Math.max(1, cart[index].quantity + delta);
  localStorage.setItem('cart', JSON.stringify(cart));
  renderCart(); // Gọi ở giohang.html
  updateCartCount();
}

function removeItem(index) {
  cart.splice(index, 1);
  localStorage.setItem('cart', JSON.stringify(cart));
  renderCart();
  updateCartCount();
}

function renderCart() {
  const itemsEl = document.getElementById('cart-items');
  const totalEl = document.getElementById('cart-total');
  if (!itemsEl) return;
  itemsEl.innerHTML = '';
  let total = 0;
  if (cart.length === 0) {
    itemsEl.innerHTML = '<p class="text-gray-500 text-center">Giỏ hàng trống.</p>';
    if (totalEl) totalEl.textContent = 'Tổng: 0 VNĐ';
    return;
  }
  cart.forEach((item, index) => {
    const itemTotal = item.price * item.quantity;
    total += itemTotal;
    const cartItem = document.createElement('div');
    cartItem.className = 'cart-item flex justify-between items-center p-4 border rounded-lg bg-white hover:bg-gray-50 transition';
    cartItem.innerHTML = `
      <div class="flex items-center gap-4">
        <img src="${item.image}" alt="${item.name}" class="w-16 h-16 object-cover rounded">
        <div>
          <h3 class="text-lg font-medium text-gray-800">${item.name}</h3>
          <p class="text-sm text-gray-600">Size: ${item.size}, Màu: ${item.color}</p>
        </div>
      </div>
      <div class="flex items-center gap-4">
        <div class="flex items-center gap-2">
          <span class="quantity-btn text-xl cursor-pointer" onclick="updateQuantity(${index}, -1)">-</span>
          <span class="text-sm font-medium">${item.quantity}</span>
          <span class="quantity-btn text-xl cursor-pointer" onclick="updateQuantity(${index}, 1)">+</span>
        </div>
        <p class="text-sm font-medium text-red-600">${itemTotal.toLocaleString()} VNĐ</p>
        <button onclick="removeItem(${index})" class="text-red-600 hover:text-red-800">
          <i class="fas fa-trash-alt"></i>
        </button>
      </div>
    `;
    itemsEl.appendChild(cartItem);
  });
  if (totalEl) totalEl.textContent = `Tổng: ${total.toLocaleString()} VNĐ`;
}

function updateCartCount() {
    // Sửa luôn cả dòng 94 để phòng trường hợp 'cart' bị null
    const count = (cart || []).reduce((s, i) => s + i.quantity, 0); 

    // Sửa dòng 95:
    const cartCountElement = document.getElementById('cart-count');
    if (cartCountElement) { // Thêm 'if' để kiểm tra
        cartCountElement.textContent = count;
    }

    // Sửa dòng 96:
    const badgeElement = document.querySelector('.badge');
    if (badgeElement) { // Thêm 'if' để kiểm tra
        badgeElement.textContent = count;
    }
}

// User Session & Login
function decodeJwt(token){
  try {
    const base64 = token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/');
    const json = decodeURIComponent(atob(base64).split('').map(c => '%' + c.charCodeAt(0).toString(16).padStart(2,'0')).join(''));
    return JSON.parse(json);
  } catch { return null; }
}
function isLoggedIn() {
  const token = localStorage.getItem('token') || localStorage.getItem('jwtToken');
  if (token) {
    const payload = decodeJwt(token);
    if (payload && payload.exp && (payload.exp * 1000) < Date.now()) {
      localStorage.removeItem('token');
      localStorage.removeItem('jwtToken');
      localStorage.removeItem('session');
      return false;
    }
    if (!localStorage.getItem('session')) {
      const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
      const userId = userInfo.id || userInfo.userId;
      if (userId) {
        const expiry = payload && payload.exp ? new Date(payload.exp * 1000).toISOString() : new Date(Date.now()+7*24*60*60*1000).toISOString();
        localStorage.setItem('session', JSON.stringify({ userId, token, expiry }));
      }
    }
    return true;
  }
  const session = JSON.parse(localStorage.getItem('session') || '{}');
  if (!(session.userId && session.token)) return false;
  if (new Date(session.expiry) < new Date()) { localStorage.removeItem('session'); return false; }
  return true;
}

function login(email, password) {
  const user = users.find(u => u.email === email && u.password === password);
  if (user) {
    const token = Math.random().toString(36).substring(2) + Date.now().toString(36);
    const expiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    localStorage.setItem('session', JSON.stringify({ userId: user.id, token, expiry }));
    user.lastLogin = new Date().toISOString();
    const userIndex = users.findIndex(u => u.id === user.id);
    users[userIndex] = user;
    localStorage.setItem('users', JSON.stringify(users));
    showModal('Thành công', 'Đăng nhập thành công!', true);
    setTimeout(() => window.location.href = 'tai-khoan.html', 2000);
    return true;
  }
  showModal('Lỗi', 'Sai email/mật khẩu!', false);
  return false;
}

function logout() {
  localStorage.removeItem('session');
  showModal('Thành công', 'Đã đăng xuất!', true);
  setTimeout(() => window.location.href = 'index.html', 2000);
}

function showModal(title, message, isSuccess) {
  const modal = document.getElementById('modal') || createModal();
  const modalTitle = document.getElementById('modal-title');
  const modalMessage = document.getElementById('modal-message');
  const modalContent = document.querySelector('.modal-content');
  modalContent.className = `modal-content ${isSuccess ? 'success' : 'error'}`;
  modalTitle.textContent = title;
  modalMessage.textContent = message;
  modal.style.display = 'flex';
  if (isSuccess && typeof confetti !== 'undefined') confetti({ particleCount: 100, spread: 70 });
  document.getElementById('modal-ok')?.focus();
}

function createModal() {
  const modal = document.createElement('div');
  modal.id = 'modal';
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-content">
      <button class="close-btn" onclick="closeModal()"><i class="fas fa-times"></i></button>
      <h2 id="modal-title"></h2>
      <p id="modal-message"></p>
      <button id="modal-ok" class="btn bg-red-600 text-white py-2 px-4 rounded" onclick="closeModal()">OK</button>
    </div>
  `;
  document.body.appendChild(modal);
  return modal;
}

function closeModal() {
  document.getElementById('modal').style.display = 'none';
}

// Slider Init (index.html)
function initSlider() {
  let current = 0;
  const slides = document.querySelectorAll('.banner-slide');
  if (slides.length === 0) return;
  setInterval(() => {
    slides[current].style.opacity = '0';
    current = (current + 1) % slides.length;
    slides[current].style.opacity = '1';
  }, 5000);
}

// Checkout (thanhtoan.html)
function checkout() {
  if (cart.length === 0) return alert('Giỏ hàng trống!');
  window.location.href = 'thanhtoan.html';
}

// Render Chi Tiết Sản Phẩm (chitietsp.html)
function renderProduct() {
  const urlParams = new URLSearchParams(window.location.search);
  const id = parseInt(urlParams.get('id'));
  const product = products.find(p => p.id === id);
  if (!product) return alert('Sản phẩm không tồn tại!');
  trackUserEvent('view', id, product.name);
  document.getElementById('product-name').textContent = product.name;
  document.getElementById('product-price').textContent = product.price.toLocaleString() + ' VNĐ';
  document.getElementById('product-description').textContent = product.description;
  document.getElementById('main-image').src = product.image;
  // Thumbnail
  const thumbs = document.getElementById('thumbnails');
  thumbs.innerHTML = product.previewImages.map(img => `<img src="${img}" class="thumbnail" onclick="changeImage('${img}', this)">`).join('');
  // Related
  renderProducts(products.filter(p => p.id !== id && p.category === product.category).slice(0, 4));
}

function changeImage(src, el) {
  document.getElementById('main-image').src = src;
  document.querySelectorAll('.thumbnail').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
}

// Sync cart to backend
async function syncCartToBackend() {
  const token = localStorage.getItem('token') || localStorage.getItem('jwtToken');
  if (!token) return; // chưa đăng nhập
  const simplified = (cart || []).map(i => ({ productId: i.id, quantity: i.quantity }));
  try {
    const res = await fetch((location.protocol==='https:'?'https://localhost:7070':'http://localhost:5281') + '/api/Cart/sync', {
      method:'POST',
      headers:{
        'Content-Type':'application/json',
        'Authorization':'Bearer '+token
      },
      body: JSON.stringify({ items: simplified })
    });
    console.log('[SYNC] status', res.status);
  } catch(err){
    console.warn('[SYNC] lỗi:', err.message);
  }
}

// Merge server cart -> local (chỉ gọi một lần khi tải trang nếu đã đăng nhập)
async function mergeServerCartOnce() {
  if (localStorage.getItem('__merged')) return; // tránh gọi lặp
  const token = localStorage.getItem('token') || localStorage.getItem('jwtToken');
  if (!token) return;
  try {
    const base = (location.protocol==='https:'?'https://localhost:7070':'http://localhost:5281');
    const res = await fetch(base + '/api/Cart', { headers: { 'Authorization': 'Bearer ' + token }});
    if (!res.ok) { console.warn('[CART GET] status', res.status); return; }
    const data = await res.json();
    const serverItems = (data.items || data.Items || []); // đề phòng casing khác
    let changed = false;
    serverItems.forEach(si => {
      const pid = si.productId || si.ProductId;
      const qty = si.quantity || si.Quantity || 0;
      if (!pid || qty < 1) return;
      const prod = products.find(p => p.id === pid);
      if (!prod) return; // sản phẩm chưa load ở FE
      const local = cart.find(c => c.id === pid);
      if (local) {
        if (local.quantity !== qty) { local.quantity = qty; changed = true; }
      } else {
        cart.push({ id: prod.id, name: prod.name, price: prod.price, image: prod.image, size: prod.size?.[0] || 'M', color: prod.color?.[0] || 'Đen', quantity: qty });
        changed = true;
      }
    });
    if (changed) {
      localStorage.setItem('cart', JSON.stringify(cart));
      updateCartCount();
    }
    localStorage.setItem('__merged','1');
    console.log('[CART] merged server -> local');
  } catch(err){ console.warn('[CART MERGE] lỗi:', err.message); }
}

// Cập nhật header user từ server profile (nếu có)
async function updateHeaderFromProfile() {
  const nameEl = document.getElementById('user-name');
  const emailEl = document.getElementById('user-email');
  const logoutBtn = document.getElementById('logout-btn');
  const loginLink = document.getElementById('login-link');
  if (!(nameEl && emailEl)) return;
  if (!isLoggedIn()) {
    nameEl.textContent = 'Khách';
    emailEl.textContent = 'guest@Shop.vn';
    logoutBtn?.classList.add('hidden');
    loginLink?.classList.remove('hidden');
    return;
  }
  const token = localStorage.getItem('token') || localStorage.getItem('jwtToken');
  if (!token) return;
  try {
    const base = (location.protocol==='https:'?'https://localhost:7070':'http://localhost:5281');
    const res = await fetch(base + '/api/Auth/profile', { headers: { 'Authorization':'Bearer '+token } });
    if (res.ok) {
      const profile = await res.json();
      nameEl.textContent = profile.name || profile.Name || 'Người dùng';
      emailEl.textContent = profile.email || profile.Email || '';
      logoutBtn?.classList.remove('hidden');
      loginLink?.classList.add('hidden');
      // set account link to profile page when logged
      const accountLink = document.getElementById('account-link');
      if (accountLink) accountLink.href = 'thong-tin.html';
    } else {
      nameEl.textContent = 'Khách';
      emailEl.textContent = 'guest@Shop.vn';
      logoutBtn?.classList.add('hidden');
      loginLink?.classList.remove('hidden');
    }
  } catch {
    nameEl.textContent = 'Khách';
    emailEl.textContent = 'guest@Shop.vn';
    logoutBtn?.classList.add('hidden');
    loginLink?.classList.remove('hidden');
  }
}

// Auto merge cart nếu có session (khi tải trang)
window.addEventListener('load', () => {
  setTimeout(() => {
    mergeServerCartOnce();
    updateHeaderFromProfile();
  }, 100);
});

// Đếm ngược thời gian (countdown) cho các sự kiện có thời hạn
function startCountdown(endTime, elementId) {
  const end = new Date(endTime).getTime();
  const now = Date.now();
  const distance = end - now;
  if (distance < 0) return document.getElementById(elementId).textContent = 'Đã kết thúc';
  const days = Math.floor(distance / (1000 * 60 * 60 * 24));
  const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((distance % (1000 * 60)) / 1000);
  document.getElementById(elementId).textContent = `${days}d ${hours}h ${minutes}m ${seconds}s`;
  setTimeout(() => startCountdown(endTime, elementId), 1000);
}

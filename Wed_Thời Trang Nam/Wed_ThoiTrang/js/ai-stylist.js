(function(){
  // Tạo modal khi DOM sẵn sàng
  function createModal() {
    if (document.getElementById('ai-stylist-modal')) return;
    const modal = document.createElement('div');
    modal.id = 'ai-stylist-modal';
    modal.innerHTML = `
      <div class="ai-modal-backdrop fixed inset-0 bg-black/50 flex items-center justify-center z-60">
        <div class="ai-modal bg-white rounded-lg w-11/12 max-w-2xl p-4 shadow-lg">
          <div class="flex justify-between items-center mb-3">
            <h3 class="text-lg font-semibold">AI Stylist — Gợi ý phối đồ</h3>
            <button id="ai-close" class="text-gray-600 hover:text-gray-900">&times;</button>
          </div>
          <div class="space-y-3">
            <div>
              <label class="block text-sm">Hoàn cảnh / Gợi ý (ví dụ: đi làm, dạo phố, tiệc tối)</label>
              <input id="ai-context" class="w-full border rounded px-2 py-1" placeholder="Nhập hoàn cảnh, màu ưa thích, kiểu..." />
            </div>
            <div class="flex gap-2">
              <select id="ai-size" class="border rounded px-2 py-1">
                <option value="">Kích cỡ (tùy chọn)</option>
                <option>M</option><option>L</option><option>XL</option>
              </select>
              <select id="ai-color" class="border rounded px-2 py-1">
                <option value="">Màu ưa thích</option>
                <option>Đen</option><option>Trắng</option><option>Xám</option><option>Đỏ</option>
              </select>
            </div>
            <div class="flex justify-end gap-2">
              <button id="ai-generate" class="bg-red-600 text-white px-4 py-1 rounded">Gợi ý</button>
            </div>
            <div id="ai-results" class="space-y-3"></div>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    document.getElementById('ai-close').addEventListener('click', closeModal);
    document.getElementById('ai-generate').addEventListener('click', () => {
      const ctx = document.getElementById('ai-context').value.trim();
      const size = document.getElementById('ai-size').value;
      const color = document.getElementById('ai-color').value;
      generateSuggestions({ context: ctx, size, color });
    });
  }

  function openModal() {
    createModal();
    document.getElementById('ai-stylist-modal').style.display = 'block';
    document.querySelector('#ai-stylist-modal .ai-modal-backdrop').scrollIntoView();
  }

  function closeModal() {
    const m = document.getElementById('ai-stylist-modal');
    if (m) m.style.display = 'none';
  }

  // Helper: nhận products từ window.products, gợi ý đơn giản theo loại/từ khóa
  function classifyProducts(products) {
    const groups = { top: [], bottom: [], shoes: [], accessory: [], other: [] };
    (products || []).forEach(p => {
      const name = (p.name || '').toLowerCase();
      const cat = (p.category || '').toLowerCase();
      if (name.match(/(shirt|áo|t-shirt|polo|sơ mi)/) || cat.includes('top') || cat.includes('áo')) groups.top.push(p);
      else if (name.match(/(pant|quần|jean|trousers)/) || cat.includes('bottom') || cat.includes('quần')) groups.bottom.push(p);
      else if (name.match(/(shoe|giày|sandal|sneaker)/) || cat.includes('shoe') || cat.includes('giày')) groups.shoes.push(p);
      else if (name.match(/(belt|kính|hat|mũ|watch|đồng hồ|phụ kiện)/) || cat.includes('accessory')) groups.accessory.push(p);
      else groups.other.push(p);
    });
    return groups;
  }

  function pickBest(list, prefColor, prefSize) {
    if (!list || list.length === 0) return null;
    // Ưu tiên cùng màu, cùng size, rồi giá trị (giả sử có price)
    let filtered = list.slice();
    if (prefColor) filtered = filtered.filter(p => (p.color || '').toLowerCase().includes(prefColor.toLowerCase()));
    if (prefSize) filtered = filtered.filter(p => (p.size || []).includes(prefSize) || (p.size === prefSize));
    if (filtered.length === 0) filtered = list.slice();
    // chọn ngẫu nhiên ổn định: sort theo price desc nếu có, else random
    filtered.sort((a,b) => (b.price||0) - (a.price||0));
    return filtered[0];
  }

  function renderOutfitCard(items) {
    return `
      <div class="p-3 border rounded bg-white flex gap-3 items-center">
        ${items.map(it => `
          <div style="width:80px">
            <img src="${it.image||'images/default-product.jpg'}" alt="${it.name||''}" style="width:80px;height:80px;object-fit:cover;border-radius:6px">
          </div>
        `).join('')}
        <div class="flex-1">
          ${items.map(it => `<div class="text-sm"><strong>${it.name}</strong> — ${it.price ? it.price.toLocaleString()+' VNĐ':''}</div>`).join('')}
          <div class="text-xs text-gray-500 mt-1">Kích cỡ / màu hiển thị nếu có</div>
        </div>
      </div>
    `;
  }

  function generateSuggestions({context, size, color}) {
    const resultsEl = document.getElementById('ai-results');
    resultsEl.innerHTML = `<p class="text-sm text-gray-600">Đang gợi ý...</p>`;
    // Nếu muốn, có thể gọi API server tại đây (bỏ comment và backend xử lý)
    // fetch('/api/ai-stylist', { method: 'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({context,size,color,products: window.products}) })
    //  .then(r=>r.json()).then(renderFromApi).catch(err=>{resultsEl.textContent='Lỗi kết nối';});

    // Local rule-based
    setTimeout(() => {
      const products = window.products || [];
      const groups = classifyProducts(products);
      const top = pickBest(groups.top, color, size);
      const bottom = pickBest(groups.bottom, color, size);
      const shoes = pickBest(groups.shoes, color, size);
      const accessory = pickBest(groups.accessory, color, size);

      const outfits = [];
      // 1 - full set top+bottom+shoes
      const set1 = [top, bottom, shoes].filter(Boolean);
      if (set1.length >= 2) outfits.push(set1);
      // 2 - top + accessory
      if (top && accessory) outfits.push([top, accessory]);
      // 3 - fallback: pick any 3 items
      const fallback = products.slice(0,3);
      if (fallback.length) outfits.push(fallback);

      if (outfits.length === 0) {
        resultsEl.innerHTML = `<p class="text-sm text-gray-600">Không tìm thấy gợi ý phù hợp.</p>`;
        return;
      }
      resultsEl.innerHTML = outfits.map(o => renderOutfitCard(o)).join('');
      // Gắn nút thêm vào giỏ cho mỗi item
      resultsEl.querySelectorAll('.ai-add-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const id = e.currentTarget.dataset.id;
          if (window.addToCart) window.addToCart(Number(id), 1);
        });
      });
    }, 300); // simulate
  }

  // Public
  window.openStylist = openModal;
  window.closeStylist = closeModal;

  // Bật nút floating
  document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('ai-stylist-btn');
    if (btn) btn.addEventListener('click', openModal);
  });
})();

// ===== URBAN PARFUM - App principal =====

let products = [];
let cart = JSON.parse(localStorage.getItem('cart') || '[]');
let activeFilter = 'all';
let activeSearch = '';
let activeSort = 'default';
let previousSection = 'inicio';

// Items pendientes para checkout (carrito o compra directa)
let pendingCheckoutItems = null;
let pendingCheckoutBtn = null;
let pendingCheckoutBtnText = '';

const MAX_QTY = 10;

// ===== FORMATO DE PRECIO =====
function formatPrice(price) {
  if (price === 0) return 'Consultar';
  return '$' + price.toLocaleString('es-AR');
}

// ===== SKELETON LOADING =====
function showSkeletons(count = 8) {
  const grid = document.getElementById('products-grid');
  if (!grid) return;
  grid.innerHTML = Array.from({ length: count }, () => `
    <div class="product-skeleton">
      <div class="sk-image"></div>
      <div class="sk-info">
        <div class="sk-line sk-line-short"></div>
        <div class="sk-line sk-line-long"></div>
        <div class="sk-line sk-line-med"></div>
      </div>
    </div>
  `).join('');
}

// ===== CARGA DE PRODUCTOS DESDE API =====
async function loadProducts() {
  showSkeletons();
  try {
    const res = await fetch('/api/productos');
    if (!res.ok) throw new Error('Error cargando productos');
    products = await res.json();
  } catch (err) {
    console.error('No se pudieron cargar los productos:', err);
    products = [];
    const grid = document.getElementById('products-grid');
    if (grid) {
      grid.innerHTML = `
        <div class="no-results">
          <i class="fa-solid fa-triangle-exclamation"></i>
          <p>No se pudieron cargar los productos. <button onclick="location.reload()" style="background:none;border:none;color:var(--color-gold);cursor:pointer;font-size:inherit;padding:0;text-decoration:underline">Reintentar</button></p>
        </div>`;
    }
  }
}

// ===== MODAL CHECKOUT — paso intermedio de datos =====
function openCheckoutModal(items, btn, defaultText) {
  pendingCheckoutItems = items;
  pendingCheckoutBtn = btn;
  pendingCheckoutBtnText = defaultText;

  // Cerrar el carrito antes de abrir el modal
  closeCart();

  // Construir resumen del pedido
  const total = items.reduce((s, i) => s + i.price * i.qty, 0);
  const summaryEl = document.getElementById('checkout-summary');
  summaryEl.innerHTML = `
    <div class="cs-label">Resumen</div>
    ${items.map(i => `<div class="cs-row"><span>${i.name} ×${i.qty}</span><span>${formatPrice(i.price * i.qty)}</span></div>`).join('')}
    <div class="cs-total"><span>Total</span><span>${formatPrice(total)}</span></div>
  `;

  // Resetear form
  document.getElementById('cf-name').value = '';
  document.getElementById('cf-email').value = '';
  document.getElementById('cf-phone').value = '';
  document.getElementById('cf-name-err').textContent = '';
  document.getElementById('cf-email-err').textContent = '';
  document.getElementById('checkout-submit-btn').disabled = false;
  document.getElementById('checkout-submit-btn').innerHTML = '<i class="fa-solid fa-credit-card"></i> Continuar a Mercado Pago';

  document.getElementById('checkout-overlay').classList.add('open');
  document.getElementById('checkout-modal').classList.add('open');
  document.body.style.overflow = 'hidden';
  setTimeout(() => document.getElementById('cf-name').focus(), 100);
}

function closeCheckoutModal() {
  document.getElementById('checkout-overlay').classList.remove('open');
  document.getElementById('checkout-modal').classList.remove('open');
  document.body.style.overflow = '';
  if (pendingCheckoutBtn) {
    pendingCheckoutBtn.textContent = pendingCheckoutBtnText;
    pendingCheckoutBtn.disabled = false;
  }
  pendingCheckoutItems = null;
  pendingCheckoutBtn = null;
}

function validateCheckoutForm() {
  let valid = true;
  const name = document.getElementById('cf-name').value.trim();
  const email = document.getElementById('cf-email').value.trim();

  document.getElementById('cf-name-err').textContent = '';
  document.getElementById('cf-email-err').textContent = '';

  if (!name || name.length < 2) {
    document.getElementById('cf-name-err').textContent = 'Ingresá tu nombre completo';
    valid = false;
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    document.getElementById('cf-email-err').textContent = 'Ingresá un email válido';
    valid = false;
  }
  return valid;
}

// ===== CHECKOUT REAL (Mercado Pago) =====
function checkoutItems(items, btn, defaultText) {
  openCheckoutModal(items, btn, defaultText);
}

async function ejecutarCheckout(items, payer) {
  const btn = document.getElementById('checkout-submit-btn');
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Procesando…';

  try {
    const response = await fetch('/create_preference', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items, payer })
    });
    const data = await response.json();
    if (data.sandbox_init_point) {
      window.location.href = data.sandbox_init_point;
    } else if (data.init_point) {
      window.location.href = data.init_point;
    } else {
      throw new Error(data.error || 'Error generando pago');
    }
  } catch (err) {
    showToast('Error al conectar con Mercado Pago: ' + err.message, 'error');
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-credit-card"></i> Continuar a Mercado Pago';
  }
}

// ===== RENDER PRODUCTOS (catálogo) =====
function renderProducts(filter = activeFilter, search = activeSearch, sort = activeSort) {
  const grid = document.getElementById('products-grid');
  const countEl = document.getElementById('products-count');

  let filtered = filter === 'all'
    ? [...products]
    : products.filter(p => (p.brand || '').toLowerCase().includes(filter.toLowerCase()));

  if (search.trim()) {
    const q = search.trim().toLowerCase();
    filtered = filtered.filter(p =>
      (p.name || '').toLowerCase().includes(q) || (p.brand || '').toLowerCase().includes(q)
    );
  }

  if (sort === 'price-asc')  filtered.sort((a, b) => a.price - b.price);
  if (sort === 'price-desc') filtered.sort((a, b) => b.price - a.price);
  if (sort === 'name-asc')   filtered.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

  countEl.textContent = `${filtered.length} perfume${filtered.length !== 1 ? 's' : ''}`;

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div class="no-results">
        <i class="fa-solid fa-magnifying-glass"></i>
        <p>Sin resultados para tu búsqueda</p>
        <button onclick="setFilter('all'); setSearch(''); document.getElementById('catalog-search').value=''" style="margin-top:1rem;background:none;border:1px solid var(--color-gold);color:var(--color-gold);padding:0.5rem 1.2rem;border-radius:4px;cursor:pointer;font-size:0.85rem">Limpiar filtros</button>
      </div>`;
    return;
  }

  grid.innerHTML = filtered.map(p => `
    <div class="product-card" data-id="${p.id}" onclick="openProductPage(${p.id})">
      <div class="product-image">
        <img src="${p.image}" alt="${p.name}" loading="lazy" onerror="this.src='images/placeholder.jpg'">
        ${p.featured ? '<span class="product-badge">TOP</span>' : (p.price >= 100000 ? '<span class="product-badge">Premium</span>' : '')}
      </div>
      <div class="product-info">
        <div class="product-brand">${p.brand}</div>
        <div class="product-name">${p.name}</div>
        <div class="product-footer">
          <span class="product-price">${formatPrice(p.price)}</span>
          ${p.price > 0 ? `<button class="btn-add" onclick="addToCart(${p.id}, event)"><i class="fa-solid fa-cart-plus"></i> Agregar</button>` : ''}
        </div>
      </div>
    </div>
  `).join('');
}

// ===== PÁGINA DE DETALLE DE PRODUCTO (PDP) =====
let pdpQty = 1;
let pdpProductId = null;

function openProductPage(id) {
  const p = products.find(x => x.id === id);
  if (!p) return;
  pdpProductId = id;
  pdpQty = 1;

  document.getElementById('pdp-img').src = p.image;
  document.getElementById('pdp-img').alt = p.name;
  document.getElementById('pdp-brand').textContent = p.brand;
  document.getElementById('pdp-name').textContent = p.name;
  document.getElementById('pdp-desc').textContent = p.description || '';
  document.getElementById('pdp-price').textContent = formatPrice(p.price);
  document.getElementById('pdp-qty-value').textContent = '1';

  const addBtn = document.getElementById('pdp-add-btn');
  const buyBtn = document.getElementById('pdp-buy-btn');

  if (p.price === 0) {
    addBtn.textContent = 'Consultar precio';
    buyBtn.style.display = 'none';
  } else {
    addBtn.innerHTML = 'Agregar al carrito';
    buyBtn.style.display = 'block';
    buyBtn.textContent = 'Comprar ahora';
    buyBtn.disabled = false;
  }

  navigateTo('producto');
}

function openModal(id) { openProductPage(id); }

function closeModal() {
  document.getElementById('modal-overlay').classList.remove('open');
  document.getElementById('modal-product').classList.remove('open');
  document.body.style.overflow = '';
}

// ===== CARRITO =====
function addToCart(id, event) {
  if (event) event.stopPropagation();
  const product = products.find(p => p.id === id);
  if (!product) return;

  const existing = cart.find(item => item.id === id);
  if (existing) {
    if (existing.qty >= MAX_QTY) {
      showToast(`Máximo ${MAX_QTY} unidades por producto`);
      return;
    }
    existing.qty += 1;
  } else {
    cart.push({ id: product.id, name: product.name, brand: product.brand, price: product.price, image: product.image, qty: 1 });
  }

  saveCart();
  updateCartUI(true);
  showToast(`${product.name} agregado al carrito`);
}

function removeFromCart(id) {
  cart = cart.filter(item => item.id !== id);
  saveCart();
  updateCartUI();
  renderCartItems();
}

function changeCartQty(id, delta) {
  const item = cart.find(i => i.id === id);
  if (!item) return;
  const newQty = item.qty + delta;
  if (newQty > MAX_QTY) {
    showToast(`Máximo ${MAX_QTY} unidades por producto`);
    return;
  }
  item.qty = newQty;
  if (item.qty <= 0) cart = cart.filter(i => i.id !== id);
  saveCart();
  updateCartUI();
  renderCartItems();
}

function saveCart() {
  localStorage.setItem('cart', JSON.stringify(cart));
}

function updateCartUI(animate = false) {
  const total = cart.reduce((sum, item) => sum + item.qty, 0);
  const badge = document.getElementById('cart-count');
  badge.textContent = total;
  badge.style.display = total > 0 ? 'flex' : 'none';
  if (animate && total > 0) {
    badge.classList.remove('pop');
    void badge.offsetWidth;
    badge.classList.add('pop');
  }
}

function renderCartItems() {
  const container = document.getElementById('cart-items');
  const totalEl = document.getElementById('cart-total');

  if (cart.length === 0) {
    container.innerHTML = '<div class="cart-empty"><i class="fa-solid fa-bag-shopping" style="font-size:2rem;opacity:0.3;display:block;margin-bottom:0.5rem"></i>Tu carrito está vacío</div>';
    totalEl.textContent = '$0';
    return;
  }

  container.innerHTML = cart.map(item => `
    <div class="cart-item">
      <img src="${item.image}" alt="${item.name}" loading="lazy" onerror="this.src='images/placeholder.jpg'">
      <div class="cart-item-info">
        <div class="cart-item-name">${item.name}</div>
        <div class="cart-item-brand">${item.brand}</div>
        <div class="cart-item-subtotal">${formatPrice(item.price * item.qty)}</div>
        <div class="cart-item-qty-controls">
          <button class="cq-btn" onclick="changeCartQty(${item.id}, -1)">−</button>
          <span class="cq-val">${item.qty}</span>
          <button class="cq-btn" onclick="changeCartQty(${item.id}, 1)" ${item.qty >= MAX_QTY ? 'disabled style="opacity:0.4"' : ''}>+</button>
        </div>
      </div>
      <button class="cart-item-remove" onclick="removeFromCart(${item.id})" title="Eliminar">×</button>
    </div>
  `).join('');

  const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  totalEl.textContent = formatPrice(total);
}

// ===== PANEL CARRITO =====
function openCart() {
  document.getElementById('cart-overlay').classList.add('open');
  document.getElementById('cart-panel').classList.add('open');
  renderCartItems();
}

function closeCart() {
  document.getElementById('cart-overlay').classList.remove('open');
  document.getElementById('cart-panel').classList.remove('open');
}

// ===== FILTROS =====
function setFilter(brand) {
  activeFilter = brand;
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.filter === brand);
  });
  renderProducts(brand, activeSearch, activeSort);
}

function setSearch(query) {
  activeSearch = query;
  renderProducts(activeFilter, query, activeSort);
}

function setSort(sort) {
  activeSort = sort;
  renderProducts(activeFilter, activeSearch, sort);
}

// ===== TOAST =====
function showToast(msg, type = 'info') {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.className = 'toast show' + (type === 'error' ? ' toast-error' : type === 'success' ? ' toast-success' : '');
  clearTimeout(toast._timeout);
  toast._timeout = setTimeout(() => toast.classList.remove('show'), 3000);
}

// ===== HOME - PRODUCTOS DESTACADOS =====
function renderFeatured() {
  const grid = document.getElementById('featured-grid');
  if (!grid) return;
  const featured = products.filter(p => p.featured).slice(0, 8);
  const list = featured.length >= 4 ? featured : products.slice(0, 8);

  grid.innerHTML = list.map(p => `
    <div class="product-card" onclick="openProductPage(${p.id})">
      <div class="product-image">
        <img src="${p.image}" alt="${p.name}" loading="lazy" onerror="this.src='images/placeholder.jpg'">
        <span class="product-badge">Top</span>
      </div>
      <div class="product-info">
        <div class="product-brand">${p.brand}</div>
        <div class="product-name">${p.name}</div>
        <div class="product-footer">
          <span class="product-price">${formatPrice(p.price)}</span>
          ${p.price > 0 ? `<button class="btn-add" onclick="addToCart(${p.id}, event)"><i class="fa-solid fa-cart-plus"></i> Agregar</button>` : ''}
        </div>
      </div>
    </div>
  `).join('');
}

function renderBrandCards() {
  const container = document.getElementById('brand-list');
  if (!container) return;

  const brands = [
    { name: 'Armaf',       desc: 'Fragancias orientales de lujo, Dubai' },
    { name: 'Lattafa',     desc: 'Perfumería árabe contemporánea' },
    { name: 'Afnan',       desc: 'Esencias finas del Medio Oriente' },
    { name: 'Bharara',     desc: 'Alta perfumería exclusiva' },
    { name: 'Al Haramain', desc: 'Tradición olfativa árabe desde 1970' },
    { name: 'Rasasi',      desc: 'Fragancias únicas de Dubai' },
  ];

  container.innerHTML = brands.map(b => {
    const count = products.filter(p => (p.brand || '') === b.name).length;
    return `
      <div class="brand-list-item" onclick="navigateTo('catalogo'); setFilter('${b.name}')">
        <div class="bli-left">
          <span class="bli-name">${b.name}</span>
          <span class="bli-desc">${b.desc}</span>
        </div>
        <div class="bli-right">
          <span class="bli-count">${count} fragancias</span>
          <span class="bli-arrow">→</span>
        </div>
      </div>
    `;
  }).join('');
}

function renderScrollRow() {
  const row = document.getElementById('scroll-row');
  if (!row) return;
  const featuredIds = products.filter(p => p.featured).map(p => p.id);
  const rest = products.filter(p => !featuredIds.includes(p.id));
  const list = rest.length > 0 ? rest : products;

  const cardHtml = p => `
    <div class="product-card" onclick="openProductPage(${p.id})">
      <div class="product-image">
        <img src="${p.image}" alt="${p.name}" loading="lazy" onerror="this.src='images/placeholder.jpg'">
      </div>
      <div class="product-info">
        <div class="product-brand">${p.brand}</div>
        <div class="product-name">${p.name}</div>
        <div class="product-footer">
          <span class="product-price">${formatPrice(p.price)}</span>
          ${p.price > 0 ? `<button class="btn-add" onclick="addToCart(${p.id}, event)"><i class="fa-solid fa-cart-plus"></i> Agregar</button>` : ''}
        </div>
      </div>
    </div>
  `;
  row.innerHTML = [...list, ...list].map(cardHtml).join('');
}

// ===== ESTADÍSTICAS DINÁMICAS =====
function updateStats() {
  const totalEl = document.getElementById('stat-total-products');
  if (totalEl) totalEl.textContent = products.length + '+';
  const brandCount = new Set(products.map(p => p.brand).filter(Boolean)).size;
  const brandEl = document.getElementById('stat-brand-count');
  if (brandEl) brandEl.textContent = brandCount;
}

// ===== NAVEGACIÓN SPA =====
function navigateTo(sectionId) {
  if (sectionId !== 'producto') previousSection = sectionId;

  document.querySelectorAll('.page-section').forEach(s => s.classList.remove('active-section'));
  const target = document.getElementById(sectionId);
  if (target) target.classList.add('active-section');

  if (sectionId !== 'producto') {
    document.querySelectorAll('.nav-link').forEach(a => {
      a.classList.toggle('active-link', a.dataset.section === sectionId);
    });
    document.querySelectorAll('.mobile-link').forEach(a => {
      a.classList.toggle('active-link', a.dataset.section === sectionId);
    });
  }

  const slider = document.querySelector('.hero-slider');
  if (slider) {
    slider.style.display = sectionId === 'inicio' ? 'block' : 'none';
    if (sectionId === 'inicio') {
      if (!sliderInterval) startSlider();
    } else {
      clearInterval(sliderInterval);
      sliderInterval = null;
    }
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ===== SLIDER =====
let currentSlide = 0;
let sliderInterval;

function goToSlide(index) {
  const slides = document.querySelectorAll('.slide');
  const dots = document.querySelectorAll('.dot');
  if (!slides.length) return;
  slides[currentSlide].classList.remove('active');
  dots[currentSlide]?.classList.remove('active');
  currentSlide = (index + slides.length) % slides.length;
  slides[currentSlide].classList.add('active');
  dots[currentSlide]?.classList.add('active');
}

function startSlider() {
  sliderInterval = setInterval(() => goToSlide(currentSlide + 1), 4500);
}

function initSlider() {
  document.getElementById('slider-prev')?.addEventListener('click', () => {
    goToSlide(currentSlide - 1); clearInterval(sliderInterval); startSlider();
  });
  document.getElementById('slider-next')?.addEventListener('click', () => {
    goToSlide(currentSlide + 1); clearInterval(sliderInterval); startSlider();
  });
  document.querySelectorAll('.dot').forEach(dot => {
    dot.addEventListener('click', () => {
      goToSlide(parseInt(dot.dataset.index)); clearInterval(sliderInterval); startSlider();
    });
  });

  const slider = document.querySelector('.hero-slider');
  if (slider) {
    let touchStartX = 0;
    slider.addEventListener('touchstart', e => { touchStartX = e.changedTouches[0].clientX; }, { passive: true });
    slider.addEventListener('touchend', e => {
      const dx = e.changedTouches[0].clientX - touchStartX;
      if (Math.abs(dx) > 40) { goToSlide(dx < 0 ? currentSlide + 1 : currentSlide - 1); clearInterval(sliderInterval); startSlider(); }
    }, { passive: true });
  }

  startSlider();
}

// ===== TOGGLE TEMA =====
function applyTheme(isDark) {
  const theme = isDark ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);
  const logoSrc = isDark ? 'images/logo-transparent-dark.png' : 'images/logo-transparent-light.png';
  ['header-logo', 'footer-logo'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.src = logoSrc;
  });
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded', async () => {
  await loadProducts();

  renderProducts();
  updateCartUI();
  renderFeatured();
  renderBrandCards();
  renderScrollRow();
  updateStats();

  // Filtros — contar productos por marca
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => setFilter(btn.dataset.filter));
    const f = btn.dataset.filter;
    if (f && f !== 'all') {
      const count = products.filter(p => (p.brand || '') === f).length;
      const label = btn.getAttribute('data-label') || btn.textContent.trim();
      btn.setAttribute('data-label', label);
      if (count > 0) btn.textContent = `${label} (${count})`;
    }
  });

  // Buscador catálogo (con debounce 300ms)
  let searchDebounce;
  document.getElementById('catalog-search')?.addEventListener('input', e => {
    clearTimeout(searchDebounce);
    searchDebounce = setTimeout(() => setSearch(e.target.value), 300);
  });

  // Limpiar búsqueda con Escape
  document.getElementById('catalog-search')?.addEventListener('keydown', e => {
    if (e.key === 'Escape') { e.target.value = ''; setSearch(''); }
  });

  // Ordenador catálogo
  document.getElementById('catalog-sort')?.addEventListener('change', e => setSort(e.target.value));

  // Carrito
  document.getElementById('cart-btn').addEventListener('click', openCart);
  document.getElementById('cart-close').addEventListener('click', closeCart);
  document.getElementById('cart-overlay').addEventListener('click', closeCart);

  // Tema
  const savedTheme = localStorage.getItem('theme') || 'dark';
  const isDark = savedTheme === 'dark';
  const toggle = document.getElementById('theme-toggle');
  toggle.checked = !isDark;
  applyTheme(isDark);
  toggle.addEventListener('change', () => applyTheme(!toggle.checked));

  // Slider
  initSlider();

  // Modal legado (close)
  document.getElementById('modal-close').addEventListener('click', closeModal);
  document.getElementById('modal-overlay').addEventListener('click', closeModal);

  // Teclado — Escape cierra modales
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { closeModal(); closeCart(); closeCheckoutModal(); }
  });

  // PDP
  document.getElementById('pdp-back-btn').addEventListener('click', () => navigateTo(previousSection));

  document.getElementById('pdp-qty-minus').addEventListener('click', () => {
    if (pdpQty > 1) { pdpQty--; document.getElementById('pdp-qty-value').textContent = pdpQty; }
  });
  document.getElementById('pdp-qty-plus').addEventListener('click', () => {
    if (pdpQty < MAX_QTY) { pdpQty++; document.getElementById('pdp-qty-value').textContent = pdpQty; }
  });

  document.getElementById('pdp-add-btn').addEventListener('click', () => {
    if (!pdpProductId) return;
    const p = products.find(x => x.id === pdpProductId);
    if (!p || p.price === 0) return;
    const existing = cart.find(item => item.id === pdpProductId);
    if (existing) {
      const newQty = existing.qty + pdpQty;
      if (newQty > MAX_QTY) { showToast(`Máximo ${MAX_QTY} unidades por producto`); return; }
      existing.qty = newQty;
    } else {
      cart.push({ id: p.id, name: p.name, brand: p.brand, price: p.price, image: p.image, qty: pdpQty });
    }
    saveCart(); updateCartUI(true);
    showToast(`${p.name} agregado al carrito`);
  });

  document.getElementById('pdp-buy-btn').addEventListener('click', () => {
    if (!pdpProductId) return;
    const p = products.find(x => x.id === pdpProductId);
    if (!p || p.price === 0) return;
    checkoutItems(
      [{ id: p.id, name: p.name, price: p.price, qty: pdpQty }],
      document.getElementById('pdp-buy-btn'),
      'Comprar ahora'
    );
  });

  // Modal legado
  let modalQty = 1, modalProductId = null;
  document.getElementById('qty-minus').addEventListener('click', () => {
    if (modalQty > 1) { modalQty--; document.getElementById('qty-value').textContent = modalQty; }
  });
  document.getElementById('qty-plus').addEventListener('click', () => {
    if (modalQty < MAX_QTY) { modalQty++; document.getElementById('qty-value').textContent = modalQty; }
  });
  document.getElementById('modal-add-btn').addEventListener('click', () => {
    if (!modalProductId) return;
    const p = products.find(x => x.id === modalProductId);
    if (!p || p.price === 0) return;
    const existing = cart.find(item => item.id === modalProductId);
    if (existing) {
      const newQty = existing.qty + modalQty;
      if (newQty > MAX_QTY) { showToast(`Máximo ${MAX_QTY} unidades por producto`); return; }
      existing.qty = newQty;
    } else {
      cart.push({ id: p.id, name: p.name, brand: p.brand, price: p.price, image: p.image, qty: modalQty });
    }
    saveCart(); updateCartUI(true); showToast(`${p.name} agregado al carrito`); closeModal();
  });
  document.getElementById('modal-buy-btn').addEventListener('click', () => {
    if (!modalProductId) return;
    const p = products.find(x => x.id === modalProductId);
    if (!p || p.price === 0) return;
    checkoutItems([{ id: p.id, name: p.name, price: p.price, qty: modalQty }], document.getElementById('modal-buy-btn'), 'Comprar ahora');
  });

  // Checkout carrito
  document.getElementById('btn-checkout')?.addEventListener('click', () => {
    if (cart.length === 0) return;
    checkoutItems(
      cart.map(item => ({ id: item.id, name: item.name, price: item.price, qty: item.qty })),
      document.getElementById('btn-checkout'),
      'Finalizar Compra'
    );
  });

  // Modal checkout — submit
  document.getElementById('checkout-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!validateCheckoutForm()) return;
    if (!pendingCheckoutItems) return;

    const payer = {
      name: document.getElementById('cf-name').value.trim(),
      email: document.getElementById('cf-email').value.trim(),
      phone: document.getElementById('cf-phone').value.trim() || undefined,
    };

    await ejecutarCheckout(pendingCheckoutItems, payer);
  });

  // Modal checkout — cerrar
  document.getElementById('checkout-close').addEventListener('click', closeCheckoutModal);
  document.getElementById('checkout-overlay').addEventListener('click', closeCheckoutModal);

  // Scroll to top
  const scrollBtn = document.getElementById('scroll-top-btn');
  if (scrollBtn) {
    window.addEventListener('scroll', () => scrollBtn.classList.toggle('visible', window.scrollY > 400));
    scrollBtn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  }

  // Navegación
  document.querySelectorAll('.nav-link').forEach(a => {
    a.addEventListener('click', e => { e.preventDefault(); navigateTo(a.dataset.section); });
  });
  document.querySelectorAll('.footer-nav-links a[data-section]').forEach(a => {
    a.addEventListener('click', e => { e.preventDefault(); navigateTo(a.dataset.section); });
  });

  const hamburger = document.getElementById('hamburger');
  const mobileMenu = document.getElementById('mobile-menu');
  hamburger?.addEventListener('click', () => {
    hamburger.classList.toggle('open');
    mobileMenu.classList.toggle('open');
  });
  document.querySelectorAll('.mobile-link').forEach(a => {
    a.addEventListener('click', e => {
      e.preventDefault();
      hamburger.classList.remove('open');
      mobileMenu.classList.remove('open');
      navigateTo(a.dataset.section);
    });
  });
  document.addEventListener('click', e => {
    if (mobileMenu?.classList.contains('open') &&
        !mobileMenu.contains(e.target) &&
        !hamburger.contains(e.target)) {
      hamburger.classList.remove('open');
      mobileMenu.classList.remove('open');
    }
  });

  document.querySelectorAll('.brand-card').forEach(card => {
    card.addEventListener('click', () => { navigateTo('catalogo'); setFilter(card.dataset.brand); });
  });

  // Retorno desde Mercado Pago
  const urlParams = new URLSearchParams(window.location.search);
  const mpStatus = urlParams.get('status');
  if (mpStatus === 'success') {
    cart = []; saveCart(); updateCartUI();
    setTimeout(() => showToast('¡Compra realizada con éxito! Gracias por tu pedido 🎉', 'success'), 500);
  } else if (mpStatus === 'failure') {
    setTimeout(() => showToast('El pago no se pudo completar. Intentá de nuevo.', 'error'), 500);
  } else if (mpStatus === 'pending') {
    setTimeout(() => showToast('Tu pago está pendiente de confirmación. Te avisaremos por email.'), 500);
  }
  if (mpStatus) {
    history.replaceState(null, '', window.location.pathname);
  }

  navigateTo('inicio');

  // FAQ
  document.querySelectorAll('.faq-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.tab;
      document.querySelectorAll('.faq-tab').forEach(t => { t.classList.remove('faq-tab--active'); t.setAttribute('aria-selected', 'false'); });
      document.querySelectorAll('.faq-panel').forEach(panel => { panel.hidden = true; panel.classList.remove('faq-panel--active'); });
      tab.classList.add('faq-tab--active'); tab.setAttribute('aria-selected', 'true');
      const panel = document.getElementById('faq-tab-' + target);
      if (panel) { panel.hidden = false; panel.classList.add('faq-panel--active'); }
    });
  });

  document.querySelectorAll('.faq-question').forEach(btn => {
    btn.addEventListener('click', () => {
      const expanded = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', String(!expanded));
      btn.nextElementSibling.hidden = expanded;
    });
  });
});

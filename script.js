// بيانات المنتجات (صور من مكان عام + أسعار وكميات)
const productsData = {
  'produits-grid': [
    { name: 'منتج متعدد 1', price: '120.00', quantity: '45 قطعة', img: 'https://picsum.photos/seed/prod1/300/200' },
    { name: 'منتج متعدد 2', price: '85.50', quantity: '30 قطعة', img: 'https://picsum.photos/seed/prod2/300/200' },
    { name: 'منتج متعدد 3', price: '210.00', quantity: '18 قطعة', img: 'https://picsum.photos/seed/prod3/300/200' }
  ],
  'jupiter-grid': [
    { name: 'جوبيتر 95', price: '45.00', quantity: '120 لتر', img: 'https://picsum.photos/seed/jup1/300/200' },
    { name: 'جوبيتر سوبر', price: '62.00', quantity: '80 لتر', img: 'https://picsum.photos/seed/jup2/300/200' },
    { name: 'جوبيتر بريميوم', price: '89.00', quantity: '55 لتر', img: 'https://picsum.photos/seed/jup3/300/200' }
  ],
  'diluant-grid': [
    { name: 'مخفف 101', price: '30.00', quantity: '200 لتر', img: 'https://picsum.photos/seed/dil1/300/200' },
    { name: 'مخفف سريع', price: '42.00', quantity: '150 لتر', img: 'https://picsum.photos/seed/dil2/300/200' },
    { name: 'مخفف فاخر', price: '55.00', quantity: '90 لتر', img: 'https://picsum.photos/seed/dil3/300/200' }
  ],
  'colle-grid': [
    { name: 'غراء خشب', price: '18.00', quantity: '60 كجم', img: 'https://picsum.photos/seed/col1/300/200' },
    { name: 'غراء سريع', price: '27.00', quantity: '40 كجم', img: 'https://picsum.photos/seed/col2/300/200' },
    { name: 'غراء إيبوكسي', price: '75.00', quantity: '25 كجم', img: 'https://picsum.photos/seed/col3/300/200' }
  ],
  'peinture-grid': [
    { name: 'دهان داخلي', price: '150.00', quantity: '20 علبة', img: 'https://picsum.photos/seed/pnt1/300/200' },
    { name: 'دهان خارجي', price: '190.00', quantity: '15 علبة', img: 'https://picsum.photos/seed/pnt2/300/200' },
    { name: 'دهان مائي', price: '110.00', quantity: '30 علبة', img: 'https://picsum.photos/seed/pnt3/300/200' }
  ]
};

// دالة لعرض المنتجات في كل قسم
function renderProducts() {
  for (const [gridId, products] of Object.entries(productsData)) {
    const container = document.getElementById(gridId);
    if (!container) continue;
    container.innerHTML = '';
    products.forEach((p, index) => {
      const card = document.createElement('div');
      card.className = 'product-card';
      card.style.animationDelay = `${index * 0.1}s`;
      card.innerHTML = `
        <img src="${p.img}" alt="${p.name}" loading="lazy">
        <h3>${p.name}</h3>
        <div class="price">${p.price} دج</div>
        <div class="quantity"><i class="fas fa-cubes"></i> ${p.quantity}</div>
        <button class="btn-card" data-product="${p.name}">
          <i class="fas fa-cart-plus"></i> إضافة للسلة
        </button>
      `;
      container.appendChild(card);
    });
  }
}

// تفعيل الأزرار (تأثيرات + تنبيه)
document.addEventListener('click', function(e) {
  if (e.target.closest('.btn-card')) {
    const btn = e.target.closest('.btn-card');
    const productName = btn.getAttribute('data-product') || 'المنتج';
    // تأثير اهتزاز + تغيير مؤقت
    btn.innerHTML = '<i class="fas fa-check-circle"></i> تم الإضافة!';
    btn.style.background = '#27ae60';
    btn.style.color = '#fff';
    setTimeout(() => {
      btn.innerHTML = `<i class="fas fa-cart-plus"></i> إضافة للسلة`;
      btn.style.background = '#1e2a3a';
      btn.style.color = '#fff';
    }, 1200);
    // تنبيه أنيق
    alert(`✅ تم إضافة "${productName}" إلى سلة المشتريات!`);
  }
});

// زر الرجوع للأعلى
const topBtn = document.getElementById('backToTop');
window.addEventListener('scroll', function() {
  if (window.scrollY > 500) {
    topBtn.classList.add('show');
  } else {
    topBtn.classList.remove('show');
  }
});
topBtn.addEventListener('click', function() {
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

// تشغيل العرض
renderProducts();
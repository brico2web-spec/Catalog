const KEY = "catalog3DPeinturesProducts";
const demo = [
  {id:1, name:"Essence Jupiter 1L", cat:"Essence Jupiter", ref:"EJ-001", price:18.50, qty:46, emoji:"🧪", image:""},
  {id:2, name:"Essence Jupiter 5L", cat:"Essence Jupiter", ref:"EJ-005", price:79.00, qty:18, emoji:"🧴", image:""},
  {id:3, name:"Diluant Synthétique 1L", cat:"Diluant", ref:"DL-001", price:24.90, qty:31, emoji:"🫙", image:""},
  {id:4, name:"Diluant Cellulosique 1L", cat:"Diluant", ref:"DL-002", price:29.90, qty:8, emoji:"⚗️", image:""},
  {id:5, name:"Colle à Bois 250g", cat:"Colle", ref:"CL-250", price:12.50, qty:55, emoji:"🧴", image:""},
  {id:6, name:"Colle Universelle 1kg", cat:"Colle", ref:"CL-001", price:32.00, qty:22, emoji:"🔗", image:""},
  {id:7, name:"Peinture Vinylique Blanche", cat:"Peinture", ref:"PV-B01", price:69.00, qty:14, emoji:"🎨", image:""},
  {id:8, name:"Peinture Étanchéité Rouge", cat:"Peinture", ref:"PE-R01", price:89.00, qty:6, emoji:"🪣", image:""},
  {id:9, name:"Peinture Intérieure Mat", cat:"Peinture", ref:"PI-M01", price:119.00, qty:25, emoji:"🖌️", image:""},
  {id:10, name:"White Spirit 1L", cat:"Produits", ref:"WS-001", price:17.00, qty:40, emoji:"🧴", image:""}
];

let data = JSON.parse(localStorage.getItem(KEY) || "null") || demo;
let active = "Produits";

const grid = document.getElementById("grid"), 
      title = document.getElementById("sectionTitle"), 
      count = document.getElementById("resultCount");
const detailBg = document.getElementById("detailBg"), 
      detail = document.getElementById("detail");
const adminBg = document.getElementById("adminBg");

function save() {
  localStorage.setItem(KEY, JSON.stringify(data));
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[c]));
}

function render() {
  let list = data.filter(p => active === "Produits" || p.cat === active);
  const searchInput = document.getElementById("search");
  if (searchInput) {
    const q = searchInput.value.trim().toLowerCase();
    if (q) list = list.filter(p => (p.name + " " + p.ref + " " + p.cat).toLowerCase().includes(q));
  }
  
  const sortEl = document.getElementById("sort");
  if (sortEl) {
    const sort = sortEl.value;
    if (sort === "priceAsc") list.sort((a, b) => a.price - b.price);
    if (sort === "priceDesc") list.sort((a, b) => b.price - a.price);
    if (sort === "stock") list.sort((a, b) => b.qty - a.qty);
  }

  if (title) title.textContent = active === "Produits" ? "Tous les produits" : active;
  if (count) count.textContent = `${list.length} produit(s)`;
  
  if (grid) {
    grid.innerHTML = list.map(p => `
      <article class="card">
        <div class="photo">
          ${p.image ? `<img src="${p.image}" alt="${esc(p.name)}">` : `<span class="ph">${p.emoji || "📦"}</span>`}
          <span class="badge">${esc(p.cat)}</span>
        </div>
        <div class="card-info">
          <span class="ref">${esc(p.ref || "REF-000")}</span>
          <h3>${esc(p.name)}</h3>
          <span class="cat-name">${esc(p.cat)}</span>
          <div class="bottom">
            <span class="price">${Number(p.price).toFixed(2)} <small>DH</small></span>
            <span class="stock ${p.qty < 10 ? "low" : ""}">${p.qty < 10 ? "Stock limité" : "En stock"} · ${p.qty}</span>
          </div>
          <button class="details" onclick="showDetail(${p.id})">Voir le produit ✦</button>
          <div class="card-actions">
            <button onclick="editProduct(${p.id})">✎ Modifier</button>
            <button onclick="deleteProduct(${p.id})">Supprimer</button>
          </div>
        </div>
      </article>`).join("");
  }
}

function updateStats() {
  const sp = document.getElementById("statProducts"), 
        ss = document.getElementById("statStock"), 
        sc = document.getElementById("statCats");
  if (sp) sp.textContent = data.length;
  if (ss) ss.textContent = data.reduce((sum, p) => sum + Number(p.qty || 0), 0);
  if (sc) sc.textContent = new Set(data.map(p => p.cat)).size;
}

function refreshAdminProducts() {
  const box = document.getElementById("adminProducts"); 
  if (!box) return;
  box.innerHTML = data.map(p => `
    <div class="admin-row">
      <span>${esc(p.name)}</span>
      <b>${Number(p.price).toFixed(2)} DH</b>
      <button type="button" onclick="editProduct(${p.id})">Modifier</button>
      <button type="button" onclick="deleteProduct(${p.id})">×</button>
    </div>`).join("");
}

function editProduct(id) {
  const p = data.find(x => x.id === id); 
  if (!p) return;
  
  document.getElementById("pName").value = p.name;
  document.getElementById("pCat").value = p.cat;
  document.getElementById("pRef").value = p.ref || "";
  document.getElementById("pPrice").value = p.price;
  document.getElementById("pQty").value = p.qty;
  document.getElementById("pImage").value = "";
  
  const preview = document.getElementById("preview");
  if(preview) preview.innerHTML = p.image ? `<img src="${p.image}" alt="Photo actuelle">` : "Aperçu de la photo";
  
  const form = document.getElementById("productForm");
  form.dataset.editId = id;
  
  const saveBtn = document.querySelector(".save-btn");
  if(saveBtn) saveBtn.innerHTML = 'Enregistrer les modifications <span>✓</span>';
  
  if(adminBg) adminBg.classList.add("show");
}

function deleteProduct(id) {
  const p = data.find(x => x.id === id); 
  if (!p) return;
  if (confirm("Supprimer « " + p.name + " » ?")) {
    data = data.filter(x => x.id !== id); 
    save(); 
    render(); 
    updateStats(); 
    refreshAdminProducts(); 
    toast("تم حذف المنتوج");
  }
}

function selectCat(cat) {
  active = cat;
  document.querySelectorAll(".nav-item").forEach(b => b.classList.toggle("active", b.dataset.cat === cat));
  render(); 
  updateStats();
  const catalog = document.getElementById("catalog");
  if(catalog) catalog.scrollIntoView({ behavior: "smooth", block: "start" });
}

document.querySelectorAll("[data-cat]").forEach(b => b.addEventListener("click", () => selectCat(b.dataset.cat)));

const searchEl = document.getElementById("search");
if(searchEl) searchEl.addEventListener("input", render);

const sortEl = document.getElementById("sort");
if(sortEl) sortEl.addEventListener("change", render);

const searchToggle = document.getElementById("searchToggle");
if(searchToggle) searchToggle.onclick = () => document.getElementById("searchPanel").classList.toggle("open");

const adminToggle = document.getElementById("adminToggle");
if(adminToggle) {
  adminToggle.onclick = () => {
    const form = document.getElementById("productForm");
    delete form.dataset.editId;
    form.reset();
    const preview = document.getElementById("preview");
    if(preview) preview.textContent = "Aperçu de la photo";
    const saveBtn = document.querySelector(".save-btn");
    if(saveBtn) saveBtn.innerHTML = 'Ajouter au catalogue <span>✦</span>';
    refreshAdminProducts(); 
    updateStats(); 
    if(adminBg) adminBg.classList.add("show");
  };
}

const closeAdmin = document.getElementById("closeAdmin");
if(closeAdmin) closeAdmin.onclick = () => adminBg.classList.remove("show");

[detailBg, adminBg].forEach(x => {
  if(x) x.addEventListener("click", e => { if (e.target === x) x.classList.remove("show"); });
});

function showDetail(id) {
  const p = data.find(x => x.id === id);
  if(!p) return;
  detail.innerHTML = `
    <button class="close" onclick="detailBg.classList.remove('show')">×</button>
    <div class="detail-photo">${p.image ? `<img src="${p.image}" alt="${esc(p.name)}">` : `<span>${p.emoji || "📦"}</span>`}</div>
    <div>
      <span class="eyebrow">${esc(p.cat)}</span>
      <h2>${esc(p.name)}</h2>
      <p class="muted">Référence : ${esc(p.ref || "—")}</p>
      <div class="detail-price">${Number(p.price).toFixed(2)} DH</div>
      <p>Disponibilité : <b>${p.qty} unités</b></p>
      <p class="muted">Une présentation claire pour vos clients avec la photo, le prix, la catégorie et la quantité disponible.</p>
    </div>`;
  if(detailBg) detailBg.classList.add("show");
}

const file = document.getElementById("pImage"), preview = document.getElementById("preview");
if(file && preview) {
  file.addEventListener("change", () => {
    const f = file.files[0]; 
    if (!f) return;
    const r = new FileReader(); 
    r.onload = e => preview.innerHTML = `<img src="${e.target.result}">`; 
    r.readAsDataURL(f);
  });
}

const productForm = document.getElementById("productForm");
if(productForm) {
  productForm.addEventListener("submit", e => {
    e.preventDefault();
    const form = e.target, editId = Number(form.dataset.editId || 0);
    const f = file ? file.files[0] : null;

    const finish = (img) => {
      const nameVal = document.getElementById("pName").value.trim();
      const catVal = document.getElementById("pCat").value;
      const refVal = document.getElementById("pRef").value.trim();
      const priceVal = Number(document.getElementById("pPrice").value);
      const qtyVal = Number(document.getElementById("pQty").value);

      if (editId) {
        const p = data.find(x => x.id === editId);
        if (p) {
          p.name = nameVal;
          p.cat = catVal;
          p.ref = refVal || p.ref;
          p.price = priceVal;
          p.qty = qtyVal;
          if (img) p.image = img;
        }
        toast("تم تعديل المنتوج ✓");
      } else {
        data.unshift({
          id: Date.now(),
          name: nameVal,
          cat: catVal,
          ref: refVal || "REF-" + Date.now().toString().slice(-4),
          price: priceVal,
          qty: qtyVal,
          emoji: "📦",
          image: img || ""
        });
        toast("تمت إضافة المنتوج ✓");
      }
      
      save(); 
      render(); 
      updateStats(); 
      refreshAdminProducts();
      
      if(adminBg) adminBg.classList.remove("show"); 
      form.reset(); 
      delete form.dataset.editId;
      if(preview) preview.textContent = "Aperçu de la photo";
      
      const saveBtn = document.querySelector(".save-btn");
      if(saveBtn) saveBtn.innerHTML = 'Ajouter au catalogue <span>✦</span>';
    };

    if (f) {
      const r = new FileReader(); 
      r.onload = x => finish(x.target.result); 
      r.readAsDataURL(f);
    } else {
      const existingEditId = Number(form.dataset.editId || 0);
      let existingImg = "";
      if(existingEditId) {
        const p = data.find(x => x.id === existingEditId);
        if(p) existingImg = p.image;
      }
      finish(existingImg);
    }
  });
}

const resetDemo = document.getElementById("resetDemo");
if(resetDemo) {
  resetDemo.onclick = () => {
    if (confirm("Réinitialiser le catalogue ?")) {
      data = [...demo]; 
      save(); 
      render(); 
      updateStats(); 
      refreshAdminProducts(); 
      toast("Catalogue réinitialisé");
    }
  };
}

function toast(t) {
  let x = document.querySelector(".toast");
  if (!x) {
    x = document.createElement("div"); 
    x.className = "toast"; 
    document.body.appendChild(x);
  }
  x.textContent = t; 
  x.classList.add("show"); 
  setTimeout(() => x.classList.remove("show"), 2200);
}

render(); 
updateStats();

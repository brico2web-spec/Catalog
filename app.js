const KEY="3d_peintures_catalog_v3";
const categories=["PRODUITS","ESSENCE JUPITER","DILUANT","COLLE","PEINTURE"];
function canonicalCategory(value){
 const normalized=String(value||"").trim().toUpperCase();
 return categories.find(c=>c.toUpperCase()===normalized)||categories[0];
}
let products=JSON.parse(localStorage.getItem(KEY)||"[]");
let active=categories[0], selectedImage="", selectedProductId=null, viewerBoxQty=0;
let carouselIndex=0, carouselStartX=null, carouselStartY=null, carouselMoved=false;
let focusProductId=null;
let cart=JSON.parse(localStorage.getItem("3d_peintures_cart_v4")||"[]");
let orders=JSON.parse(localStorage.getItem("3d_peintures_orders_v1")||"[]");
const $=id=>document.getElementById(id);
products.forEach(p=>{if(p.costPrice==null)p.costPrice=0});

function save(){try{localStorage.setItem(KEY,JSON.stringify(products));return true}catch(err){console.error(err);toast(err&&err.name==="QuotaExceededError"?"Mémoire pleine : image trop grande.":"Impossible d'enregistrer le produit");return false}}
function makeId(){try{if(window.crypto&&typeof crypto.randomUUID==="function")return crypto.randomUUID()}catch(e){}return "p_"+Date.now().toString(36)+"_"+Math.random().toString(36).slice(2,10)}
function normalizeProductCode(value){return String(value||"").trim().toUpperCase().replace(/\s+/g,"")}
function productCode(p){return normalizeProductCode(p?.code||p?.productCode||"")}
function compressImage(file,maxSide=1000,quality=.78){return new Promise((resolve,reject)=>{const r=new FileReader();r.onerror=()=>reject(new Error("Lecture impossible"));r.onload=e=>{const img=new Image();img.onerror=()=>reject(new Error("Image invalide"));img.onload=()=>{const ow=img.naturalWidth||img.width,oh=img.naturalHeight||img.height,s=Math.min(1,maxSide/Math.max(ow,oh)),w=Math.max(1,Math.round(ow*s)),h=Math.max(1,Math.round(oh*s)),c=document.createElement("canvas");c.width=w;c.height=h;c.getContext("2d").drawImage(img,0,0,w,h);resolve(c.toDataURL("image/webp",quality))};img.src=e.target.result};r.readAsDataURL(file)})}
function saveCart(){localStorage.setItem("3d_peintures_cart_v4",JSON.stringify(cart));renderCart()}
function isAvailable(p){ return p && p.availability !== "unavailable"; }
function unavailableText(){ return "غير متوفر حاليا حالياً — هاد المنتوج غير متوفر حالياً"; }
function hasPromo10Plus1(p){ return !!(p && (p.promo10Plus1===true || p.promo10Plus1==="true")); }
function promoForBoxes(p, boxes){
 const paidBoxes=Math.max(0,Math.floor(Number(boxes)||0));
 const unitsPerBox=Math.max(0,Math.floor(Number(p?.qty)||0));
 const paidUnits=paidBoxes*unitsPerBox;
 const freeUnits=hasPromo10Plus1(p)?Math.floor(paidUnits/10):0;
 return {enabled:hasPromo10Plus1(p),paidBoxes,unitsPerBox,paidUnits,freeUnits,deliveredUnits:paidUnits+freeUnits};
}
function promoLabel(p, boxes){
 const info=promoForBoxes(p,boxes);
 return info.enabled?`10 + 1 Gratuit · +${info.freeUnits} pièce(s) offerte(s) dès ${info.paidUnits} pièce(s)`:"";
}

function compressDataUrl(data,maxSide=900,quality=.68){
 return new Promise((resolve,reject)=>{
  const img=new Image(); img.onerror=()=>reject(new Error("Image invalide"));
  img.onload=()=>{const ow=img.naturalWidth||img.width,oh=img.naturalHeight||img.height,s=Math.min(1,maxSide/Math.max(ow,oh)),w=Math.max(1,Math.round(ow*s)),h=Math.max(1,Math.round(oh*s)),c=document.createElement("canvas");c.width=w;c.height=h;c.getContext("2d").drawImage(img,0,0,w,h);resolve(c.toDataURL("image/webp",quality))};
  img.src=data;
 });
}
async function compactProductsImages(){
 for(const p of products){
  if(typeof p.image==="string" && p.image.length>180000){
   try{p.image=await compressDataUrl(p.image)}catch(e){}
  }
 }
}
function addToCart(id, boxes=1){
 const p=products.find(x=>x.id===id); if(!p)return;
 boxes=Math.max(1,Number(boxes)||1);
 if(!isAvailable(p)){toast(unavailableText());return}
 const row=cart.find(x=>x.id===id);
 if(row) row.qty+=boxes;
 else cart.push({id:p.id,qty:boxes});
 saveCart(); toast("Produit ajouté au panier");
}
function cartCount(){return cart.reduce((s,x)=>s+x.qty,0)}
function renderCart(){
 cart=cart.filter(row=>{const p=products.find(x=>x.id===row.id);return p && isAvailable(p);});
 localStorage.setItem("3d_peintures_cart_v4",JSON.stringify(cart));
 $("cartCount").textContent=cartCount();
 const box=$("cartItems"), empty=$("cartEmpty");
 if(!cart.length){box.innerHTML="";empty.style.display="block";$("cartTotal").textContent="0,00 DH";return}
 empty.style.display="none";
 let total=0;
 box.innerHTML=cart.map(row=>{
   const p=products.find(x=>x.id===row.id); if(!p || !isAvailable(p))return "";
   const info=promoForBoxes(p,row.qty);
   const line=Number(p.price||0)*info.paidUnits; total+=line;
   const promoNote=info.enabled
     ? `<span class="cart-promo-note">🎁 10 + 1 Gratuit · +${info.freeUnits} pièce(s) offerte(s)</span><span class="cart-delivery-note">📦 Livré : ${info.deliveredUnits} pièce(s)</span>`
     : "";
   return `<div class="cart-row">
     ${p.image?`<img src="${p.image}" alt="">`:`<div></div>`}
     <div><h4>${esc(p.name)}</h4><small>${money(p.price)} DH / unité · ${p.qty} unités / boîte</small>${promoNote}
       <div class="cart-qty"><button data-minus="${p.id}">−</button><span>${row.qty} boîte${row.qty!==1?"s":""}</span><button data-plus="${p.id}">+</button></div>
     </div><strong>${money(line)} DH</strong>
   </div>`;
 }).join("");
 $("cartTotal").textContent=`${money(total)} DH`;
 document.querySelectorAll("[data-plus]").forEach(b=>b.onclick=()=>changeCart(b.dataset.plus,1));
 document.querySelectorAll("[data-minus]").forEach(b=>b.onclick=()=>changeCart(b.dataset.minus,-1));
}
function changeCart(id,d){
 const row=cart.find(x=>x.id===id); if(!row)return;
 row.qty+=d;if(row.qty<=0)cart=cart.filter(x=>x.id!==id);
 saveCart();
}
function openCart(){$("cartDrawer").classList.add("show");$("cartOverlay").classList.add("show");renderCart()}
function closeCart(){$("cartDrawer").classList.remove("show");$("cartOverlay").classList.remove("show")}
function buildOrderMessage(){
 const now=new Date();
 const date=now.toLocaleDateString("fr-FR",{day:"2-digit",month:"2-digit",year:"numeric"});
 const time=now.toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"});
 let total=0;
 const lines=[
   "🛍️ COMMANDE — 3D PEINTURES",
   `📅 Date : ${date} à ${time}`,
   "",
   "━━━━━━━━━━━━━━━━━━━━",
   "📦 PRODUITS",
   "━━━━━━━━━━━━━━━━━━━━",
   ""
 ];

 cart.forEach((row,i)=>{
   const p=products.find(x=>x.id===row.id); if(!p)return;
   const boxes=Number(row.qty)||1;
   const info=promoForBoxes(p,boxes);
   const units=info.unitsPerBox||1;
   const unit=Number(p.price)||0;
   const line=unit*info.paidUnits;
   total+=line;

   lines.push(`🔹 PRODUIT ${i+1}`);
   lines.push(`🧴 ${p.name}`);
   lines.push(`📦 ${boxes} boîte(s) × ${info.paidUnits} pièces payées`);
   if(info.enabled) lines.push(`🎁 Offre 10 + 1 : +${info.freeUnits} pièce(s) gratuite(s) — total livré ${info.deliveredUnits} pièces`);
   lines.push(`💵 ${money(unit)} DH / unité`);
   lines.push(`💰 Sous-total : ${money(line)} DH`);
   lines.push("");
   if(i < cart.length-1){
     lines.push("────────────────────");
     lines.push("");
   }
 });

 lines.push("━━━━━━━━━━━━━━━━━━━━");
 lines.push(`💰 TOTAL : ${money(total)} DH`);
 lines.push("━━━━━━━━━━━━━━━━━━━━");
 return lines.join("\n");
}
async function sendCartOrder(){
 if(!cart.length){toast("السلة فارغة");return}
 const message=buildOrderMessage();
 const encoded=encodeURIComponent(message);
 // على Android يفتح WhatsApp مباشرة؛ وإذا لم يكن متاحاً يمكن استعمال المشاركة العادية.
 const wa=`https://wa.me/?text=${encoded}`;
 try{
   if(navigator.share){
     await navigator.share({title:"Commande 3D PEINTURES",text:message});
     return;
   }
 }catch(e){}
 window.open(wa,"_blank");
}
function esc(v){return String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
function money(v){return Number(v||0).toLocaleString("fr-FR",{minimumFractionDigits:2,maximumFractionDigits:2})}
function toast(t){const x=$("toast");x.textContent=t;x.classList.add("show");setTimeout(()=>x.classList.remove("show"),1800)}

function carouselCards(){return Array.from(document.querySelectorAll("#grid .flip-card"))}
function renderCarouselDots(total){
 const box=$("carouselDots"); if(!box)return;
 box.innerHTML=Array.from({length:total},(_,i)=>`<button type="button" class="carousel-dot ${i===carouselIndex?"active":""}" data-carousel-dot="${i}" aria-label="المنتوج ${i+1}"></button>`).join("");
 box.querySelectorAll("[data-carousel-dot]").forEach(dot=>dot.onclick=e=>{e.stopPropagation();carouselIndex=Number(dot.dataset.carouselDot)||0;renderCarouselPositions()});
}
function renderCarouselPositions(){
 const cards=carouselCards(), total=cards.length;
 if(!total){if($("carouselDots"))$("carouselDots").innerHTML="";return}
 carouselIndex=((carouselIndex%total)+total)%total;
 const stageWidth=$("carouselStage")?.clientWidth||window.innerWidth;
 const gap=Math.min(340,Math.max(150,stageWidth*.72));
 cards.forEach((card,index)=>{
   let relative=index-carouselIndex;
   if(relative>total/2)relative-=total;
   if(relative<-total/2)relative+=total;
   const distance=Math.abs(relative);
   const visible=distance<=1;
   const scale=relative===0?1:.84;
   const x=relative*gap;
   const tilt=relative===0?0:(relative>0?-18:18);
   card.style.setProperty("--card-x",`${x}px`);
   card.style.setProperty("--card-tilt",`${tilt}deg`);
   card.style.setProperty("--card-scale",scale.toFixed(3));
   card.style.zIndex=String(relative===0?30:20-distance);
   card.style.opacity=visible?(relative===0?1:.72):0;
   card.style.pointerEvents=visible?"auto":"none";
   card.dataset.carouselRelative=String(relative);
   card.classList.toggle("is-center",relative===0);
   card.setAttribute("aria-hidden",relative===0?"false":"true");
 });
 renderCarouselDots(total);
}
function moveCarousel(direction){
 const cards=carouselCards(); if(!cards.length)return;
 carouselIndex=(carouselIndex+direction+cards.length)%cards.length;
 cards.forEach(c=>c.classList.remove("is-flipped"));
 const center=cards[carouselIndex]; if(center){selectedProductId=center.dataset.id;cards.forEach(c=>c.classList.toggle("selected",c===center))}
 renderCarouselPositions();
}
function initProductCarousel(){
 $("carouselPrev")?.addEventListener("click",()=>moveCarousel(-1));
 $("carouselNext")?.addEventListener("click",()=>moveCarousel(1));
 const stage=$("carouselStage"); if(!stage)return;
 stage.addEventListener("pointerdown",e=>{
   if(e.target.closest("button,input,label"))return;
   carouselStartX=e.clientX;carouselStartY=e.clientY;carouselMoved=false;
 });
 stage.addEventListener("pointerup",e=>{
   if(carouselStartX===null)return;
   const dx=e.clientX-carouselStartX,dy=e.clientY-carouselStartY;
   if(Math.abs(dx)>38&&Math.abs(dx)>Math.abs(dy)){moveCarousel(dx<0?1:-1);carouselMoved=true;setTimeout(()=>carouselMoved=false,180)}
   carouselStartX=null;carouselStartY=null;
 });
 stage.addEventListener("pointercancel",()=>{carouselStartX=null;carouselStartY=null});
 window.addEventListener("resize",()=>renderCarouselPositions());
}

function updateFocusCalculation(){
 const p=products.find(x=>x.id===focusProductId); if(!p)return;
 const boxes=Math.max(1,Math.min(999,Math.floor(Number($("focusQty")?.value)||1)));
 const info=promoForBoxes(p,boxes);
 $("focusQty").value=String(boxes);
 $("focusBoxesTotal").textContent=String(info.paidBoxes);
 $("focusUnitsTotal").textContent=String(info.paidUnits);
 $("focusTotalPrice").textContent=money(Number(p.price||0)*info.paidUnits);
}
function setFocusQty(value){
 const next=Math.max(1,Math.min(999,Math.floor(Number(value)||1)));
 $("focusQty").value=String(next); updateFocusCalculation();
}
function openProductFocus(id){
 const p=products.find(x=>x.id===id); if(!p)return;
 focusProductId=id; selectedProductId=id;
 const available=isAvailable(p);
 $("focusImage").src=p.image||""; $("focusImage").alt=p.name||"";
 $("focusCategory").textContent=p.category||"PRODUIT";
 $("focusName").textContent=p.name||"Produit";
 $("focusCode").textContent=productCode(p)?`Code produit : ${productCode(p)}`:"";
 $("focusPrice").textContent=`${money(p.price)} DH / unité`;
 const availability=$("focusAvailability"); availability.textContent=available?"● DISPONIBLE":"● NON DISPONIBLE"; availability.classList.toggle("unavailable",!available);
 $("focusPromo").style.display=hasPromo10Plus1(p)?"block":"none";
 $("focusBackCode").textContent=`${productCode(p)||"—"} · ${p.category||"PRODUIT"}`;
 $("focusBackName").textContent=p.name||"Produit";
 $("focusDescription").textContent=p.description||"Produit disponible";
 $("focusBackPrice").textContent=`${money(p.price)} DH`;
 $("focusBackQty").textContent=String(Number(p.qty)||0);
 $("focusPromoNote").textContent=hasPromo10Plus1(p)?"🎁 Offre 10 + 1 : une pièce offerte dès 10 pièces payées":"";
 $("focusPromoNote").style.display=hasPromo10Plus1(p)?"block":"none";
 $("focusQty").value=1;
 updateFocusCalculation();
 $("focusCard").classList.toggle("is-unavailable",!available);
 $("focusCard").classList.remove("is-flipped");
 $("productFocus").classList.add("show"); $("productFocus").setAttribute("aria-hidden","false"); document.body.classList.add("focus-active");
}
function closeProductFocus(){
 $("productFocus").classList.remove("show"); $("productFocus").setAttribute("aria-hidden","true"); $("focusCard").classList.remove("is-flipped"); document.body.classList.remove("focus-active"); focusProductId=null;
}
function toggleFocusFlip(){if(focusProductId&&$("focusCard").classList.contains("is-unavailable"))return;$("focusCard").classList.toggle("is-flipped")}
function initProductFocus(){
 $("focusFlipHandle").onclick=e=>{e.stopPropagation();toggleFocusFlip()};
 $("focusBackButton").onclick=e=>{e.stopPropagation();$("focusCard").classList.remove("is-flipped")};
 $("closeProductFocus").onclick=closeProductFocus;
 $("productFocus").onclick=e=>{if(e.target===$("productFocus"))closeProductFocus()};
 $("focusAdd").onclick=e=>{e.stopPropagation();const qty=Math.max(1,Number($("focusQty").value)||1);if(focusProductId){addToCart(focusProductId,qty);closeProductFocus()}};
 $("focusQtyMinus").onclick=e=>{e.stopPropagation();setFocusQty(Number($("focusQty").value||1)-1)};
 $("focusQtyPlus").onclick=e=>{e.stopPropagation();setFocusQty(Number($("focusQty").value||1)+1)};
 $("focusQty").oninput=()=>{const clean=String($("focusQty").value||"").replace(/\D/g,"").slice(0,3);$("focusQty").value=clean;if(clean)updateFocusCalculation()};
 document.addEventListener("keydown",e=>{if(e.key==="Escape"&&$("productFocus").classList.contains("show"))closeProductFocus()});
}

function render(){
 $("categories").innerHTML=categories.map(c=>`<button class="cat ${active===c?"active":""}" data-cat="${esc(c)}">${esc(c)}</button>`).join("");
 document.querySelectorAll(".cat").forEach(b=>b.onclick=()=>{active=b.dataset.cat;selectedProductId=null;render()});
 $("sectionTitle").textContent=active;
  const q=String($("productSearch")?.value||"").trim().toLowerCase();
  const list=products.filter(p=>{
    const pCat = String(p.category||"").trim().toUpperCase();
    const activeCat = String(active||"").trim().toUpperCase();
    if(q){
      const code=productCode(p).toLowerCase();
      return code.includes(q)||String(p.name||"").toLowerCase().includes(q);
    }
    return pCat === activeCat;
  });
  $("sectionTitle").textContent=q?`Recherche : ${q}`:active;
  $("count").textContent=`${list.length} produit${list.length!==1?"s":""}`;
  $("grid").innerHTML=list.map(card).join("");
  $("empty").style.display=list.length?"none":"block";
  $("catalogCarousel").style.display=list.length?"":"none";
  if(list.length && carouselIndex>=list.length)carouselIndex=0;
  const selectCard=(cardEl)=>{
    document.querySelectorAll(".card.selected").forEach(other=>{ if(other!==cardEl) other.classList.remove("selected"); });
    cardEl.classList.add("selected");
    selectedProductId=cardEl.dataset.id;
  };
  document.querySelectorAll(".flip-card").forEach(cardEl=>{
    cardEl.onclick=e=>{
      if(carouselMoved||e.target.closest("button,input,label"))return;
      const relative=Number(cardEl.dataset.carouselRelative||0);
      if(relative!==0){moveCarousel(relative>0?1:-1);return;}
      selectCard(cardEl);
      openProductFocus(cardEl.dataset.id);
    };
  });
  document.querySelectorAll("[data-flip-add]").forEach(button=>button.onclick=e=>{
    e.preventDefault();e.stopPropagation();
    const cardEl=button.closest(".flip-card");
    const input=cardEl?.querySelector("[data-flip-qty]");
    const boxes=Math.max(1,Number(input?.value)||1);
    addToCart(button.dataset.flipAdd,boxes);
    if(cardEl)cardEl.classList.remove("is-flipped");
  });
  document.querySelectorAll("[data-flip-back]").forEach(button=>button.onclick=e=>{e.preventDefault();e.stopPropagation();button.closest(".flip-card")?.classList.remove("is-flipped")});
  document.querySelectorAll("[data-flip-qty]").forEach(input=>input.oninput=()=>{input.value=String(input.value||"").replace(/\D/g,"").slice(0,3)});
  renderCarouselPositions();
 }

function card(p){
 const low=Number(p.qty)<=5, available=isAvailable(p), code=productCode(p)||"—";
 return `<article class="card flip-card ${selectedProductId===p.id?"selected":""}" data-id="${esc(p.id)}">
  <div class="flip-card-inner">
   <div class="flip-face flip-front">
    <div class="photo ${available?"":"is-unavailable"}">
     ${p.image?`<img src="${p.image}" alt="${esc(p.name)}" loading="lazy" decoding="async">`:`<div class="no-photo">🎨</div>`}
     <span class="badge">${esc(p.category)}</span>
     ${hasPromo10Plus1(p)?`<span class="promo-badge">10 + 1<small>GRATUIT</small></span>`:""}
     ${hasPromo10Plus1(p)?`<div class="card-promo-note">🎁 1 pièce offerte / 10</div>`:""}
     ${available?"":`<div class="unavailable-card-overlay"><span>غير متوفر حاليا</span></div>`}
    </div>
    <div class="card-body">
     <div class="flip-front-kicker">3D PEINTURES · PRODUIT</div>
     <h3>${esc(p.name)}</h3>
     <div class="product-code-line">Code : <b>${esc(code)}</b></div>
     <div class="price">${money(p.price)} <small>DH / unité</small></div>
     <div class="flip-tap-hint">↻ اضغط لقلب البطاقة</div>
    </div>
   </div>
   <div class="flip-face flip-back">
    <div class="flip-back-top"><span>INFORMATIONS PRODUIT</span><button type="button" data-flip-back aria-label="العودة إلى صورة المنتج">↩</button></div>
    <h3>${esc(p.name)}</h3>
    <div class="flip-back-code">${esc(code)} · ${esc(p.category)}</div>
    <p class="flip-back-description">${esc(p.description||"Produit disponible")}</p>
    <div class="flip-specs">
      <div><span>PRIX / UNITÉ</span><strong>${money(p.price)} DH</strong></div>
      <div><span>UNITÉS / BOÎTE</span><strong>${Number(p.qty)||0}</strong></div>
    </div>
    ${hasPromo10Plus1(p)?`<div class="flip-promo">🎁 Offre 10 + 1 : une pièce offerte dès 10 pièces payées</div>`:""}
    ${available?`<label class="flip-qty">NOMBRE DE BOÎTES<input type="number" min="1" max="999" value="1" inputmode="numeric" data-flip-qty></label><button type="button" class="add-cart flip-add" data-flip-add="${esc(p.id)}"><span>🛒</span> Envoyer au panier</button>`:`<div class="flip-unavailable">غير متوفر حاليا</div>`}
    <small class="flip-back-footer">اضغط على البطاقة للعودة إلى الصورة</small>
   </div>
  </div>
 </article>`;
}

/* Menu administration — accès direct, sans code PIN */
$("menuBtn").onclick=e=>{e.stopPropagation();$("actionMenu").classList.toggle("show")};
document.addEventListener("click",e=>{if(!$("actionMenu").contains(e.target)&&e.target!==$("menuBtn"))$("actionMenu").classList.remove("show")});
$("menuAdd").onclick=()=>{$("actionMenu").classList.remove("show");openForm()};
$("menuEdit").onclick=()=>{
 $("actionMenu").classList.remove("show");
 if(!selectedProductId)return toast("Sélectionnez d'abord un produit");
 const p=products.find(x=>x.id===selectedProductId);if(p)openForm(p);
};
$("menuDelete").onclick=()=>{
 $("actionMenu").classList.remove("show");
 if(!selectedProductId)return toast("Sélectionnez d'abord un produit");
 const p=products.find(x=>x.id===selectedProductId);
 if(p&&confirm(`Supprimer "${p.name}" ?`)){products=products.filter(x=>x.id!==selectedProductId);selectedProductId=null;save();render();toast("Produit supprimé")}
};
$("menuOrders").onclick=()=>{$("actionMenu").classList.remove("show");openOrdersModal()};
$("menuClients").onclick=()=>{$("actionMenu").classList.remove("show");openClientModal()};
$("menuImportClients").onclick=()=>{$("actionMenu").classList.remove("show");$("clientsExcelInput").click()};
$("menuExportProductsJson").onclick=()=>{$("actionMenu").classList.remove("show");exportProductsJson()};
$("menuImportProductsJson").onclick=()=>{$("actionMenu").classList.remove("show");const input=$("productsJsonInput");if(input){input.value="";input.click()}};
$("menuImportAllExcel").onclick=()=>{$("actionMenu").classList.remove("show");openArchiveRestorePicker()};
$("allExcelRestoreInput").onchange=e=>importFullArchiveExcel(e.target.files[0]);
$("menuDashboard").onclick=()=>openDashboard();
$("exportOrdersArchiveExcel").onclick=exportOrdersArchiveExcel;
$("restoreOrdersArchiveExcel").onclick=openArchiveRestorePicker;
$("exportDashboardExcel").onclick=exportDashboardExcel;
$("restoreDashboardExcel").onclick=openArchiveRestorePicker;
$("exportClientsArchiveExcel").onclick=exportClientsArchiveExcel;
$("restoreClientsArchiveExcel").onclick=openArchiveRestorePicker;

/* Sauvegarde complète : produits + photos + codes + promotions + clients + commandes + panier */
function backupProductSnapshot(p,index){
 const code=productCode(p);
 return {
   id:String(p?.id||`p_restore_${Date.now().toString(36)}_${index}`),
   name:String(p?.name||"Produit").trim(),
   code,
   price:Number(p?.price)||0,
   costPrice:Number(p?.costPrice)||0,
   qty:Number(p?.qty)||0,
   category:canonicalCategory(p?.category),
   availability:p?.availability==="unavailable"?"unavailable":"available",
   description:String(p?.description||"").trim(),
   image:typeof p?.image==="string"?p.image:"",
   promo10Plus1:hasPromo10Plus1(p)
 };
}
function exportBackup(){
 const backup={
   format:"3D_PEINTURES_CATALOG_BACKUP",
   version:2,
   createdAt:new Date().toISOString(),
   activeCategory:active,
   products:products.map(backupProductSnapshot),
   cart:Array.isArray(cart)?cart:[],
   orders:Array.isArray(orders)?orders:[],
   clients:Array.isArray(clients)?clients:[]
 };
 const blob=new Blob([JSON.stringify(backup)],{type:"application/json;charset=utf-8"});
 const url=URL.createObjectURL(blob);
 const a=document.createElement("a");
 const d=new Date();
 const pad=n=>String(n).padStart(2,"0");
 a.href=url;
 a.download=`3D_PEINTURES_SAUVEGARDE_${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}.3dbackup`;
 document.body.appendChild(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),3000);
 toast(`Sauvegarde téléchargée : ${products.length} produit(s) avec photos`);
 }

function exportProductsJson(){
 const payload={format:"3D_PEINTURES_PRODUCTS_BACKUP",version:1,createdAt:new Date().toISOString(),activeCategory:active,products:(Array.isArray(products)?products:[]).map(backupProductSnapshot)};
 const blob=new Blob([JSON.stringify(payload)],{type:"application/json;charset=utf-8"});
 const url=URL.createObjectURL(blob);const a=document.createElement("a");const d=new Date();const pad=n=>String(n).padStart(2,"0");
 a.href=url;a.download=`3D_PEINTURES_PRODUITS_${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}.json`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),3000);
 toast(`تم تحميل ${products.length} منتوج(ات) مع الصور`);
}

function excelSheet(rows, widths){
 const data=rows&&rows.length?rows:[{"ملاحظة":"لا توجد بيانات"}];
 const ws=XLSX.utils.json_to_sheet(data);
 if(widths)ws["!cols"]=widths.map(w=>({wch:w}));
 const ref=XLSX.utils.encode_range({s:{r:0,c:0},e:{r:Math.max(0,data.length),c:Math.max(0,(widths?.length||Object.keys(data[0]||{}).length)-1)}});
 ws["!autofilter"]={ref};
 ws["!freeze"]={xSplit:0,ySplit:1,topLeftCell:"A2",activePane:"bottomLeft",state:"frozen"};
 return ws;
}
function exportFullArchiveExcel(){
 try{
  if(typeof XLSX==="undefined")throw new Error("Excel library not loaded");
  const wb=XLSX.utils.book_new();
  const safeWrap=(fn,fallback=[])=>{try{return fn()}catch(e){console.warn("Excel sheet error",e);return fallback}};
  
  const productRows=safeWrap(()=>products.map((p,i)=>{const row=backupProductSnapshot(p,i);return {"المعرف":row.id,"كود المنتج":row.code,"اسم المنتج":row.name,"القسم":row.category,"الثمن (DH)":row.price,"ثمن التكلفة (DH)":row.costPrice,"الوحدات في العلبة":row.qty,"التوفر":row.availability==="unavailable"?"غير متوفر":"متوفر","عرض 10+1":row.promo10Plus1?"نعم":"لا","الوصف":row.description,"الصورة (Data URL)":row.image};}));
  const clientRows=safeWrap(()=>clients.map(c=>({"المعرف":c.id||"","اسم الزبون":c.name||"","الهاتف":c.phone||"","الشركة":c.company||c.societe||"","المدينة":c.city||"","العنوان":c.address||"","ICE":c.ice||"","صاحب الشيك/الكمبيالة":c.paymentHolder||c.paymentName||c.chequeName||"","رقم الشيك/الكمبيالة":c.paymentNumber||c.chequeNumber||"","نوع الأداء":paymentTypeLabel(c.paymentType),"تاريخ الإضافة":c.importedAt||c.createdAt||""})));
  const orderRows=safeWrap(()=>orders.map(o=>{ensureOrderDeadline(o);const state=recalculateOrderPaymentState(o);const deadline=deadlineState(o);return {"المعرف":o.id||"","التاريخ":o.date||"","الزبون":o.client||"","الشركة":o.company||"","ICE":o.ice||"","الهاتف":o.phone||"","الإجمالي (DH)":Number(o.total)||0,"المخلص (DH)":Number(state.paid)||0,"الباقي (DH)":Number(state.due)||0,"الحالة":o.status||"unpaid","مدة الأداء (يوم)":deadline.term,"وضع الأجل":deadline.termKey==="cod"?"إستخلاص عند الإستلام / Paiement à la livraison":(deadline.termKey==="test_1m"?"تجربة دقيقة":"أيام"),"مدة الأداء (دقيقة)":deadline.termKey==="test_1m"?(Number(o.paymentTermMinutes)||1):"","تاريخ الاستحقاق":o.dueDate||"","صاحب الشيك/الكمبيالة":o.paymentHolder||o.paymentName||"","رقم الشيك/الكمبيالة":o.paymentNumber||"","نوع الأداء":paymentTypeLabel(o.paymentType),"الملاحظة":o.note||"","عدد العناصر":Array.isArray(o.items)?o.items.length:0};}));
  
  const paymentRows=[];
  safeWrap(()=>{orders.forEach(o=>{ensureOrderDeadline(o);getPaymentHistory(o).forEach((p,index)=>paymentRows.push({"معرف القسط":p.id||`payment_${index+1}`,"معرف الكوموند":o.id||"","الزبون":o.client||"","رقم القسط":index+1,"مبلغ القسط (DH)":Number(p.amount)||0,"تاريخ وتوقيت الأداء":p.date||"","نوع الأداء":paymentTypeLabel(p.type||o.paymentType),"صاحب الشيك/الكمبيالة":p.holder||o.paymentHolder||"","رقم الشيك/الكمبيالة":p.number||o.paymentNumber||"","مدة الكوموند (يوم)":Number(o.paymentTermDays)||15,"تاريخ الاستحقاق":o.dueDate||""}));});});
  
  const itemRows=[];
  safeWrap(()=>{orders.forEach(o=>(Array.isArray(o.items)?o.items:[]).forEach((item,index)=>itemRows.push({"معرف الكوموند":o.id||"","رقم السطر":index+1,"معرف المنتج":item.id||"","كود المنتج":item.code||"","اسم المنتج":item.name||"","عدد العلب":Number(item.boxes??item.qty)||0,"عدد الوحدات":Number(item.units)||0,"الوحدات المجانية":Number(item.freeUnits)||0,"ثمن الوحدة (DH)":Number(item.unitPrice??item.price)||0,"المجموع (DH)":Number(item.lineTotal??item.total)||0,"بيانات السطر":JSON.stringify(item)})));});
  
  const cartRows=safeWrap(()=>(Array.isArray(cart)?cart:[]).map((item,index)=>({"رقم السطر":index+1,"معرف المنتج":item.id||"","عدد العلب":Number(item.qty)||0})));
  
  const summaryRows=[{"المعلومة":"نوع الملف","القيمة":"3D_PEINTURES_FULL_ARCHIVE"},{"المعلومة":"الإصدار","القيمة":4},{"المعلومة":"تاريخ التصدير","القيمة":new Date().toISOString()},{"المعلومة":"القسم النشط","القيمة":active||""},{"المعلومة":"عدد المنتجات","القيمة":products.length},{"المعلومة":"عدد الزبناء","القيمة":clients.length},{"المعلومة":"عدد الكوموندات","القيمة":orders.length},{"المعلومة":"عدد الأقساط","القيمة":paymentRows.length},{"المعلومة":"الصور محفوظة داخل ورقة المنتجات","القيمة":"نعم — Data URL"}];
  
  XLSX.utils.book_append_sheet(wb,excelSheet(summaryRows,[34,60]),"ملخص");
  XLSX.utils.book_append_sheet(wb,excelSheet(productRows,[24,18,28,18,14,18,16,16,12,36,64]),"Products");
  XLSX.utils.book_append_sheet(wb,excelSheet(clientRows,[24,24,18,24,18,30,20,28,24,24,24]),"Clients");
  XLSX.utils.book_append_sheet(wb,excelSheet(orderRows,[28,24,24,24,18,18,16,16,16,14,18,24,28,24,22,40,14]),"Orders");
  XLSX.utils.book_append_sheet(wb,excelSheet(paymentRows,[28,28,24,12,18,26,24,28,24,18,24]),"Installments");
  XLSX.utils.book_append_sheet(wb,excelSheet(itemRows,[28,12,28,18,28,14,14,16,18,16,60]),"Order Items");
  XLSX.utils.book_append_sheet(wb,excelSheet(cartRows,[12,28,14]),"Cart");
  
  const d=new Date(),pad=n=>String(n).padStart(2,"0");
  XLSX.writeFile(wb,`3D_PEINTURES_ARCHIVE_COMPLET_${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}.xlsx`);
  toast(`تم تحميل الأرشيف الكامل: ${products.length} منتوج · ${orders.length} كوموند`);
 }catch(err){console.error("Critical Excel Error",err);toast("خطأ تقني أثناء إنشاء ملف Excel. يرجى مراجعة البيانات.");}
}

function exportOrdersAndAccountsExcel(){
 try{
  if(typeof XLSX==="undefined")throw new Error("Excel library not loaded");
  const safeCell=(value,max=32000)=>String(value??"").replace(/[\\u0000-\\u0008\\u000B\\u000C\\u000E-\\u001F]/g,"").slice(0,max);
  const safeNumber=value=>{const n=Number(value);return Number.isFinite(n)?n:0};
  const safeDate=value=>{const d=new Date(value);return Number.isNaN(d.getTime())?"":d.toISOString()};
  const orderRows=[],paymentRows=[],itemRows=[],errors=[];
  const accountMap=new Map();
  const accountFor=(name,client={})=>{
   const cleanName=safeCell(name||client.name||"بدون اسم عميل");
   const key=cleanName.trim().toLowerCase()||"__unknown__";
   if(!accountMap.has(key))accountMap.set(key,{name:cleanName||"بدون اسم عميل",company:safeCell(client.company||client.societe||""),ice:safeCell(client.ice||""),phone:safeCell(client.phone||""),orders:0,sales:0,paid:0,due:0,overdue:0,lastOrder:""});
   return accountMap.get(key);
  };
  (Array.isArray(clients)?clients:[]).forEach(c=>accountFor(c.name,c));
  (Array.isArray(orders)?orders:[]).forEach((o,orderIndex)=>{
   try{
    ensureOrderDeadline(o);
    const state=recalculateOrderPaymentState(o), deadline=deadlineState(o), clientObj=(Array.isArray(clients)?clients:[]).find(c=>String(c.name||"").trim().toLowerCase()===String(o.client||"").trim().toLowerCase())||{};
    const account=accountFor(o.client,clientObj), total=safeNumber(o.total), due=safeNumber(state.due), paid=safeNumber(state.paid), date=safeDate(o.date);
    account.orders+=1;account.sales+=total;account.paid+=paid;account.due+=due;if(deadline.overdue&&due>0)account.overdue+=due;if(date&&(!account.lastOrder||date>account.lastOrder))account.lastOrder=date;
    orderRows.push({"معرف الكوموند":safeCell(o.id),"التاريخ":date,"الزبون":safeCell(o.client),"الشركة":safeCell(o.company||clientObj.company||clientObj.societe),"ICE":safeCell(o.ice||clientObj.ice),"الهاتف":safeCell(o.phone||clientObj.phone),"الإجمالي (DH)":total,"المخلص (DH)":paid,"الباقي (DH)":due,"الحالة":safeCell(o.status||"unpaid"),"مدة الأداء (يوم)":deadline.term,"وضع الأجل":deadline.termKey==="cod"?"إستخلاص عند الإستلام / Paiement à la livraison":(deadline.termKey==="test_1m"?"تجربة دقيقة":"أيام"),"مدة الأداء (دقيقة)":deadline.termKey==="test_1m"?(Number(o.paymentTermMinutes)||1):"","تاريخ الاستحقاق":safeDate(o.dueDate),"متأخر؟":deadline.overdue&&due>0?"نعم":"لا","نوع الأداء":safeCell(paymentTypeLabel(o.paymentType)),"رقم الشيك/الكمبيالة":safeCell(o.paymentNumber),"الملاحظة":safeCell(o.note)});
    getPaymentHistory(o).forEach((p,paymentIndex)=>paymentRows.push({"معرف القسط":safeCell(p.id||`payment_${orderIndex+1}_${paymentIndex+1}`),"معرف الكوموند":safeCell(o.id),"الزبون":safeCell(o.client),"رقم القسط":paymentIndex+1,"مبلغ القسط (DH)":safeNumber(p.amount),"تاريخ وتوقيت الأداء":safeDate(p.date),"نوع الأداء":safeCell(paymentTypeLabel(p.type||o.paymentType)),"صاحب الشيك/الكمبيالة":safeCell(p.holder||o.paymentHolder),"رقم الشيك/الكمبيالة":safeCell(p.number||o.paymentNumber)}));
    (Array.isArray(o.items)?o.items:[]).forEach((item,itemIndex)=>itemRows.push({"معرف الكوموند":safeCell(o.id),"رقم السطر":itemIndex+1,"معرف المنتج":safeCell(item.id),"كود المنتج":safeCell(item.code),"اسم المنتج":safeCell(item.name),"عدد العلب":safeNumber(item.boxes??item.qty),"عدد الوحدات":safeNumber(item.units),"الوحدات المجانية":safeNumber(item.freeUnits),"ثمن الوحدة (DH)":safeNumber(item.unitPrice??item.price),"المجموع (DH)":safeNumber(item.lineTotal??item.total)}));
   }catch(error){console.warn("Order skipped during light export",orderIndex,error);errors.push(`الكوموند ${orderIndex+1}`)}
  });
  const accountRows=[...accountMap.values()].map(a=>({"الزبون":a.name,"الشركة":a.company,"ICE":a.ice,"الهاتف":a.phone,"عدد الكوموندات":a.orders,"إجمالي المبيعات (DH)":Number(a.sales.toFixed(2)),"إجمالي المخلص (DH)":Number(a.paid.toFixed(2)),"مجموع الباقي (DH)":Number(a.due.toFixed(2)),"المتأخر عن الأجل (DH)":Number(a.overdue.toFixed(2)),"آخر كوموند":a.lastOrder})).sort((a,b)=>b["مجموع الباقي (DH)"]-a["مجموع الباقي (DH)"]);
  const totalSales=orderRows.reduce((sum,r)=>sum+safeNumber(r["الإجمالي (DH)"]),0),totalPaid=orderRows.reduce((sum,r)=>sum+safeNumber(r["المخلص (DH)"]),0),totalDue=orderRows.reduce((sum,r)=>sum+safeNumber(r["الباقي (DH)"]),0),totalOverdue=accountRows.reduce((sum,r)=>sum+safeNumber(r["المتأخر عن الأجل (DH)"]),0);
  const summaryRows=[{"المعلومة":"نوع الملف","القيمة":"3D_PEINTURES_ORDERS_ACCOUNTS"},{"المعلومة":"تاريخ التصدير","القيمة":new Date().toISOString()},{"المعلومة":"عدد الكوموندات","القيمة":orderRows.length},{"المعلومة":"عدد الحسابات","القيمة":accountRows.length},{"المعلومة":"عدد الأقساط","القيمة":paymentRows.length},{"المعلومة":"إجمالي المبيعات (DH)","القيمة":Number(totalSales.toFixed(2))},{"المعلومة":"إجمالي المخلص (DH)","القيمة":Number(totalPaid.toFixed(2))},{"المعلومة":"مجموع الباقي (DH)","القيمة":Number(totalDue.toFixed(2))},{"المعلومة":"المتأخر عن الأجل (DH)","القيمة":Number(totalOverdue.toFixed(2))},{"المعلومة":"تنبيه","القيمة":errors.length?`تم تجاوز ${errors.length} سجل غير صالح`:"تم تصدير جميع السجلات"}];
  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,excelSheet(summaryRows,[34,62]),"الملخص");
  XLSX.utils.book_append_sheet(wb,excelSheet(orderRows,[28,24,24,24,18,18,16,16,16,14,18,24,12,24,24,42]),"الكوموندات");
  XLSX.utils.book_append_sheet(wb,excelSheet(accountRows,[24,24,18,18,16,20,20,18,22,24]),"الحسابات");
  XLSX.utils.book_append_sheet(wb,excelSheet(paymentRows,[28,28,24,12,18,26,24,24,24]),"الأقساط");
  XLSX.utils.book_append_sheet(wb,excelSheet(itemRows,[28,12,28,18,28,14,14,16,18,16]),"تفاصيل الطلبات");
  const d=new Date(),pad=n=>String(n).padStart(2,"0");
  XLSX.writeFile(wb,`3D_PEINTURES_COMMANDES_COMPTES_${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}.xlsx`);
  toast(`تم تحميل ملف الكوموندات والحسابات: ${orderRows.length} كوموند · ${money(totalDue)} DH باقي`);
 }catch(error){console.error("Light Excel export error",error);toast("تعذر تحميل ملف الكوموندات والحسابات. حاول مرة أخرى.")}
}

function openArchiveRestorePicker(){
 const input=$("allExcelRestoreInput");
 if(input){input.value="";input.click()}
}
function exportOrdersArchiveExcel(){
 exportOrdersAndAccountsExcel();
}
function exportClientsArchiveExcel(){
 try{
  if(typeof XLSX==="undefined")throw new Error("Excel library not loaded");
  const clientRows=(Array.isArray(clients)?clients:[]).map(c=>({"المعرف":c.id||"","اسم الزبون":c.name||"","الهاتف":c.phone||c.whatsapp||"","الشركة":c.company||c.societe||"","المدينة":c.city||"","العنوان":c.address||"","ICE":c.ice||"","صاحب الشيك/الكمبيالة":c.paymentHolder||c.paymentName||"","رقم الشيك/الكمبيالة":c.paymentNumber||c.chequeNumber||"","نوع الأداء":paymentTypeLabel(c.paymentType),"تاريخ الإضافة":c.importedAt||c.createdAt||""}));
  const accountMap=new Map();
  (Array.isArray(orders)?orders:[]).forEach(order=>{
   const name=String(order.client||"").trim();if(!name)return;
   const key=name.toLowerCase();const item=accountMap.get(key)||{name,orders:0,sales:0,paid:0,due:0};
   recalculateOrderPaymentState(order);item.orders+=1;item.sales+=Number(order.total)||0;item.paid+=paymentTotal(order);item.due+=Math.max(0,Number(order.total||0)-paymentTotal(order));accountMap.set(key,item);
  });
  const accountRows=[...accountMap.values()].map(a=>({"الزبون":a.name,"عدد الكوموندات":a.orders,"إجمالي المبيعات (DH)":Number(a.sales.toFixed(2)),"إجمالي المخلص (DH)":Number(a.paid.toFixed(2)),"مجموع الباقي (DH)":Number(a.due.toFixed(2))})).sort((a,b)=>b["مجموع الباقي (DH)"]-a["مجموع الباقي (DH)"]);
  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,excelSheet(clientRows,[24,24,18,24,18,30,20,28,24,24,24]),"الكليان");
  XLSX.utils.book_append_sheet(wb,excelSheet(accountRows,[24,16,22,22,20]),"حسابات الكليان");
  const d=new Date(),pad=n=>String(n).padStart(2,"0");
  XLSX.writeFile(wb,`3D_PEINTURES_CLIENTS_${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}.xlsx`);
  toast(`تم تحميل أرشيف الكليان: ${clientRows.length} كليان`);
 }catch(error){console.error("Clients Excel export error",error);toast("تعذر تحميل أرشيف الكليان")}
}
function exportDashboardExcel(){
 try{
  if(typeof XLSX==="undefined")throw new Error("Excel library not loaded");
  const selectedMonth=$("dashboardMonth")?.value||currentMonthKey();
  const selectedOrders=dashboardOrdersForMonth(selectedMonth),productMap=new Map(),hours=Array.from({length:24},()=>0);
  let sales=0;
  selectedOrders.forEach(order=>{
   sales+=Number(order.total)||0;const date=new Date(order.date);if(!Number.isNaN(date.getTime()))hours[date.getHours()]++;
   (Array.isArray(order.items)?order.items:[]).forEach(row=>{const product=products.find(p=>String(p.id)===String(row.id));const key=String(row.id||row.code||row.name||"unknown");const units=orderItemUnits(row);const line=Number(row.lineTotal??((Number(row.unitPrice??product?.price)||0)*units))||0;const item=productMap.get(key)||{name:row.name||product?.name||"Produit",units:0,sales:0};item.units+=units;item.sales+=line;productMap.set(key,item)});
  });
  const topProducts=[...productMap.values()].sort((a,b)=>b.units-a.units||b.sales-a.sales).slice(0,8),peakCount=Math.max(...hours,0),peakIndexes=hours.reduce((acc,value,index)=>value===peakCount&&value>0?acc.concat(index):acc,[]);
  const orderRows=selectedOrders.map(o=>{recalculateOrderPaymentState(o);const state=deadlineState(o);return {"معرف الكوموند":o.id||"","التاريخ":o.date||"","الزبون":o.client||"","الإجمالي (DH)":Number(o.total)||0,"المخلص (DH)":Number(o.paid)||0,"الباقي (DH)":Number(o.due)||0,"مدة الأداء (يوم)":state.term,"تاريخ الاستحقاق":o.dueDate||""}});
  const itemRows=[],paymentRows=[];selectedOrders.forEach(o=>{(Array.isArray(o.items)?o.items:[]).forEach((item,index)=>itemRows.push({"معرف الكوموند":o.id||"","رقم السطر":index+1,"معرف المنتج":item.id||"","كود المنتج":item.code||"","اسم المنتج":item.name||"","عدد الوحدات":Number(item.units)||0,"المجموع (DH)":Number(item.lineTotal??item.total)||0}));getPaymentHistory(o).forEach((p,index)=>paymentRows.push({"معرف القسط":p.id||`payment_${index+1}`,"معرف الكوموند":o.id||"","الزبون":o.client||"","رقم القسط":index+1,"مبلغ القسط (DH)":Number(p.amount)||0,"تاريخ وتوقيت الأداء":p.date||"","نوع الأداء":paymentTypeLabel(p.type||o.paymentType)}))});
  const summaryRows=[{"المؤشر":"الشهر المحدد / Mois sélectionné","القيمة":selectedMonth},{"المؤشر":"عدد الكوموندات / Nombre de commandes","القيمة":selectedOrders.length},{"المؤشر":"إجمالي المبيعات (DH) / Ventes","القيمة":Number(sales.toFixed(2))},{"المؤشر":"المنتوج الأكثر طلباً / Produit leader","القيمة":topProducts[0]?.name||"—"},{"المؤشر":"ذروة الطلبات / Heure de pointe","القيمة":peakIndexes.length?peakIndexes.map(h=>`${String(h).padStart(2,"0")}:00`).join(" · "):"—"},{"المؤشر":"نوع الملف","القيمة":"3D_PEINTURES_DASHBOARD_ARCHIVE"}];
  const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,excelSheet(summaryRows,[42,60]),"ملخص اللوحة");XLSX.utils.book_append_sheet(wb,excelSheet(topProducts.map((p,i)=>({"الترتيب":i+1,"المنتوج":p.name,"الوحدات":p.units,"المبيعات (DH)":Number(p.sales.toFixed(2))})),[12,30,16,20]),"أفضل المنتجات");XLSX.utils.book_append_sheet(wb,excelSheet(hours.map((count,h)=>({"الساعة":`${String(h).padStart(2,"0")}:00`,"عدد الطلبات":count})),[16,18]),"أوقات الذروة");XLSX.utils.book_append_sheet(wb,excelSheet(orderRows,[28,24,24,18,18,16,18,24]),"بيانات الكوموندات");XLSX.utils.book_append_sheet(wb,excelSheet(itemRows,[28,12,28,18,28,16,18]),"تفاصيل dashboard");XLSX.utils.book_append_sheet(wb,excelSheet(paymentRows,[28,28,24,12,18,26,24]),"أقساط dashboard");
  XLSX.writeFile(wb,`3D_PEINTURES_DASHBOARD_${selectedMonth}.xlsx`);toast(`تم تحميل لوحة التحكم التجارية: ${selectedMonth}`);
 }catch(error){console.error("Dashboard Excel export error",error);toast("تعذر تحميل لوحة التحكم التجارية")}
}

async function importBackupFile(file){
 if(!file)return;
 const reader=new FileReader();
 reader.onload=async e=>{
   let previousState=null;
   try{
     const data=JSON.parse(e.target.result);
     const rawProducts=Array.isArray(data)?data:data?.products;
     if(!Array.isArray(rawProducts)) throw new Error("Format de sauvegarde invalide");
     if(!confirm(`Restaurer ${rawProducts.length} produit(s) et leurs photos ?\n\nLes données actuelles seront remplacées.`))return;

     previousState={products,cart,orders,clients,active};
     const restored=rawProducts.map((p,i)=>backupProductSnapshot(p,i));
     const usedIds=new Set();
     restored.forEach((p,i)=>{
       if(usedIds.has(p.id)){p.id=`p_restore_${Date.now().toString(36)}_${i}_${Math.random().toString(36).slice(2,7)}`;}
       usedIds.add(p.id);
     });
     products=restored;
     cart=Array.isArray(data?.cart)?data.cart:[];
     orders=Array.isArray(data?.orders)?data.orders:[];
     clients=Array.isArray(data?.clients)?data.clients:[];
     active=categories.includes(canonicalCategory(data?.activeCategory))?canonicalCategory(data.activeCategory):categories[0];

     // Réduire automatiquement les photos uniquement si le stockage du téléphone l'exige.
     if(!save()){
       await compactProductsImages();
       if(!save()) throw new Error("STORAGE_FULL");
     }
     try{
       localStorage.setItem("3d_peintures_orders_v1",JSON.stringify(orders));
       localStorage.setItem("3d_peintures_cart_v4",JSON.stringify(cart));
       localStorage.setItem(CLIENTS_KEY,JSON.stringify(clients));
     }catch(storageError){
       throw new Error("STORAGE_FULL");
     }
     saveClients();
     selectedProductId=null;
     selectedImage="";
     renderCart();
     render();
     toast(`Sauvegarde restaurée : ${products.length} produit(s), photos et informations récupérées`);
   }catch(err){
     if(previousState){
       products=previousState.products;cart=previousState.cart;orders=previousState.orders;clients=previousState.clients;active=previousState.active;
       renderCart();render();
     }
     alert(err?.message==="STORAGE_FULL"
       ? "La sauvegarde contient trop de photos pour la mémoire du navigateur. Les photos seront compressées automatiquement ; si le problème continue, utilisez moins de photos ou videz l'ancienne sauvegarde."
       : "Impossible de restaurer cette sauvegarde.\nLe fichier est invalide ou incomplet.");
   }finally{
     $("backupInput").value="";
   }
 };
 reader.readAsText(file);
}

$("backupInput").onchange=e=>importBackupFile(e.target.files[0]);

function importProductsJson(file){
 if(!file)return;
 const reader=new FileReader();
 reader.onload=async e=>{
  let previousProducts=null,previousActive=null;
  try{
   const data=JSON.parse(e.target.result);
   const rawProducts=Array.isArray(data)?data:data?.products;
   if(!Array.isArray(rawProducts)||!rawProducts.length)throw new Error("PRODUCTS_EMPTY");
   if(!confirm(`رفع ${rawProducts.length} منتوج(ات) جاهزة؟\n\nسيتم استبدال قائمة المنتجات فقط، مع الحفاظ على الكوموندات والكليان.`))return;
   previousProducts=products;previousActive=active;
   const restored=rawProducts.map((p,i)=>backupProductSnapshot(p,i));
   const usedIds=new Set();
   restored.forEach((p,i)=>{if(usedIds.has(p.id))p.id=`p_json_${Date.now().toString(36)}_${i}_${Math.random().toString(36).slice(2,7)}`;usedIds.add(p.id)});
   products=restored;
   active=categories.includes(canonicalCategory(data?.activeCategory))?canonicalCategory(data.activeCategory):categories[0];
   if(!save()){
    await compactProductsImages();
    if(!save())throw new Error("STORAGE_FULL");
   }
   selectedProductId=null;selectedImage="";
   renderCart();render();
   toast(`تم رفع ${products.length} منتوج(ات) جاهزة بنجاح`);
  }catch(err){
   if(previousProducts){products=previousProducts;active=previousActive;save();renderCart();render()}
   alert(err?.message==="STORAGE_FULL"?"الملف كبير على ذاكرة المتصفح. حاول رفع نسخة أقل حجماً.":err?.message==="PRODUCTS_EMPTY"?"ملف JSON لا يحتوي على منتجات.":"تعذر رفع ملف المنتجات. تأكد من أنه ملف JSON صادر من التطبيق.");
  }finally{$("productsJsonInput").value=""}
 };
 reader.readAsText(file);
}

$("productsJsonInput").onchange=e=>importProductsJson(e.target.files[0]);

function excelRows(wb,name){
 const actual=wb.SheetNames.find(s=>s===name)||wb.SheetNames.find(s=>String(s).toLowerCase()===String(name).toLowerCase());
 return actual?XLSX.utils.sheet_to_json(wb.Sheets[actual],{defval:""}):[];
}
function excelRowsAny(wb,names){
 for(const name of names){const rows=excelRows(wb,name);if(rows.length)return rows}
 return [];
}
function excelNum(value,fallback=0){
 if(typeof value==="number")return Number.isFinite(value)?value:fallback;
 const n=Number(String(value??"").trim().replace(/\s/g,"").replace(",","."));
 return Number.isFinite(n)?n:fallback;
}
function excelDate(value,fallback){
 if(value instanceof Date&&!Number.isNaN(value.getTime()))return value.toISOString();
 const d=new Date(value);return Number.isNaN(d.getTime())?(fallback===null?null:(fallback||new Date().toISOString())):d.toISOString();
}
function importFullArchiveExcel(file){
 if(!file)return;
 const reader=new FileReader();
 reader.onload=async e=>{
  let previousState=null;
  try{
   if(typeof XLSX==="undefined")throw new Error("Excel library not loaded");
   const wb=XLSX.read(e.target.result,{type:"array",cellDates:true});
   const productRows=excelRowsAny(wb,["Products","المنتجات"]).filter(r=>String(r["المعرف"]||r["اسم المنتج"]||r["كود المنتج"]||"").trim());
   const clientRows=excelRowsAny(wb,["Clients","الكليان","الزبناء"]).filter(r=>String(r["المعرف"]||r["اسم الزبون"]||r["الزبون"]||"").trim());
   const orderRows=excelRowsAny(wb,["Orders","الكوموندات","بيانات الكوموندات"]).filter(r=>String(r["المعرف"]||r["معرف الكوموند"]||r["الزبون"]||"").trim());
   const hasProducts=productRows.length>0,hasClients=clientRows.length>0,hasOrders=orderRows.length>0;
   const hasInstallments=excelRowsAny(wb,["Installments","الأقساط","أقساط dashboard"]).length>0;
   const hasItems=excelRowsAny(wb,["Order Items","تفاصيل الطلبات","تفاصيل dashboard"]).length>0;
   const hasCart=excelRows(wb,"Cart").length>0;
   if(!hasProducts&&!hasClients&&!hasOrders&&!hasInstallments&&!hasItems)throw new Error("ARCHIVE_EMPTY");
   if(!confirm(`استرجاع ملف Excel؟\n\n${productRows.length} منتوج · ${clientRows.length} كليان · ${orderRows.length} كوموند\n\nسيتم تحديث الأقسام الموجودة في الملف فقط، مع الحفاظ على باقي البيانات.`))return;
   previousState={products,cart,orders,clients,active};
   const importedProducts=productRows.map((r,i)=>({
    id:String(r["المعرف"]||`p_excel_${Date.now().toString(36)}_${i}`),name:String(r["اسم المنتج"]||"Produit").trim(),code:normalizeProductCode(r["كود المنتج"]),price:excelNum(r["الثمن (DH)"]),costPrice:excelNum(r["ثمن التكلفة (DH)"]),qty:Math.max(0,Math.floor(excelNum(r["الوحدات في العلبة"]))),category:canonicalCategory(r["القسم"]),availability:String(r["التوفر"]||"").trim()==="غير متوفر"?"unavailable":"available",promo10Plus1:["نعم","yes","true","1"].includes(String(r["عرض 10+1"]||"").trim().toLowerCase()),description:String(r["الوصف"]||""),image:typeof r["الصورة (Data URL)"]==="string"?r["الصورة (Data URL)"]:""
   }));
   const restoredProducts=hasProducts?importedProducts:products;
   const productIds=new Set();restoredProducts.forEach((p,i)=>{if(!p.id||productIds.has(String(p.id)))p.id=`p_excel_${Date.now().toString(36)}_${i}_${Math.random().toString(36).slice(2,7)}`;productIds.add(String(p.id))});
   const importedClients=clientRows.map((r,i)=>({id:String(r["المعرف"]||`c_excel_${Date.now().toString(36)}_${i}`),name:String(r["اسم الزبون"]||"").trim(),phone:String(r["الهاتف"]||""),company:String(r["الشركة"]||""),city:String(r["المدينة"]||""),address:String(r["العنوان"]||""),ice:String(r["ICE"]||""),paymentHolder:String(r["صاحب الشيك/الكمبيالة"]||""),paymentNumber:String(r["رقم الشيك/الكمبيالة"]||""),paymentType:paymentTypeValue(r["نوع الأداء"]),importedAt:excelDate(r["تاريخ الإضافة"],new Date().toISOString())})).filter(c=>c.name);
   const importedOrders=[];const orderMap=new Map();
   orderRows.forEach((r,i)=>{
    const id=String(r["المعرف"]||r["معرف الكوموند"]||r["معرف الطلب"]||`o_excel_${Date.now().toString(36)}_${i}`);
    const termLabel=String(r["وضع الأجل"]||r["مدة الأداء (يوم)"]||"").trim().toLowerCase();
    const isCodTerm=termLabel.includes("استلام")||termLabel.includes("livraison")||termLabel.includes("cod");
    const isTestTerm=!isCodTerm&&(termLabel.includes("تجربة")||termLabel.includes("test")||Number(r["مدة الأداء (دقيقة)"])===1);
    const term=isCodTerm||isTestTerm?0:([15,30].includes(excelNum(r["مدة الأداء (يوم)"],15))?excelNum(r["مدة الأداء (يوم)"],15):15);
    const termMinutes=isTestTerm?Math.max(1,excelNum(r["مدة الأداء (دقيقة)"],1)):null;
    const order={id,date:excelDate(r["التاريخ"]),client:String(r["الزبون"]||""),company:String(r["الشركة"]||""),ice:String(r["ICE"]||""),phone:String(r["الهاتف"]||""),total:excelNum(r["الإجمالي (DH)"]),paid:0,due:0,profit:0,status:"unpaid",paymentTermDays:term,paymentTermMode:isCodTerm?"cod":(isTestTerm?"test_1m":"days"),paymentTermMinutes:termMinutes,dueDate:isCodTerm?"":excelDate(r["تاريخ الاستحقاق"],null),paymentHolder:String(r["صاحب الشيك/الكمبيالة"]||""),paymentNumber:String(r["رقم الشيك/الكمبيالة"]||""),paymentType:paymentTypeValue(r["نوع الأداء"]),note:String(r["الملاحظة"]||""),payments:[],items:[]};
    if(!order.dueDate&&!isCodTerm)order.dueDate=new Date(new Date(order.date).getTime()+(isTestTerm?termMinutes*60000:term*86400000)).toISOString();
    importedOrders.push(order);orderMap.set(id,order);
   });
   const restoredClients=hasClients?importedClients:clients;
   const restoredOrders=hasOrders?importedOrders:orders;
   excelRowsAny(wb,["Order Items","تفاصيل الطلبات","تفاصيل dashboard"]).forEach((r)=>{
    const order=orderMap.get(String(r["معرف الكوموند"]||""));if(!order)return;
    let item=null;try{item=JSON.parse(String(r["بيانات السطر"]||""))}catch(err){}
    order.items.push(item&&typeof item==="object"?item:{id:String(r["معرف المنتج"]||""),code:String(r["كود المنتج"]||""),name:String(r["اسم المنتج"]||""),boxes:excelNum(r["عدد العلب"]),qty:excelNum(r["عدد العلب"]),units:excelNum(r["عدد الوحدات"]),freeUnits:excelNum(r["الوحدات المجانية"]),unitPrice:excelNum(r["ثمن الوحدة (DH)"]),lineTotal:excelNum(r["المجموع (DH)"])});
   });
   excelRowsAny(wb,["Installments","الأقساط","أقساط dashboard"]).forEach((r)=>{
    const order=orderMap.get(String(r["معرف الكوموند"]||""));if(!order)return;
    order.payments.push({id:String(r["معرف القسط"]||makeId()),amount:excelNum(r["مبلغ القسط (DH)"]),date:excelDate(r["تاريخ وتوقيت الأداء"]),type:paymentTypeValue(r["نوع الأداء"]),holder:String(r["صاحب الشيك/الكمبيالة"]||""),number:String(r["رقم الشيك/الكمبيالة"]||"")});
   });
   restoredOrders.forEach(o=>recalculateOrderPaymentState(o));
   const restoredCart=hasCart?excelRows(wb,"Cart").map(r=>({id:String(r["معرف المنتج"]||""),qty:Math.max(1,Math.floor(excelNum(r["عدد العلب"],1)))})).filter(r=>productIds.has(r.id)):cart;
   const summary=excelRowsAny(wb,["ملخص","الملخص","ملخص اللوحة"]);const summaryMap=new Map(summary.map(r=>[String(r["المعلومة"]||r["المؤشر"]||""),r["القيمة"]]));
   const restoredActive=summaryMap.get("القسم النشط")?canonicalCategory(summaryMap.get("القسم النشط")):active;
   products=restoredProducts;clients=restoredClients;orders=restoredOrders;cart=restoredCart;active=restoredActive;
   if(!save()){await compactProductsImages();if(!save())throw new Error("STORAGE_FULL")}
   localStorage.setItem("3d_peintures_orders_v1",JSON.stringify(orders));localStorage.setItem("3d_peintures_cart_v4",JSON.stringify(cart));saveClients();
   selectedProductId=null;selectedImage="";renderCart();render();renderDueAlerts();
   toast(`تم استرجاع الأرشيف: ${products.length} منتوج · ${orders.length} كوموند`);
  }catch(err){
   if(previousState){products=previousState.products;cart=previousState.cart;orders=previousState.orders;clients=previousState.clients;active=previousState.active;renderCart();render();renderDueAlerts()}
   alert(err?.message==="STORAGE_FULL"?"الصور كثيرة على ذاكرة المتصفح. جرب ملفاً أقل حجماً.":err?.message==="ARCHIVE_EMPTY"?"هذا الملف لا يحتوي على أوراق أرشيف 3D PEINTURES.":"تعذر استرجاع أرشيف Excel. تأكد من استعمال الملف الذي تم تصديره من التطبيق.");
  }finally{$("allExcelRestoreInput").value=""}
 };
 reader.readAsArrayBuffer(file);
}

/* Import clients Excel */
const CLIENTS_KEY="3d_peintures_clients_v1";
let clients=JSON.parse(localStorage.getItem(CLIENTS_KEY)||"[]");

function saveClients(){
  localStorage.setItem(CLIENTS_KEY,JSON.stringify(clients));
  renderClientList();
}
function clientField(row, names){
  const keys=Object.keys(row||{});
  const norm=x=>String(x||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[\s_\-./]/g,"");
  for(const wanted of names){
    const k=keys.find(key=>norm(key)===norm(wanted) || norm(key).includes(norm(wanted)));
    if(k && row[k]!=null && String(row[k]).trim()!=="") return String(row[k]).trim();
  }
  return "";
}
function paymentTypeValue(value){
  const raw=String(value||"").trim().toLowerCase();
  if(["cash","espèce","espèces","espece","especes","نقدا","نقداً","نقدا"].includes(raw))return "cash";
  if(["lettre_de_change","lettre de change","cambiale","cambial","كمبيالة","الكمبيالة"].includes(raw))return "lettre_de_change";
  return "cheque";
}
function paymentTypeLabel(value){
  const type=paymentTypeValue(value);
  if(type==="cash")return "نقداً / Espèces";
  if(type==="lettre_de_change")return "كمبيالة / Cambiale";
  return "شيك / Chèque";
}
let activeClientSuggestionIndex=-1,activeClientSuggestionItems=[];
function normalizeClientLookup(value){return String(value||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").trim()}
function uniqueOrderClients(){
 const known=new Set();
 return clients.filter(client=>{
  const key=normalizeClientLookup(client?.name);if(!key||known.has(key))return false;
  known.add(key);return true;
 }).sort((a,b)=>String(a.name||"").localeCompare(String(b.name||""),"fr",{sensitivity:"base"}));
}
function hideClientSuggestions(){
 const box=$("clientSuggestions"),input=$("orderClient");
 activeClientSuggestionIndex=-1;activeClientSuggestionItems=[];
 if(box){box.hidden=true;box.innerHTML=""}
 if(input)input.setAttribute("aria-expanded","false");
}
function selectClientSuggestion(index){
 const client=activeClientSuggestionItems[Number(index)];if(!client)return;
 $("orderClient").value=String(client.name||"").trim();
 hideClientSuggestions();
}
function renderClientSuggestions(value=$("orderClient")?.value||""){
 const box=$("clientSuggestions"),input=$("orderClient");if(!box||!input)return;
 const query=normalizeClientLookup(value);
 activeClientSuggestionIndex=-1;
 if(!query){hideClientSuggestions();return}
 const matches=uniqueOrderClients().filter(client=>[client.name,client.company,client.city,client.ville].some(field=>normalizeClientLookup(field).includes(query))).slice(0,7);
 activeClientSuggestionItems=matches;
 box.hidden=false;input.setAttribute("aria-expanded","true");
 if(!matches.length){box.innerHTML='<div class="client-suggestion-empty">ما لقيناش كليان مطابق. تقدر تزيده بزر + Client.</div>';return}
 box.innerHTML=matches.map((client,index)=>{
  const details=[client.company,client.city||client.ville].filter(Boolean).join(" · ");
  return `<button class="client-suggestion" type="button" role="option" data-client-suggestion="${index}"><b>${esc(client.name||"")}</b>${details?`<small>${esc(details)}</small>`:""}</button>`;
 }).join("");
 box.querySelectorAll("[data-client-suggestion]").forEach(button=>{
  button.onmousedown=event=>event.preventDefault();
  button.onclick=()=>selectClientSuggestion(button.dataset.clientSuggestion);
 });
}
function handleClientSuggestionKeys(event){
 const box=$("clientSuggestions");if(!box||box.hidden)return;
 const options=[...box.querySelectorAll("[data-client-suggestion]")];
 if(event.key==="Escape"){hideClientSuggestions();return}
 if(!options.length)return;
 if(event.key==="ArrowDown"||event.key==="ArrowUp"){
  event.preventDefault();
  activeClientSuggestionIndex=event.key==="ArrowDown"?Math.min(activeClientSuggestionIndex+1,options.length-1):Math.max(activeClientSuggestionIndex-1,0);
  options.forEach((option,index)=>option.classList.toggle("is-active",index===activeClientSuggestionIndex));
  options[activeClientSuggestionIndex]?.scrollIntoView({block:"nearest"});
 }
 if(event.key==="Enter"&&activeClientSuggestionIndex>=0){event.preventDefault();selectClientSuggestion(options[activeClientSuggestionIndex].dataset.clientSuggestion)}
}
function renderClientList(){
 const box=$("clientSuggestions"),input=$("orderClient");if(!box||!input)return;
 if(!box.hidden&&input.value.trim())renderClientSuggestions(input.value);else hideClientSuggestions();
}
function importClientsExcel(file){
  if(!file)return;
  const reader=new FileReader();
  reader.onload=async e=>{
    try{
      if(typeof XLSX==="undefined") throw new Error("Excel library not loaded");
      const wb=XLSX.read(e.target.result,{type:"array"});
      const ws=wb.Sheets[wb.SheetNames[0]];
      const rows=XLSX.utils.sheet_to_json(ws,{defval:""});
      if(!rows.length) throw new Error("Le fichier est vide");
      const imported=[];
      rows.forEach((r,i)=>{
        const name=clientField(r,["Nom","Nom client","Client","Raison sociale","Client Name","Name","Societe","Société"]);
        if(!name)return;
        imported.push({
          id:"c_"+Date.now().toString(36)+"_"+i+"_"+Math.random().toString(36).slice(2,7),
          name,
          phone:clientField(r,["WhatsApp","Whatsapp","Téléphone","Telephone","Tel","Phone","GSM","Mobile"]),
          company:clientField(r,["Société","Societe","Company","Entreprise","Raison sociale"]),
          city:clientField(r,["Ville","City"]),
          address:clientField(r,["Adresse","Address"]),
          ice:clientField(r,["ICE","Identifiant fiscal"]),
          paymentHolder:clientField(r,["Titulaire du chèque","Titulaire cheque","Propriétaire chèque","Nom du chèque","Cheque holder","Payment holder"]),
          paymentNumber:clientField(r,["Numéro du chèque","Numero cheque","N° chèque","Num cheque","Numéro cambiale","Cheque number","Payment number"]),
          paymentType:paymentTypeValue(clientField(r,["Type de paiement","Type paiement","Payment type","Mode de paiement","Mode paiement","Type cheque","Type chèque"])),
          importedAt:new Date().toISOString()
        });
      });
      if(!imported.length) throw new Error("ما لقيتش عمود ديال اسم الكليان. خاص يكون مثلاً: Nom, Client أو Nom client.");
      const map=new Map(clients.map(c=>[String(c.name).trim().toLowerCase(),c]));
      imported.forEach(c=>map.set(c.name.trim().toLowerCase(),c));
      clients=[...map.values()];
      saveClients();
      toast(`تم إدخال ${imported.length} كليان من Excel`);
      $("orderClient").focus();
      setTimeout(()=>openOrdersModal(),350);
    }catch(err){
      alert("تعذر إدخال ملف Excel.\n"+(err.message||"تأكد من الملف والأعمدة."));
    }finally{
      $("clientsExcelInput").value="";
    }
  };
  reader.readAsArrayBuffer(file);
}
$("clientsExcelInput").onchange=e=>importClientsExcel(e.target.files[0]);
renderClientList();


/* Gestion des clients */
function openClientModal(prefillName=""){
  $("clientForm").reset();
  $("clientEditId").value="";
  const initialName=prefillName||$("orderClient").value.trim();
  const existing=clients.find(c=>String(c.name||"").trim().toLowerCase()===String(initialName||"").trim().toLowerCase());
  $("clientName").value=initialName;
  if($("clientManagerSearch")){ $("clientManagerSearch").value=""; $("clearClientManagerSearch").style.display="none"; }
  $("clientCompany").value=existing?.company||""; $("clientCity").value=existing?.city||existing?.ville||""; $("clientICE").value=existing?.ice||""; $("clientPaymentHolder").value=existing?.paymentHolder||existing?.chequeHolder||existing?.paymentName||""; $("clientPaymentNumber").value=existing?.paymentNumber||existing?.chequeNumber||""; $("clientPaymentType").value=paymentTypeValue(existing?.paymentType||existing?.paymentMode||existing?.modePaiement); $("clientWhatsapp").value=existing?.phone||"";
   renderClientsManager();
   renderClientStats();
   $("clientModal").classList.add("show");
}
function closeClientModal(){$("clientModal").classList.remove("show")}
function monthKey(value){
 const d=new Date(value);
 if(Number.isNaN(d.getTime()))return "";
 return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
}
function currentMonthKey(){return monthKey(new Date())}
function renderClientStats(){
 const monthInput=$("clientStatsMonth"), listBox=$("clientStatsList"), summary=$("clientStatsSummary"), searchInput=$("clientStatsSearch");
 if(!monthInput||!listBox||!summary)return;
 if(!monthInput.value)monthInput.value=currentMonthKey();
 const selectedMonth=monthInput.value;
 const q=(searchInput?.value||"").trim().toLowerCase();
 const people=new Map();
 clients.forEach(c=>{
   const name=String(c.name||"").trim(); if(!name)return;
   people.set(name.toLowerCase(),{name,company:c.company||""});
 });
 orders.forEach(o=>{
   const name=String(o.client||"").trim(); if(!name)return;
   const key=name.toLowerCase(); if(!people.has(key))people.set(key,{name,company:""});
 });
 let rows=[...people.values()].map(person=>{
   const matched=orders.filter(o=>monthKey(o.date)===selectedMonth&&String(o.client||"").trim().toLowerCase()===person.name.toLowerCase());
   const total=matched.reduce((sum,o)=>sum+(Number(o.total)||0),0);
   return {...person,count:matched.length,total};
 });
 const totalOrders=rows.reduce((sum,row)=>sum+row.count,0);
 const activeClients=rows.filter(row=>row.count>0).length;
 const totalSales=rows.reduce((sum,row)=>sum+row.total,0);
 if(q) rows=rows.filter(r=>String(r.name).toLowerCase().includes(q)||String(r.company).toLowerCase().includes(q));
 rows.sort((a,b)=>b.total-a.total||b.count-a.count||a.name.localeCompare(b.name,"fr"));
 summary.innerHTML=`<span><b>${totalOrders}</b>طلبات</span><span><b>${activeClients}</b>زبناء نشيطين</span><span><b>${money(totalSales)}</b>DH</span>`;
 listBox.innerHTML=rows.length?rows.map(row=>`<div class="client-stat-row"><div><strong>${esc(row.name)}</strong>${row.company?`<small>${esc(row.company)}</small>`:""}</div><span class="client-stat-orders">${row.count} طلب</span><span class="client-stat-total">${money(row.total)} DH</span></div>`).join(""):"<div class=\"cart-empty\">لا يوجد نتائج.</div>";
}
function forecastMonthKey(baseKey,offset){
 const [year,month]=String(baseKey||currentMonthKey()).split("-").map(Number);
 const d=new Date(year,Math.max(0,month-1)+offset,1);
 return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
}
function forecastMonthLabel(key){
 const [year,month]=String(key).split("-").map(Number);
 const d=new Date(year,month-1,1);
 return d.toLocaleDateString("fr-FR",{month:"short"}).replace(".","");
}
function orderItemUnits(row){
 const boxes=Math.max(0,Number(row?.qty)||0);
 const units=Math.max(0,Number(row?.units)||0);
 return Math.max(0,Number(row?.paidUnits ?? (boxes*units))||0);
}
function buildSalesForecast(targetMonth){
 const target=targetMonth||currentMonthKey();
 const historyKeys=Array.from({length:6},(_,i)=>forecastMonthKey(target,i-6));
 const recentKeys=historyKeys.slice(3);
 const previousKeys=historyKeys.slice(0,3);
 const monthly=new Map(historyKeys.map(key=>[key,{sales:0,orders:0,units:0}]));
 const productMap=new Map();
 let recentSales=0,previousSales=0;
 orders.forEach(order=>{
   const key=monthKey(order.date);
   if(!monthly.has(key))return;
   const month=monthly.get(key);
   const orderTotal=Number(order.total)||0;
   month.sales+=orderTotal;month.orders++;
   if(recentKeys.includes(key))recentSales+=orderTotal;
   if(previousKeys.includes(key))previousSales+=orderTotal;
   (order.items||[]).forEach(row=>{
     const units=orderItemUnits(row);
     month.units+=units;
     const id=String(row.id||row.code||row.name||"unknown");
     const product=products.find(p=>String(p.id)===String(row.id));
     const existing=productMap.get(id)||{name:row.name||product?.name||"Produit",units:0,sales:0,orders:0};
     existing.units+=units;
     existing.sales+=Number(row.lineTotal ?? ((Number(row.unitPrice ?? product?.price)||0)*units))||0;
     existing.orders++;
     productMap.set(id,existing);
   });
 });
 const recentProductRows=[...productMap.values()].filter(row=>row.units>0).map(row=>({
   ...row,
   averageUnits:row.units/3,
   forecastUnits:Math.max(1,Math.ceil(row.units/3)),
   averageSales:row.sales/3,
   forecastSales:row.sales/3
 })).sort((a,b)=>b.units-a.units||b.sales-a.sales).slice(0,8);
 const chart=historyKeys.map(key=>({...monthly.get(key),key,label:forecastMonthLabel(key)}));
 const trend=previousSales>0?((recentSales-previousSales)/previousSales)*100:null;
 return {target,chart,recentProductRows,forecastSales:recentSales/3,trend,recentSales,previousSales};
}
function exportSalesForecastToExcel(){
 const monthInput=$("salesForecastMonth");
 const target=monthInput?.value||forecastMonthKey(currentMonthKey(),1);
 try{
   if(typeof XLSX==="undefined") throw new Error("Excel library not loaded");
   const data=buildSalesForecast(target);
   const productRows=data.recentProductRows.map(row=>({
     "المنتوج":row.name,
     "القطع المباعة خلال آخر 3 أشهر":row.units,
     "المعدل الشهري":Number(row.averageUnits.toFixed(2)),
     "الكمية المتوقعة للشهر القادم":row.forecastUnits,
     "المبيعات خلال آخر 3 أشهر (DH)":Number(row.sales.toFixed(2)),
     "المبيعات المتوقعة (DH)":Number(row.forecastSales.toFixed(2))
   }));
   const monthlyRows=data.chart.map(row=>({"الشهر":row.key,"المبيعات (DH)":Number(row.sales.toFixed(2)),"عدد الطلبات":row.orders,"القطع المباعة":row.units}));
   const summaryRows=[
     {"المؤشر":"الشهر المستهدف", "القيمة":target},
     {"المؤشر":"المبيعات المتوقعة (DH)", "القيمة":Number(data.forecastSales.toFixed(2))},
     {"المؤشر":"المبيعات خلال آخر 3 أشهر (DH)", "القيمة":Number(data.recentSales.toFixed(2))},
     {"المؤشر":"الاتجاه مقارنة بالـ 3 أشهر السابقة", "القيمة":data.trend===null?"لا توجد مقارنة كافية":`${data.trend.toFixed(2)}%`}
   ];
   const wb=XLSX.utils.book_new();
   const wsProducts=XLSX.utils.json_to_sheet(productRows.length?productRows:[{"المنتوج":"لا توجد بيانات كافية"}]);
   const wsMonthly=XLSX.utils.json_to_sheet(monthlyRows);
   const wsSummary=XLSX.utils.json_to_sheet(summaryRows);
   XLSX.utils.book_append_sheet(wb,wsProducts,"توقعات المنتوجات");
   XLSX.utils.book_append_sheet(wb,wsMonthly,"المبيعات الشهرية");
   XLSX.utils.book_append_sheet(wb,wsSummary,"الملخص");
   XLSX.writeFile(wb,`توقعات_المبيعات_${target}.xlsx`);
   toast("تم تحميل توقعات المبيعات Excel");
 }catch(err){console.error(err);toast("خطأ أثناء تحميل توقعات المبيعات")}
}
function renderSalesForecast(){
 const panel=$("salesForecastPanel"),monthInput=$("salesForecastMonth"),summary=$("salesForecastSummary"),chartBox=$("salesForecastChart"),productsBox=$("salesForecastProducts");
 if(!panel||!monthInput||!summary||!chartBox||!productsBox)return;
 if(!monthInput.value)monthInput.value=forecastMonthKey(currentMonthKey(),1);
 const data=buildSalesForecast(monthInput.value);
 const maxSales=Math.max(...data.chart.map(item=>item.sales),1);
 const trendText=data.trend===null?"لا توجد مقارنة كافية":`${data.trend>=0?"▲":"▼"} ${Math.abs(data.trend).toFixed(0)}% مقابل 3 أشهر قبل`;
 summary.innerHTML=`<span><b>${money(data.forecastSales)}</b>DH متوقعة<small>للشهر القادم</small></span><span><b>${data.recentProductRows.length}</b>منتوجات<small>ذات مبيعات مسجلة</small></span><span><b>${esc(trendText)}</b><small>الاتجاه العام</small></span>`;
 chartBox.innerHTML=data.chart.map(item=>{
   const height=item.sales?Math.max(6,Math.round((item.sales/maxSales)*82)):4;
   return `<div class="forecast-bar-item"><span class="forecast-bar-value">${item.sales?money(item.sales):"0"}</span><div class="forecast-bar" style="height:${height}px" title="${money(item.sales)} DH"></div><span class="forecast-bar-label">${esc(item.label)}</span></div>`;
 }).join("");
 productsBox.innerHTML=data.recentProductRows.length?data.recentProductRows.map(row=>`<div class="forecast-product-row"><div><strong>${esc(row.name)}</strong><small>معدل آخر 3 أشهر: ${row.averageUnits.toFixed(0)} قطعة / شهر</small></div><span class="forecast-product-stat">${row.units} قطعة</span><span class="forecast-product-next">متوقع: ${row.forecastUnits}</span></div>`).join(""):"<div class=\"forecast-empty\">لا توجد طلبات كافية لإعداد توقعات. سجّل بعض الطلبات أولاً.</div>";
}
function toggleSalesForecast(){
 const panel=$("salesForecastPanel"),button=$("salesForecastToggle"); if(!panel)return;
 const visible=panel.classList.toggle("show");
 if(visible){renderSalesForecast();if(button)button.textContent="📉 إخفاء توقعات المبيعات";}
 else if(button)button.textContent="📈 توقعات المبيعات";
}
function toggleClientStats(){
 const panel=$("clientStatsPanel"), button=$("clientStatsToggle"); if(!panel)return;
 const visible=panel.classList.toggle("show");
 if(visible){renderClientStats();if(button)button.textContent="📊 إخفاء الإحصائيات";}
 else if(button)button.textContent="📊 كشف الزبناء والإحصائيات";
}
function exportClientStatsToExcel(){
 const monthInput=$("clientStatsMonth"); if(!monthInput)return;
 const selectedMonth=monthInput.value || currentMonthKey();
 const people=new Map();
 clients.forEach(c=>{ const name=String(c.name||"").trim(); if(name) people.set(name.toLowerCase(),{name,company:c.company||""}); });
 orders.forEach(o=>{ const name=String(o.client||"").trim(); if(name && !people.has(name.toLowerCase())) people.set(name.toLowerCase(),{name,company:""}); });
 const rows=[...people.values()].map(person=>{
   const matched=orders.filter(o=>monthKey(o.date)===selectedMonth&&String(o.client||"").trim().toLowerCase()===person.name.toLowerCase());
   const total=matched.reduce((sum,o)=>sum+(Number(o.total)||0),0);
   return { "الزبون": person.name, "الشركة": person.company, "عدد الطلبات": matched.length, "المجموع (DH)": total };
 }).sort((a,b)=>b["المجموع (DH)"]-a["المجموع (DH)"]);
 try {
   const ws = XLSX.utils.json_to_sheet(rows);
   const wb = XLSX.utils.book_new();
   XLSX.utils.book_append_sheet(wb, ws, "Statistiques");
   XLSX.writeFile(wb, `Statistiques_Clients_${selectedMonth}.xlsx`);
   toast("تم تحميل ملف Excel بنجاح");
 } catch(err) {
   console.error(err);
   toast("خطأ أثناء تحميل الملف");
 }
}
async function createClientBillingPDF(client){
 try{
   if(!window.html2canvas||!window.jspdf) throw new Error("PDF libraries unavailable");
   let logoB64="";
   try{
     const r=await fetch("https://www.dropbox.com/scl/fi/g6bef6j1a3gtse98o9ktp/Picsart_26-08-12_00-00-35-616.png?rlkey=z5wm1262vccogra8t9n71stei&st=5lq7g02n&raw=1");
     const blob=await r.blob();
     logoB64=await new Promise(resolve=>{const fr=new FileReader();fr.onload=e=>resolve(e.target.result);fr.readAsDataURL(blob)});
   }catch(e){console.warn("Logo client billing load failed",e)}
   const now=new Date();
   const date=now.toLocaleDateString("fr-FR",{day:"2-digit",month:"2-digit",year:"numeric"});
   const watermark=logoB64?`<div style="position:absolute;top:57%;left:50%;transform:translate(-50%,-50%);width:500px;opacity:.08;z-index:0"><img src="${logoB64}" style="width:100%;height:auto"></div>`:"";
   const root=document.createElement("div");
   root.dir="ltr";
   root.style.cssText="position:fixed;left:-10000px;top:0;width:760px;background:#fff;color:#172033;padding:46px;font-family:Arial,sans-serif;z-index:-1;box-sizing:border-box";
   root.innerHTML=`${watermark}<div style="position:relative;z-index:1">
     <div style="border-bottom:4px solid #c49a38;padding-bottom:20px;margin-bottom:34px">
       <div style="font-size:17px;letter-spacing:4px;color:#b58a2a;font-weight:700">3D PEINTURES</div>
       <div style="font-size:32px;font-weight:800;margin-top:8px">FICHE DE FACTURATION</div>
       <div style="font-size:13px;color:#667085;margin-top:9px">Document d'informations client · ${date}</div>
     </div>
     <div style="padding:24px;border:1px solid #dfe3e8;border-radius:16px;background:#fffdf7">
       <div style="font-size:14px;letter-spacing:1px;color:#9a6b12;font-weight:800;margin-bottom:20px">INFORMATIONS À UTILISER POUR LA FACTURATION</div>
       <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px 28px;font-size:16px">
         <div style="padding-bottom:13px;border-bottom:1px solid #e5e7eb"><span style="display:block;color:#667085;font-size:12px;margin-bottom:6px">NOM DU CLIENT</span><b>${esc(client.name||"—")}</b></div>
         <div style="padding-bottom:13px;border-bottom:1px solid #e5e7eb"><span style="display:block;color:#667085;font-size:12px;margin-bottom:6px">SOCIÉTÉ</span><b>${esc(client.company||"—")}</b></div>
         <div style="padding-bottom:13px;border-bottom:1px solid #e5e7eb"><span style="display:block;color:#667085;font-size:12px;margin-bottom:6px">ICE</span><b>${esc(client.ice||"—")}</b></div>
         <div style="padding-bottom:13px;border-bottom:1px solid #e5e7eb"><span style="display:block;color:#667085;font-size:12px;margin-bottom:6px">TITULAIRE DU CHÈQUE / CAMBIALE</span><b>${esc(client.paymentHolder||client.chequeHolder||client.paymentName||"—")}</b></div>
         <div style="padding-bottom:13px;border-bottom:1px solid #e5e7eb"><span style="display:block;color:#667085;font-size:12px;margin-bottom:6px">NUMÉRO DU CHÈQUE / CAMBIALE</span><b>${esc(client.paymentNumber||client.chequeNumber||"—")}</b></div>
         <div style="padding-bottom:13px;border-bottom:1px solid #e5e7eb"><span style="display:block;color:#667085;font-size:12px;margin-bottom:6px">TYPE DE PAIEMENT</span><b>${esc(paymentTypeLabel(client.paymentType||client.paymentMode||client.modePaiement))}</b></div>
         <div style="padding-bottom:13px;border-bottom:1px solid #e5e7eb"><span style="display:block;color:#667085;font-size:12px;margin-bottom:6px">DATE D'ENVOI</span><b>${date}</b></div>
       </div>
     </div>
     <div style="margin-top:28px;padding:18px 20px;border-left:4px solid #c49a38;background:#fff9e9;color:#344054;font-size:15px;line-height:1.6">Merci d'utiliser ces informations pour préparer la facture du client indiqué ci-dessus.</div>
     <div style="margin-top:100px;text-align:center;color:#667085;font-size:13px">Document neutre · 3D PEINTURES</div>
   </div>`;
   document.body.appendChild(root);
   const canvas=await html2canvas(root,{scale:2,backgroundColor:"#fff",useCORS:true,logging:false});
   const {jsPDF}=window.jspdf;
   const pdf=new jsPDF({orientation:"p",unit:"mm",format:"a4"});
   const pageW=210,pageH=297,margin=8,imgW=pageW-margin*2,imgH=canvas.height*imgW/canvas.width,pagePx=Math.floor(canvas.width*(pageH-margin*2)/imgH);
   let yPx=0,page=0;
   while(yPx<canvas.height){const sliceH=Math.min(pagePx,canvas.height-yPx);const slice=document.createElement("canvas");slice.width=canvas.width;slice.height=sliceH;slice.getContext("2d").drawImage(canvas,0,yPx,canvas.width,sliceH,0,0,canvas.width,sliceH);if(page>0)pdf.addPage();pdf.addImage(slice.toDataURL("image/jpeg",.92),"JPEG",margin,margin,imgW,sliceH*imgW/canvas.width);yPx+=sliceH;page++}
   document.body.removeChild(root);
   return {blob:pdf.output("blob"),name:`Fiche_Facturation_${String(client.name||"Client").replace(/[^a-z0-9_-]+/gi,"_")}_${date.replaceAll("/","-")}.pdf`};
 }catch(err){console.error(err);return null}
}
async function shareClientBillingPDF(client){
 const result=await createClientBillingPDF(client);
 if(!result){toast("تعذر إنشاء ملف معلومات الفوترة");return}
 const file=new File([result.blob],result.name,{type:"application/pdf"});
 if(navigator.share&&(!navigator.canShare||navigator.canShare({files:[file]}))){
   try{await navigator.share({title:"Fiche de facturation — "+(client.name||"Client"),text:"معلومات الفوترة الخاصة بالزبون",files:[file]});toast("تم تجهيز ملف معلومات الفوترة");return}catch(e){if(e?.name==="AbortError")return}
 }
 const url=URL.createObjectURL(file);const a=document.createElement("a");a.href=url;a.download=result.name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),3000);toast("تم تحميل ملف معلومات الفوترة PDF");
}
function normalizeClientSearch(value){return String(value||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").trim()}
function renderClientsManager(){
 const box=$("clientsManagerList"); if(!box)return;
 const query=normalizeClientSearch($("clientManagerSearch")?.value||"");
 const visibleClients=clients.filter(c=>{
   if(!query)return true;
   return [c.name,c.company,c.city,c.ville,c.address,c.ice,c.paymentHolder,c.paymentNumber,c.paymentName,c.chequeHolder,c.chequeNumber,c.chequeName,c.cambiale].some(value=>normalizeClientSearch(value).includes(query));
 });
 box.innerHTML=visibleClients.map(c=>`<div class="client-manager-row"><div><b>${esc(c.name||"")}</b><small>${esc(c.city||c.ville||"")}${c.company?` · ${esc(c.company)}`:""}${c.ice?` · ICE ${esc(c.ice)}`:""}${c.phone?` · WhatsApp ${esc(c.phone)}`:""}</small></div><div class="client-manager-actions"><button type="button" data-client-invoice="${esc(c.id)}">📄 Infos facturation</button><button type="button" data-client-edit="${esc(c.id)}">Modifier</button></div></div>`).join("") || `<div class="cart-empty">${query?"ما لقيتش زبون مطابق للبحث.":"Aucun client enregistré."}</div>`;
   box.querySelectorAll("[data-client-edit]").forEach(btn=>btn.onclick=()=>{
     const c=clients.find(x=>x.id===btn.dataset.clientEdit); if(!c)return;
      $("clientEditId").value=c.id; $("clientName").value=c.name||""; $("clientCompany").value=c.company||""; $("clientCity").value=c.city||c.ville||""; $("clientICE").value=c.ice||""; $("clientPaymentHolder").value=c.paymentHolder||c.chequeHolder||c.paymentName||""; $("clientPaymentNumber").value=c.paymentNumber||c.chequeNumber||""; $("clientPaymentType").value=paymentTypeValue(c.paymentType||c.paymentMode||c.modePaiement); $("clientWhatsapp").value=c.phone||"";
   });
   box.querySelectorAll("[data-client-invoice]").forEach(btn=>btn.onclick=()=>{
     const c=clients.find(x=>x.id===btn.dataset.clientInvoice); if(c) shareClientBillingPDF(c);
   });
}
function saveClientForm(e){
 e.preventDefault();
 const name=$("clientName").value.trim(); if(!name){alert("دخل اسم الكليان");return}
  const data={id:$("clientEditId").value||("c_"+Date.now().toString(36)),name,company:$("clientCompany").value.trim(),city:$("clientCity").value.trim(),ice:$("clientICE").value.trim(),paymentHolder:$("clientPaymentHolder").value.trim(),paymentNumber:$("clientPaymentNumber").value.trim(),paymentType:paymentTypeValue($("clientPaymentType").value),phone:$("clientWhatsapp").value.trim()};
 const idx=clients.findIndex(c=>c.id===data.id);
 const duplicate=clients.findIndex(c=>c.id!==data.id && String(c.name||"").trim().toLowerCase()===name.toLowerCase());
 if(duplicate>=0){ clients[duplicate]={...clients[duplicate],...data,id:clients[duplicate].id}; }
 else if(idx>=0) clients[idx]=data; else clients.unshift(data);
   saveClients(); renderClientsManager(); renderClientStats(); $("orderClient").value=name; hideClientSuggestions(); closeClientModal(); toast("تم حفظ معلومات الكليان");

}

/* Commandes : archive, paiements et bénéfice */
function orderCartSummary(){
 let total=0,profit=0;
 cart.forEach(row=>{
   const p=products.find(x=>x.id===row.id); if(!p)return;
   const boxes=Number(row.qty)||0, units=Number(p.qty)||0;
   total += Number(p.price||0)*units*boxes;
   profit += (Number(p.price||0)-Number(p.costPrice||0))*units*boxes;
 });
 return {total,profit};
}
function openOrderModal(){
 if(!cart.length){toast("السلة فارغة");return}
 const x=orderCartSummary();
  $("orderClient").value="";hideClientSuggestions();
  $("orderPaymentNumber").value="";
  if($("orderPaymentType"))$("orderPaymentType").value="cash";
  $("orderPaymentTerm").value="15";
  $("orderNote").value="إستخلاص عند الاستلام — Paiement à la livraison";
 $("orderGrandTotal").textContent=money(x.total)+" DH";
 $("orderDue").textContent="غير مخلص";
 $("orderProfit").textContent=money(x.profit)+" DH";
 // La fenêtre d'enregistrement passe au-dessus du panier : le panier et ses boutons restent derrière.
 $("orderModal").classList.add("show");
 // Ne pas ouvrir automatiquement le clavier sur Android.
}
function closeOrderModal(){hideClientSuggestions();$("orderModal").classList.remove("show")}
async function createOrderPDF(order){
 try{
   if(!window.html2canvas || !window.jspdf) throw new Error("PDF libraries unavailable");

   // Pre-load logo as base64 so html2canvas can render it offline
   let logoB64 = "";
   try{
     const r = await fetch("https://www.dropbox.com/scl/fi/g6bef6j1a3gtse98o9ktp/Picsart_26-08-12_00-00-35-616.png?rlkey=z5wm1262vccogra8t9n71stei&st=5lq7g02n&raw=1");
     const blob = await r.blob();
     logoB64 = await new Promise(res=>{ const fr=new FileReader(); fr.onload=e=>res(e.target.result); fr.readAsDataURL(blob); });
   }catch(e){ console.warn("Logo load failed",e); }

   const root=document.createElement("div");
   root.dir="ltr";
   root.style.cssText="position:fixed;left:-10000px;top:0;width:760px;background:#fff;color:#172033;padding:42px;font-family:Arial,sans-serif;z-index:-1;box-sizing:border-box";
   const d=new Date(order.date);
   const date=d.toLocaleDateString("fr-FR",{day:"2-digit",month:"2-digit",year:"numeric"});
   const time=d.toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"});
    const productSubtotal=(Array.isArray(order.items)?order.items:[]).reduce((sum,row)=>{const p=products.find(x=>x.id===row.id)||{};const boxes=Number(row.qty)||0;const units=Number(row.units??p.qty)||0;const unitPrice=Number(row.unitPrice??p.price)||0;const paidUnits=Number(row.paidUnits??(boxes*units))||0;return sum+Number(row.lineTotal??(unitPrice*paidUnits))||sum},0);
    const rows=order.items.map(row=>{
      const p=products.find(x=>x.id===row.id)||{};
      const boxes=Number(row.qty)||0;
      const units=Number(row.units ?? p.qty)||0;
      const unitPrice=Number(row.unitPrice ?? p.price)||0;
      const paidUnits=Number(row.paidUnits ?? (boxes*units))||0;
      const freeUnits=Number(row.freeUnits ?? (hasPromo10Plus1(p)?Math.floor(paidUnits/10):0))||0;
      const deliveredUnits=paidUnits+freeUnits;
      const line=Number(row.lineTotal ?? (unitPrice*paidUnits))||0;
      const promoNote=freeUnits>0?`<div style="margin-top:4px;color:#d92d20;font-size:11px;font-weight:800">🎁 10 + 1 GRATUIT · +${freeUnits} pièce(s) offerte(s) · livré : ${deliveredUnits}</div>`:"";
      return `<tr><td style="padding:8px;border-bottom:1px solid #ddd;text-align:left"><div>${esc(row.name||p.name||"Produit")}</div>${promoNote}</td><td style="padding:8px;border-bottom:1px solid #ddd;text-align:center">${boxes}</td><td style="padding:8px;border-bottom:1px solid #ddd;text-align:center">${units}</td><td style="padding:8px;border-bottom:1px solid #ddd;text-align:right">${money(unitPrice)} DH</td><td style="padding:8px;border-bottom:1px solid #ddd;text-align:right;font-weight:700">${money(line)} DH</td></tr>`;
    }).join("");
    const scheduleState=deadlineState(order);
    const scheduleHtml=paymentScheduleHtml(order,scheduleState);
    const isCodOrder=scheduleState.termKey==="cod";
    const creditDueDate=scheduleState.dueDate?scheduleState.dueDate.toLocaleDateString("fr-FR",{day:"2-digit",month:"2-digit",year:"numeric"}):"—";
    const creditFooterHtml=isCodOrder?"":`<div style="margin-top:22px;border-top:2px solid #12386f;border-bottom:2px solid #12386f;padding:12px 4px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;direction:ltr;text-align:center"><div><div style="font-size:10px;color:#667085">Total produits</div><div style="font-size:15px;font-weight:700;color:#172033;margin-top:4px">${money(productSubtotal)} DH</div><div style="font-size:10px;color:#667085;margin-top:2px">مجموع ثمن المنتجات</div></div><div><div style="font-size:10px;color:#667085">Date limite de règlement</div><div style="font-size:14px;font-weight:700;color:#c62828;margin-top:4px">${creditDueDate}</div><div style="font-size:10px;color:#c62828;margin-top:2px">تاريخ آخر أجل للاستخلاص</div></div><div><div style="font-size:10px;color:#667085">Total du bon</div><div style="font-size:17px;font-weight:900;color:#c62828;margin-top:4px">${money(order.total)} DH</div><div style="font-size:10px;color:#667085;margin-top:2px">الإجمالي للبون</div></div></div>`;

   const watermarkHtml = logoB64
     ? `<div style="position:absolute;top:55%;left:50%;transform:translate(-50%,-50%);width:620px;opacity:0.18;z-index:0;pointer-events:none;"><img src="${logoB64}" style="width:100%;height:auto;filter:none;"></div>`
     : `<div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-size:80px;font-weight:900;color:#ddd;opacity:0.15;z-index:0;pointer-events:none;white-space:nowrap;transform:translate(-50%,-50%) rotate(-30deg);">3D PEINTURES</div>`;

   root.innerHTML=`
     ${watermarkHtml}
     <div style="position:relative;z-index:1;">
       <div style="border-bottom:3px solid #12386f;padding-bottom:12px;margin-bottom:17px">
         <div style="font-size:13px;letter-spacing:3px;color:#b58a2a;font-weight:700">3D PEINTURES</div>
         <div style="font-size:25px;font-weight:800;margin-top:4px;letter-spacing:.2px">BON DE COMMANDE</div>
         <div style="font-size:11px;color:#667085;margin-top:5px">${date} à ${time}</div>
       </div>
       <div style="display:flex;justify-content:space-between;gap:16px;margin-bottom:17px;direction:ltr">
         <div style="flex:1;border:1px solid #ddd;border-radius:9px;padding:12px">
           <div style="color:#777;font-size:10px;letter-spacing:.5px">CLIENT</div>
           <div style="font-size:18px;font-weight:800;margin-top:5px">${esc(order.client)}</div>
           ${order.company?`<div style="margin-top:5px;font-size:11px"><b>Société :</b> ${esc(order.company)}</div>`:""}
           ${order.ice?`<div style="margin-top:4px;font-size:11px"><b>ICE :</b> ${esc(order.ice)}</div>`:""}
           ${order.paymentNumber?`<div style="margin-top:4px;font-size:11px"><b>N° chèque / cambiale :</b> ${esc(order.paymentNumber)}</div>`:""}
           ${order.paymentType?`<div style="margin-top:4px;font-size:11px"><b>Type de paiement :</b> ${esc(paymentTypeLabel(order.paymentType))}</div>`:""}
           ${order.phone?`<div style="margin-top:4px;font-size:11px"><b>Téléphone :</b> ${esc(order.phone)}</div>`:""}
         </div>
         <div style="width:180px;border:1px solid #ddd;border-radius:9px;padding:12px">
           <div style="color:#777;font-size:10px;letter-spacing:.5px">DATE</div>
           <div style="font-size:14px;font-weight:700;margin-top:5px">${date} · ${time}</div>
         </div>
       </div>
       <table style="width:100%;border-collapse:collapse;font-size:12px;direction:ltr">
         <thead>
           <tr style="background:#12386f;color:#fff">
             <th style="padding:8px;text-align:left">Désignation</th>
             <th style="padding:8px">Boîtes</th>
             <th style="padding:8px">Unités / boîte</th>
             <th style="padding:8px;text-align:right">Prix unitaire</th>
             <th style="padding:8px;text-align:right">Total</th>
           </tr>
         </thead>
         <tbody>${rows}</tbody>
       </table>
       ${isCodOrder?`<div style="margin:14px 0 0 auto;width:280px;border:1px solid #d9ad4d;border-radius:9px;padding:10px 12px;direction:ltr;background:#fffdf7"><div style="display:flex;justify-content:space-between;font-size:13px;font-weight:700;color:#172033"><span>Total produits</span><b>${money(productSubtotal)} DH</b></div><div style="font-size:10px;color:#667085;margin-top:3px;text-align:right">مجموع أثمان المنتجات</div></div>`:""}
       ${creditFooterHtml}
       ${isCodOrder?`<div style="margin-top:20px">${scheduleHtml}</div>`:""}
       <div style="margin-top:28px;text-align:center;color:#777;font-size:14px">Merci pour votre confiance · 3D PEINTURES</div>
     </div>`;

   document.body.appendChild(root);
   const canvas=await html2canvas(root,{scale:2,backgroundColor:"#ffffff",useCORS:true,logging:false});
   const {jsPDF}=window.jspdf;
   const pdf=new jsPDF({orientation:"p",unit:"mm",format:"a4"});
   const pageW=210,pageH=297,margin=8;
   const imgW=pageW-margin*2;
   const imgH=canvas.height*imgW/canvas.width;
   const pagePx=Math.floor(canvas.width*(pageH-margin*2)/imgH);
   let yPx=0, page=0;
   while(yPx<canvas.height){
     const sliceH=Math.min(pagePx,canvas.height-yPx);
     const slice=document.createElement("canvas"); slice.width=canvas.width; slice.height=sliceH;
     slice.getContext("2d").drawImage(canvas,0,yPx,canvas.width,sliceH,0,0,canvas.width,sliceH);
     if(page>0) pdf.addPage();
     pdf.addImage(slice.toDataURL("image/jpeg",.92),"JPEG",margin,margin,imgW,sliceH*imgW/canvas.width);
     yPx+=sliceH; page++;
   }
   document.body.removeChild(root);
   return {blob:pdf.output("blob"),name:`Bon_Commande_${String(order.client).replace(/[^a-z0-9_-]+/gi,"_")}_${date.replaceAll("/","-")}.pdf`};
 }catch(err){console.error(err); return null;}
}
async function createInvoiceRequestPDF(order){
 try{
   if(!window.html2canvas || !window.jspdf) throw new Error("PDF libraries unavailable");
   let logoB64="";
   try{
     const r=await fetch("https://www.dropbox.com/scl/fi/g6bef6j1a3gtse98o9ktp/Picsart_26-08-12_00-00-35-616.png?rlkey=z5wm1262vccogra8t9n71stei&st=5lq7g02n&raw=1");
     const blob=await r.blob();
     logoB64=await new Promise(resolve=>{const fr=new FileReader();fr.onload=e=>resolve(e.target.result);fr.readAsDataURL(blob)});
   }catch(e){console.warn("Logo invoice request load failed",e)}
   const clientObj=clients.find(c=>String(c.name||"").trim().toLowerCase()===String(order.client||"").trim().toLowerCase())||{};
   const company=order.company||clientObj.company||"";
   const ice=order.ice||clientObj.ice||"";
   const paymentName=order.paymentName||clientObj.paymentName||clientObj.chequeName||"";
   const d=new Date(order.date);
   const date=d.toLocaleDateString("fr-FR",{day:"2-digit",month:"2-digit",year:"numeric"});
   const time=d.toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"});
   const scheduleState=deadlineState(order);
   const scheduleHtml=paymentScheduleHtml(order,scheduleState);
   const rows=(order.items||[]).map(row=>{
     const p=products.find(x=>x.id===row.id)||{};
     const boxes=Number(row.qty)||0;
     const units=Number(row.units??p.qty)||0;
     const unitPrice=Number(row.unitPrice??p.price)||0;
     const paidUnits=Number(row.paidUnits??(boxes*units))||0;
     const freeUnits=Number(row.freeUnits??(hasPromo10Plus1(p)?Math.floor(paidUnits/10):0))||0;
     const delivered=paidUnits+freeUnits;
     const line=Number(row.lineTotal??(unitPrice*paidUnits))||0;
     return `<tr><td style="padding:11px;border-bottom:1px solid #e6e8ed;text-align:left"><b>${esc(row.name||p.name||"Produit")}</b>${freeUnits?`<div style="margin-top:4px;color:#ad7b16;font-size:11px;font-weight:700">10 + 1 Gratuit · livré ${delivered} pièces</div>`:""}</td><td style="padding:11px;border-bottom:1px solid #e6e8ed;text-align:center">${boxes}</td><td style="padding:11px;border-bottom:1px solid #e6e8ed;text-align:center">${units}</td><td style="padding:11px;border-bottom:1px solid #e6e8ed;text-align:right">${money(unitPrice)} DH</td><td style="padding:11px;border-bottom:1px solid #e6e8ed;text-align:right;font-weight:800">${money(line)} DH</td></tr>`;
   }).join("");
   const watermark=logoB64?`<div style="position:absolute;top:57%;left:50%;transform:translate(-50%,-50%);width:520px;opacity:.10;z-index:0"><img src="${logoB64}" style="width:100%;height:auto"></div>`:"";
   const root=document.createElement("div");
   root.dir="ltr";
   root.style.cssText="position:fixed;left:-10000px;top:0;width:760px;background:#fff;color:#172033;padding:42px;font-family:Arial,sans-serif;z-index:-1;box-sizing:border-box";
   root.innerHTML=`${watermark}<div style="position:relative;z-index:1">
     <div style="border-bottom:4px solid #c49a38;padding-bottom:18px;margin-bottom:24px">
       <div style="font-size:16px;letter-spacing:4px;color:#b58a2a;font-weight:700">3D PEINTURES</div>
       <div style="font-size:32px;font-weight:800;margin-top:6px">DEMANDE DE FACTURE</div>
       <div style="font-size:14px;color:#667085;margin-top:8px">Date de la demande : ${date} · ${time}</div>
     </div>
     <div style="border:1px solid #dfe3e8;border-radius:13px;padding:18px;margin-bottom:22px;background:#fffdf7">
       <div style="font-size:14px;color:#9a6b12;font-weight:800;margin-bottom:12px">INFORMATIONS DE FACTURATION</div>
       <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;font-size:15px">
         <div><span style="color:#667085">Nom du client</span><br><b>${esc(order.client||"—")}</b></div>
         <div><span style="color:#667085">Société</span><br><b>${esc(company||"—")}</b></div>
         <div><span style="color:#667085">ICE</span><br><b>${esc(ice||"—")}</b></div>
         <div><span style="color:#667085">Nom du chèque / cambiale</span><br><b>${esc(paymentName||"—")}</b></div>
       </div>
     </div>
     <div style="margin:0 0 22px">${scheduleHtml}</div>
     <div style="font-size:16px;font-weight:800;margin:0 0 9px">DÉTAIL DE LA COMMANDE</div>
     <table style="width:100%;border-collapse:collapse;font-size:14px;direction:ltr">
       <thead><tr style="background:#172f57;color:#fff"><th style="padding:11px;text-align:left">Désignation</th><th style="padding:11px">Boîtes</th><th style="padding:11px">Unités / boîte</th><th style="padding:11px;text-align:right">Prix unitaire</th><th style="padding:11px;text-align:right">Total</th></tr></thead>
       <tbody>${rows||`<tr><td colspan="5" style="padding:18px;text-align:center;color:#667085">Aucun produit</td></tr>`}</tbody>
     </table>
     <div style="margin-top:24px;margin-left:auto;width:330px;border:2px solid #c49a38;border-radius:13px;padding:16px"><div style="display:flex;justify-content:space-between;font-size:21px;font-weight:900"><span>Total commande</span><span>${money(order.total)} DH</span></div></div>
     <div style="margin-top:30px;padding:16px;border-left:4px solid #c49a38;background:#fff9e9;font-size:16px;line-height:1.55">Nous vous prions de bien vouloir établir la facture correspondante à cette commande avec les informations de facturation indiquées ci-dessus.</div>
     <div style="margin-top:32px;text-align:center;color:#667085;font-size:13px">Merci pour votre collaboration · 3D PEINTURES</div>
   </div>`;
   document.body.appendChild(root);
   const canvas=await html2canvas(root,{scale:2,backgroundColor:"#ffffff",useCORS:true,logging:false});
   const {jsPDF}=window.jspdf;
   const pdf=new jsPDF({orientation:"p",unit:"mm",format:"a4"});
   const pageW=210,pageH=297,margin=8,imgW=pageW-margin*2,imgH=canvas.height*imgW/canvas.width,pagePx=Math.floor(canvas.width*(pageH-margin*2)/imgH);
   let yPx=0,page=0;
   while(yPx<canvas.height){const sliceH=Math.min(pagePx,canvas.height-yPx);const slice=document.createElement("canvas");slice.width=canvas.width;slice.height=sliceH;slice.getContext("2d").drawImage(canvas,0,yPx,canvas.width,sliceH,0,0,canvas.width,sliceH);if(page>0)pdf.addPage();pdf.addImage(slice.toDataURL("image/jpeg",.92),"JPEG",margin,margin,imgW,sliceH*imgW/canvas.width);yPx+=sliceH;page++}
   document.body.removeChild(root);
   return {blob:pdf.output("blob"),name:`Demande_Facture_${String(order.client||"Client").replace(/[^a-z0-9_-]+/gi,"_")}_${date.replaceAll("/","-")}.pdf`};
 }catch(err){console.error(err);return null}
}
async function shareInvoiceRequestPDF(order){
 const result=await createInvoiceRequestPDF(order);
 if(!result){toast("تعذر إنشاء ملف طلب الفاتورة");return}
 const file=new File([result.blob],result.name,{type:"application/pdf"});
 if(navigator.share&&(!navigator.canShare||navigator.canShare({files:[file]}))){
   try{await navigator.share({title:"Demande de facture — "+(order.client||"Client"),text:"طلب فاتورة للشركة",files:[file]});toast("تم تجهيز ملف طلب الفاتورة");return}catch(e){if(e?.name==="AbortError")return}
 }
 const url=URL.createObjectURL(file);const a=document.createElement("a");a.href=url;a.download=result.name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),3000);toast("تم تحميل ملف طلب الفاتورة PDF");
}
 async function shareOrderPDF(order){
 const scheduleText=paymentScheduleText(order);
 const nativePayload={
   id:order.id,date:order.date,client:order.client,company:order.company||"",
   ice:order.ice||"",paymentNumber:order.paymentNumber||"",paymentType:paymentTypeValue(order.paymentType),phone:order.phone||"",whatsapp:order.phone||"",total:Number(order.total||0),
   paid:paymentTotal(order),due:Math.max(0,Number(order.total||0)-paymentTotal(order)),status:order.status||"unpaid",payments:getPaymentHistory(order).map(p=>({amount:Number(p.amount)||0,date:p.date,type:p.type||""})),
   note:scheduleText,paymentTermDays:Number(order.paymentTermDays)||0,paymentTermMode:order.paymentTermMode||"days",paymentTermMinutes:Number(order.paymentTermMinutes)||null,dueDate:order.dueDate||"",
    items:order.items.map(row=>{
      const p=products.find(x=>x.id===row.id)||{};
      const boxes=Number(row.qty)||0, units=Number(row.units ?? p.qty)||0;
      const unitPrice=Number(row.unitPrice ?? p.price)||0;
      const paidUnits=Number(row.paidUnits ?? (boxes*units))||0;
      const freeUnits=Number(row.freeUnits ?? (hasPromo10Plus1(p)?Math.floor(paidUnits/10):0))||0;
      return {name:row.name||p.name||"",boxes,units,paidUnits,freeUnits,deliveredUnits:paidUnits+freeUnits,unitPrice,lineTotal:Number(row.lineTotal ?? (unitPrice*paidUnits))||0,promotion:freeUnits>0?"10 + 1 Gratuit":""};
    })
 };
 // Android native PDF: works offline inside the APK and shares the real PDF file.
 if(window.Android && typeof window.Android.createOrderPdf==="function"){
   try{
     window.Android.createOrderPdf(JSON.stringify(nativePayload));
     toast("تم تسجيل الكوموند — جاري إنشاء Bon de commande PDF…");
     return;
   }catch(err){ console.error("Native PDF error",err); }
 }
 // Web fallback: generate PDF then share / open WhatsApp
 const result=await createOrderPDF(order);
 if(result){
   const file=new File([result.blob],result.name,{type:"application/pdf"});
   // 1. Try native share sheet (Android/iOS — user can pick WhatsApp)
   if(navigator.share && (!navigator.canShare || navigator.canShare({files:[file]}))){
     try{ await navigator.share({title:"Bon de commande — "+order.client, files:[file]}); return; }
     catch(e){ if(e&&e.name==="AbortError") return; }
   }
   // 2. Fallback: download PDF then open WhatsApp with order summary
   const url=URL.createObjectURL(result.blob);
   const a=document.createElement("a"); a.href=url; a.download=result.name; a.click();
   setTimeout(()=>URL.revokeObjectURL(url),8000);
   // Build WhatsApp message with order summary
   const phone=order.phone?String(order.phone).replace(/\D/g,""):"";
   const lines=["🧾 *BON DE COMMANDE — 3D PEINTURES*","","👤 Client : "+order.client];
   if(order.company) lines.push("🏢 Société : "+order.company);
   if(order.ice)     lines.push("📋 ICE : "+order.ice);
   lines.push("");
   (order.items||[]).forEach(it=>{
      const p=products.find(x=>x.id===(it.id||""))||{name:it.name||"",price:it.unitPrice||0,qty:it.units||0};
      const boxes=Number(it.qty||it.boxes||0), units=Number(it.units||p.qty||0), price=Number(it.unitPrice||p.price||0);
      const paidUnits=Number(it.paidUnits ?? (boxes*units))||0;
      const freeUnits=Number(it.freeUnits)||0;
      const deliveredUnits=paidUnits+freeUnits;
      const total=paidUnits*price;
      lines.push(`🔹 ${p.name||it.name} — ${boxes} boîte(s) × ${paidUnits} pièces payées = *${money(total)} DH*`);
      if(freeUnits>0) lines.push(`🎁 Offre 10 + 1 : +${freeUnits} pièce(s) gratuite(s) · total livré : ${deliveredUnits} pièces`);
   });
   if(order.paymentType) lines.push("💳 Type de paiement : "+paymentTypeLabel(order.paymentType));
   lines.push("","💰 *Total Payé : "+money(order.total)+" DH*","",...scheduleText.split("\n"));
   const msg=encodeURIComponent(lines.join("\n"));
   const waUrl=phone ? `https://wa.me/${phone}?text=${msg}` : `https://wa.me/?text=${msg}`;
   setTimeout(()=>window.open(waUrl,"_blank"),600);
   toast("PDF téléchargé — ouverture WhatsApp…");
   return;
 }
 toast("Impossible de créer le PDF. Vérifiez la connexion.");
}
async function saveOrder(e){
 e.preventDefault();
 const x=orderCartSummary();
 const client=$("orderClient").value.trim();
 if(!client){toast("دخل اسم الكليان");return}
 const clientObj=clients.find(c=>String(c.name||"").trim().toLowerCase()===client.toLowerCase())||{};
 const orderDate=new Date();
 const selectedTermValue=String($("orderPaymentTerm").value||"15");
 const isCodTerm=selectedTermValue==="cod";
 const isTestTerm=selectedTermValue==="test_1m";
 const selectedTerm=isCodTerm?0:(isTestTerm?0.0006944444444444445:([15,30].includes(Number(selectedTermValue))?Number(selectedTermValue):15));
 const fallbackTermNote=isCodTerm?"إستخلاص عند الإستلام / Paiement à la livraison":isTestTerm?"تجربة دقيقة واحدة / Test 1 minute":`مدة الاستخلاص: ${selectedTerm} يوماً / Durée de règlement : ${selectedTerm} jours`;
 const order={
   id:makeId(),date:orderDate.toISOString(),client,
   company:clientObj.company||clientObj.societe||"",
   ice:clientObj.ice||"",paymentHolder:clientObj.paymentHolder||clientObj.chequeHolder||clientObj.paymentName||clientObj.chequeName||"",paymentNumber:$('orderPaymentNumber').value.trim()||clientObj.paymentNumber||clientObj.chequeNumber||"",paymentType:paymentTypeValue($("orderPaymentType")?.value||clientObj.paymentType||clientObj.paymentMode||clientObj.modePaiement),phone:clientObj.phone||"",
   total:x.total,paid:0,due:x.total,profit:x.profit,
   paymentTermDays:isCodTerm||isTestTerm?0:selectedTerm,paymentTermMode:isCodTerm?"cod":(isTestTerm?"test_1m":"days"),paymentTermMinutes:isTestTerm?1:null,dueDate:isCodTerm?"":new Date(orderDate.getTime()+selectedTerm*86400000).toISOString(),
   status:"unpaid",payments:[],note:$('orderNote').value.trim() || fallbackTermNote,
   items:cart.map(row=>{
     const p=products.find(x=>x.id===row.id)||{};
       const boxes=Number(row.qty)||0, units=Number(p.qty)||0, unitPrice=Number(p.price)||0;
       const promo=promoForBoxes(p,boxes);
       return {
         id:row.id, qty:boxes,
         name:p.name||"",
         units,
         paidUnits:promo.paidUnits,
         freeUnits:promo.freeUnits,
         deliveredUnits:promo.deliveredUnits,
         promotion:promo.freeUnits>0?"10 + 1 Gratuit":"",
         unitPrice,
         lineTotal:unitPrice*promo.paidUnits
       };
   })
 };
 orders.unshift(order);
 localStorage.setItem("3d_peintures_orders_v1",JSON.stringify(orders));
 renderSalesForecast();
 cart=[];saveCart();closeOrderModal();
 toast("تسجلت الكوموند — جاري تجهيز Bon de commande PDF…");
 await shareOrderPDF(order);
}
let activePaymentOrderId="";
function getPaymentHistory(order){
 const history=Array.isArray(order?.payments)?order.payments.filter(p=>Number(p?.amount)>0):[];
 if(history.length)return history;
 const legacy=Number(order?.paid)||0;
 if(legacy>0)return [{id:"legacy",amount:legacy,date:order.updatedAt||order.date,legacy:true}];
 return [];
}
function paymentTotal(order){return getPaymentHistory(order).reduce((sum,p)=>sum+(Number(p.amount)||0),0)}
function recalculateOrderPaymentState(order){
 const paid=paymentTotal(order);
 order.paid=paid;
 order.due=Math.max(0,Number(order.total||0)-paid);
 order.status=order.due<=0.000001?"paid":paid>0?"partial":"unpaid";
 return {paid:order.paid,due:order.due};
}
function formatPaymentDate(value){
 const d=new Date(value); if(Number.isNaN(d.getTime()))return "—";
 return `${d.toLocaleDateString("fr-FR",{day:"2-digit",month:"2-digit",year:"numeric"})} · ${d.toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit",second:"2-digit"})}`;
}
function updatePaymentPreview(){
 const order=orders.find(o=>String(o.id)===String(activePaymentOrderId)); if(!order)return;
 const before=Math.max(0,Number(order.total||0)-paymentTotal(order));
 const entered=Math.max(0,Number(String($("paymentAmount")?.value||0).replace(",","."))||0);
 const accepted=Math.min(entered,before);
 $("paymentBeforeDue").textContent=money(before)+" DH";
 $("paymentAfterTotal").textContent=money(paymentTotal(order)+accepted)+" DH";
 $("paymentAfterDue").textContent=money(Math.max(0,before-accepted))+" DH";
}
function paymentCustomerSummary(order,amount){
 const total=Number(order.total||0);
 const before=Math.max(0,total-paymentTotal(order));
 const accepted=Math.min(Math.max(0,Number(amount)||0),before);
 const due=Math.max(0,before-accepted);
 const state=deadlineState(order);
 const dueDate=state.termKey==="cod"?"عند الاستلام":(state.dueDate?state.dueDate.toLocaleDateString("fr-FR",{day:"2-digit",month:"2-digit",year:"numeric"}):"—");
 return {total,before,accepted,due,dueDate};
}
function buildPaymentCustomerMessage(order,amount){
 const data=paymentCustomerSummary(order,amount);
 return [`ملخص أداء القسط`,`الزبون: ${order.client||"—"}`,`الإجمالي للبون: ${money(data.total)} DH`,`تاريخ آخر أجل للاستخلاص: ${data.dueDate}`,`مبلغ القسط: ${money(data.accepted)} DH`,`الباقي بعد الأداء: ${money(data.due)} DH`,`شكراً لكم.`].join("\n");
}
async function sharePaymentSummaryWithCustomer(){
 const order=orders.find(o=>String(o.id)===String(activePaymentOrderId));if(!order)return;
 const amount=Number(String($("paymentAmount")?.value||"").replace(",","."));
 const before=Math.max(0,Number(order.total||0)-paymentTotal(order));
 if(!Number.isFinite(amount)||amount<=0){alert("دخل مبلغ القسط أولاً.");$("paymentAmount")?.focus();return}
 if(amount>before+0.000001){alert(`المبلغ أكبر من الباقي: ${money(before)} DH`);return}
 const text=buildPaymentCustomerMessage(order,amount);
 const encoded=encodeURIComponent(text);
 const rawPhone=String(order.phone||"").replace(/\D/g,"");
 const waPhone=rawPhone.startsWith("0")?`212${rawPhone.slice(1)}`:rawPhone;
 const wa=waPhone?`https://wa.me/${waPhone}?text=${encoded}`:`https://wa.me/?text=${encoded}`;
 try{if(navigator.share){await navigator.share({title:"ملخص أداء القسط",text});toast("تم تجهيز ملخص القسط للزبون");return}}catch(e){}
 window.open(wa,"_blank");toast("تم تجهيز رسالة ملخص القسط");
}
function openPaymentModal(orderId){
 const order=orders.find(o=>String(o.id)===String(orderId)); if(!order)return;
 recalculateOrderPaymentState(order);
 const remaining=Math.max(0,Number(order.total||0)-paymentTotal(order));
 if(remaining<=0){toast("هاد الكوموند مخلصة كاملة");return}
 activePaymentOrderId=order.id;
 $("paymentContext").textContent=`${order.client||"Client"} · Total ${money(order.total)} DH`;
 $("paymentNow").textContent=formatPaymentDate(new Date());
 $("paymentAmount").value="";
 $("paymentAmount").max=String(remaining);
 updatePaymentPreview();
 $("paymentModal").classList.add("show");
 setTimeout(()=>$("paymentAmount")?.focus(),80);
}
function closePaymentModal(){activePaymentOrderId="";$("paymentModal").classList.remove("show")}
function addPayment(orderId){openPaymentModal(orderId)}
function savePaymentForm(e){
 e.preventDefault();
 const order=orders.find(o=>String(o.id)===String(activePaymentOrderId)); if(!order)return;
 const amount=Number(String($("paymentAmount").value||"").replace(",","."));
 const remaining=Math.max(0,Number(order.total||0)-paymentTotal(order));
 if(!Number.isFinite(amount)||amount<=0){alert("دخل مبلغ صحيح.");return}
 if(amount>remaining+0.000001){alert(`المبلغ أكبر من الباقي: ${money(remaining)} DH`);return}
 if(!Array.isArray(order.payments)){
   order.payments=[];
   const legacy=Number(order.paid)||0;
   if(legacy>0)order.payments.push({id:"legacy",amount:legacy,date:order.updatedAt||order.date,legacy:true});
 }
 order.payments.push({id:makeId(),amount,date:new Date().toISOString(),type:order.paymentType||"cheque"});
 recalculateOrderPaymentState(order);
 order.updatedAt=new Date().toISOString();
 localStorage.setItem("3d_peintures_orders_v1",JSON.stringify(orders));
 const orderId=order.id;
 closePaymentModal();
 renderOrders();
 if($("orderDetailModal")?.classList.contains("show"))openOrderDetail(orderId);
 toast(order.due<=0.000001?"الكوموند تخلصات كاملة":`تسجل القسط: ${money(amount)} DH`);
}
function ensureOrderDeadline(order){
 const mode=String(order?.paymentTermMode||"");
 const isCodTerm=mode==="cod";
 const isTestTerm=mode==="test_1m";
 const term=isCodTerm||isTestTerm?0:(Number(order?.paymentTermDays)===30?30:15);
 const durationMs=isTestTerm?Math.max(1,Number(order?.paymentTermMinutes)||1)*60000:term*86400000;
 const base=new Date(order?.date||Date.now());
 if(!isCodTerm&&(!order.dueDate||Number.isNaN(new Date(order.dueDate).getTime())))order.dueDate=new Date(base.getTime()+durationMs).toISOString();
 if(isCodTerm)order.dueDate="";
 order.paymentTermDays=term;
 if(isTestTerm){order.paymentTermMode="test_1m";order.paymentTermMinutes=Math.max(1,Number(order?.paymentTermMinutes)||1)}
 else if(isCodTerm){order.paymentTermMode="cod";order.paymentTermMinutes=null}
 else {order.paymentTermMode="days";order.paymentTermMinutes=null}
 return order;
}
function deadlineState(order){
 ensureOrderDeadline(order);
 const isCodTerm=order.paymentTermMode==="cod";
 const isTestTerm=order.paymentTermMode==="test_1m";
 const dueDate=isCodTerm?null:new Date(order.dueDate);
 const due=paymentTotal(order);
 const remaining=Math.max(0,Number(order.total||0)-due);
 const ms=dueDate?dueDate.getTime()-Date.now():0;
 return {dueDate,remaining,daysLeft:isCodTerm?0:Math.ceil(ms/86400000),minutesLeft:isCodTerm?0:Math.ceil(ms/60000),overdue:!isCodTerm&&ms<0&&remaining>0,term:isCodTerm?"عند الاستلام":(isTestTerm?"تجريبي":order.paymentTermDays),termKey:isCodTerm?"cod":(isTestTerm?"test_1m":"days")};
}
function deadlineText(state){
 const date=state.dueDate?state.dueDate.toLocaleDateString("fr-FR",{day:"2-digit",month:"2-digit",year:"numeric"}):"—";
 if(state.termKey==="cod")return "إستخلاص عند الإستلام / Paiement à la livraison";
 if(state.overdue)return state.termKey==="test_1m"?`انتهت مدة التجربة في ${date}`:`انتهت مدة الاستخلاص في ${date}`;
 if(state.termKey==="test_1m")return `تجربة · الاستحقاق بعد ${Math.max(1,state.minutesLeft)} دقيقة`;
 if(state.daysLeft<=0)return `تاريخ الاستحقاق اليوم · ${date}`;
 return `أجل ${state.term} يوم / ${state.term} jours · الاستحقاق ${date}`;
}
function collectionTerms(order,state=deadlineState(order)){
 const date=state.dueDate?state.dueDate.toLocaleDateString("fr-FR",{day:"2-digit",month:"2-digit",year:"numeric"}):"—";
 if(state.termKey==="cod")return {redText:"إستخلاص عند الإستلام / Paiement à la livraison",dateText:"تاريخ الاستخلاص: عند الاستلام / Date de règlement : à la livraison"};
 if(state.termKey==="test_1m")return {redText:"مدة الاستخلاص: تجربة دقيقة واحدة / Durée de règlement : test 1 minute",dateText:`تاريخ الاستخلاص: ${date} / Date de règlement : ${date}`};
 return {redText:`مدة الاستخلاص: ${state.term} يوماً / Durée de règlement : ${state.term} jours`,dateText:`تاريخ الاستخلاص: ${date} / Date de règlement : ${date}`};
}
function overdueReminderRows(){
 return orders.map(order=>{recalculateOrderPaymentState(order);const state=deadlineState(order);return {order,state,due:Math.max(0,Number(order.total||0)-paymentTotal(order))};}).filter(row=>row.due>0&&row.state.overdue).sort((a,b)=>new Date(a.state.dueDate)-new Date(b.state.dueDate));
}
function dueReminderTotal(rows){return rows.reduce((sum,row)=>sum+row.due,0)}
function buildDueReminderText(rows,total){
 const now=new Date();
 const date=now.toLocaleDateString("fr-FR",{day:"2-digit",month:"2-digit",year:"numeric"});
 const lines=[
  "رسالة من مسؤول الحسابات بالشركة — MESSAGE DU RESPONSABLE COMPTABLE",
  `التاريخ / Date : ${date}`,
  "",
  "زبناؤنا الكرام،",
  `هذا تذكير صادر عن مسؤول الحسابات بالشركة بخصوص مجموع المبالغ المتبقية في الكوموندات التي تجاوزت آخر أجل للاستخلاص، وقيمته ${money(total)} DH. المرجو تسوية المبلغ خلال الزيارة القادمة. ستجدون أسفله كشفاً دقيقاً لكل كوموند ولكل دفعة مسجلة.`,
  "",
  "Chers clients,",
  `Ce message est un rappel envoyé par le responsable comptable de la société concernant les soldes des commandes ayant dépassé leur date limite de règlement, pour un montant total de ${money(total)} DH. Nous vous remercions de régulariser ce montant lors de notre prochaine visite. Vous trouverez ci-dessous le détail précis de chaque commande et de chaque paiement enregistré.`,
  "",
  "━━━━━━━━━━━━━━━━━━━━━━━━",
  "تفاصيل الكوموند والدفعات / DÉTAILS DES COMMANDES ET PAIEMENTS",
  "━━━━━━━━━━━━━━━━━━━━━━━━"
 ];
 rows.forEach((row,index)=>{
  const order=row.order||{};
  recalculateOrderPaymentState(order);
  const dueOrder=Math.max(0,Number(order.total||0)-paymentTotal(order));
  const expiredDate=row.state.dueDate.toLocaleDateString("fr-FR",{day:"2-digit",month:"2-digit",year:"numeric"});
  lines.push("",`الزبون / Client : ${order.client||"Client"}`);
  lines.push(`الباقي / Reste à payer : ${money(dueOrder)} DH`);
  lines.push(`تاريخ انتهاء أجل الاستحقاق / Date d'échéance expirée : ${expiredDate}`);
 });
  lines.push("","━━━━━━━━━━━━━━━━━━━━━━━━",`المجموع النهائي المتبقي / TOTAL GÉNÉRAL À RÉGLER : ${money(total)} DH`,"━━━━━━━━━━━━━━━━━━━━━━━━","","هذا تذكير من مسؤول الحسابات بالشركة، وشكراً لتعاونكم.","Ce message est un rappel du responsable comptable de la société. Merci pour votre collaboration.","","مسؤول الحسابات بالشركة / Le responsable comptable de la société","3D PEINTURES");
 return lines.join("\n");
}
async function createDueReminderPDF(rows=overdueReminderRows()){
 try{
  if(!rows.length){toast("لا توجد كوموندات تجاوزت أجل الاستخلاص");return null}
  if(!window.html2canvas||!window.jspdf)throw new Error("PDF libraries unavailable");
  const total=dueReminderTotal(rows), message=buildDueReminderText(rows,total), now=new Date();
  const date=now.toLocaleDateString("fr-FR",{day:"2-digit",month:"2-digit",year:"numeric"});
  let logoB64="";
  try{
   const r=await fetch("https://www.dropbox.com/scl/fi/g6bef6j1a3gtse98o9ktp/Picsart_26-08-12_00-00-35-616.png?rlkey=z5wm1262vccogra8t9n71stei&st=5lq7g02n&raw=1");
   const blob=await r.blob();
   logoB64=await new Promise(resolve=>{const fr=new FileReader();fr.onload=e=>resolve(e.target.result);fr.onerror=()=>resolve("");fr.readAsDataURL(blob)});
  }catch(err){console.warn("Logo reminder load failed",err)}
  const root=document.createElement("div");
  root.dir="ltr";
  root.style.cssText="position:fixed;left:-10000px;top:0;width:760px;background:#fff;color:#172033;padding:42px;font-family:Arial,'Noto Naskh Arabic',sans-serif;z-index:-1;box-sizing:border-box";
  const detailRows=rows.map(row=>{
   const expiredDate=row.state.dueDate.toLocaleDateString("fr-FR",{day:"2-digit",month:"2-digit",year:"numeric"});
   const due=Math.max(0,Number(row.order.total||0)-paymentTotal(row.order));
   return `<tr><td style="padding:9px;border-bottom:1px solid #eadfc2;text-align:left;vertical-align:top"><b style="font-size:12px;color:#d00000">${esc(row.order.client||"Client")}</b></td><td style="padding:9px;border-bottom:1px solid #eadfc2;text-align:right;vertical-align:top;color:#d00000;font-size:12px;font-weight:400">الباقي / Reste à payer : ${money(due)} DH<br>تاريخ انتهاء أجل الاستحقاق / Date d'échéance expirée : ${expiredDate}</td></tr>`;
  }).join("");
  const watermark=logoB64?`<div style="position:absolute;top:55%;left:50%;transform:translate(-50%,-50%);width:560px;opacity:.08;z-index:0"><img src="${logoB64}" style="width:100%;height:auto"></div>`:"";
  root.innerHTML=`${watermark}<div style="position:relative;z-index:1">
   <div style="border-bottom:4px solid #12386f;padding-bottom:18px;margin-bottom:24px;display:flex;justify-content:space-between;gap:20px;align-items:flex-start">
    <div><div style="font-size:16px;letter-spacing:4px;color:#b58a2a;font-weight:700">3D PEINTURES</div><div style="font-size:30px;font-weight:900;margin-top:6px">RAPPEL DE RÈGLEMENT</div><div style="font-size:14px;color:#667085;margin-top:7px">${date}</div></div>
    <div style="text-align:right;direction:rtl;font-size:14px;color:#667085;line-height:1.65"><b style="color:#12386f;font-size:18px">رسالة من مسؤول الحسابات</b><br>مسؤول الحسابات بالشركة</div>
   </div>
   <div style="border:1px solid #dfe3e8;border-radius:14px;padding:20px;background:#fffdf7;margin-bottom:22px;line-height:1.7">
    <div style="direction:rtl;text-align:right;font-size:17px;font-weight:700">زبناؤنا الكرام،</div>
    <div style="direction:rtl;text-align:right;margin-top:7px;font-size:15px">هذا تذكير صادر عن مسؤول الحسابات بالشركة بخصوص مجموع المبالغ المتبقية التي تجاوزت آخر أجل للاستخلاص، وقيمتها <b style="color:#b42318">${money(total)} DH</b>. المرجو تسوية المبلغ خلال الزيارة القادمة.</div>
    <div style="border-top:1px solid #eadfc2;margin:15px 0"></div>
    <div style="font-size:17px;font-weight:700">Chers clients,</div>
    <div style="margin-top:7px;font-size:15px">Ce message est un rappel envoyé par le responsable comptable de la société concernant le total des soldes ayant dépassé leur date limite de règlement, soit <b style="color:#b42318">${money(total)} DH</b>. Nous vous remercions de régulariser ce montant lors de notre prochaine visite.</div>
   </div>
   <div style="font-size:17px;font-weight:900;color:#12386f;margin-bottom:9px">DÉTAILS DES SOLDES · تفاصيل المبالغ المتبقية</div>
   <table style="width:100%;border-collapse:collapse;font-size:13px;direction:ltr"><thead><tr style="background:#12386f;color:#fff"><th style="padding:9px;text-align:left">Client / الزبون</th><th style="padding:9px;text-align:right">الباقي وتاريخ انتهاء الأجل / Reste et échéance expirée</th></tr></thead><tbody>${detailRows}</tbody></table>
   <div style="margin:24px 0 0 auto;width:330px;border:2px solid #b58a2a;border-radius:14px;padding:16px;background:#fffdf7"><div style="font-size:14px;color:#667085">TOTAL À RÉGLER · مجموع الباقي</div><div style="font-size:28px;font-weight:900;color:#b42318;margin-top:7px;text-align:right">${money(total)} DH</div></div>
   <div style="margin-top:28px;text-align:center;color:#667085;font-size:13px;line-height:1.6">هذا تذكير من مسؤول الحسابات بالشركة.<br>Ce message est un rappel du responsable comptable de la société.</div>
   <div style="margin-top:18px;text-align:center;font-weight:900;color:#12386f;font-size:15px">مسؤول الحسابات بالشركة · Le responsable comptable de la société</div>
  </div>`;
  document.body.appendChild(root);
  const canvas=await html2canvas(root,{scale:2,backgroundColor:"#ffffff",useCORS:true,logging:false});
  const {jsPDF}=window.jspdf;
  const pdf=new jsPDF({orientation:"p",unit:"mm",format:"a4"});
  const pageW=210,pageH=297,margin=8,imgW=pageW-margin*2,imgH=canvas.height*imgW/canvas.width,pagePx=Math.floor(canvas.width*(pageH-margin*2)/imgH);
  let yPx=0,page=0;
  while(yPx<canvas.height){const sliceH=Math.min(pagePx,canvas.height-yPx);const slice=document.createElement("canvas");slice.width=canvas.width;slice.height=sliceH;slice.getContext("2d").drawImage(canvas,0,yPx,canvas.width,sliceH,0,0,canvas.width,sliceH);if(page>0)pdf.addPage();pdf.addImage(slice.toDataURL("image/jpeg",.92),"JPEG",margin,margin,imgW,sliceH*imgW/canvas.width);yPx+=sliceH;page++}
  const safeDate=date.replaceAll("/","-");
  return {blob:pdf.output("blob"),name:`Rappel_Echeances_3D_PEINTURES_${safeDate}.pdf`,message,total,count:rows.length};
 }catch(err){console.error(err);toast("تعذر إنشاء ملف PDF للتذكير");return null}
 finally{const root=document.querySelector('body > div[style*="left: -10000px"]');if(root)root.remove()}
}
function downloadBlob(blob,name){const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),4000)}
async function shareDueReminderPDF(){
 const rows=overdueReminderRows();if(!rows.length){toast("لا توجد كوموندات تجاوزت أجل الاستخلاص");return}
 const waWindow=window.open("about:blank","_blank");
 const result=await createDueReminderPDF(rows);if(!result){waWindow?.close();return}
 const file=new File([result.blob],result.name,{type:"application/pdf"});
 const whatsappText=`${result.message}\n\nPDF : ${result.name}`;
 try{
  if(navigator.share&&navigator.canShare&&navigator.canShare({files:[file]})){await navigator.share({title:"Rappel de règlement — 3D PEINTURES",text:result.message,files:[file]});waWindow?.close();toast("تم تجهيز PDF وفتحت نافذة المشاركة");return}
 }catch(err){console.warn("Native share cancelled or unavailable",err)}
 downloadBlob(result.blob,result.name);
 const url=`https://wa.me/?text=${encodeURIComponent(whatsappText)}`;
 if(waWindow&&!waWindow.closed)waWindow.location.href=url;else window.open(url,"_blank");
 toast("تم تحميل PDF وفتح واتساب برسالة التذكير");
}
function renderDueAlerts(){
 const bar=$("dueAlertBar"); if(!bar)return;
  const alerts=orders.map(order=>({order,state:deadlineState(order)})).filter(x=>x.state.termKey!=="cod"&&x.state.remaining>0&&(x.state.overdue||x.state.daysLeft<=3)).sort((a,b)=>Number(b.state.overdue)-Number(a.state.overdue)||a.state.daysLeft-b.state.daysLeft);
 if(!alerts.length){bar.hidden=true;bar.className="due-alert-bar";bar.innerHTML="";return}
 const expired=alerts.some(x=>x.state.overdue);
 const first=alerts[0];
 const overdueRows=expired?overdueReminderRows():[];
 const overdueTotal=dueReminderTotal(overdueRows);
 bar.hidden=false;
 bar.className=`due-alert-bar ${expired?"expired":"warning"}`;
 bar.innerHTML=`<div><strong>${expired?"تنبيه: انتهت مدة استخلاص بون":"تذكير باقتراب موعد الاستخلاص"}</strong><small>${expired?`${overdueRows.length} بون(ات) تجاوزت الأجل · مجموع الباقي ${money(overdueTotal)} DH`: `${alerts.length} بون(ات) قريبة من تاريخ الاستحقاق`} · ${esc(first.order.client||"Client")} · ${deadlineText(first.state)}</small></div><div class="due-alert-actions"><button type="button" data-due-open>فتح الأرشيف</button>${expired?`<button type="button" class="due-reminder-btn" data-due-reminder>PDF + WhatsApp · ${money(overdueTotal)} DH</button>`:""}</div>`;
 bar.querySelector("[data-due-open]")?.addEventListener("click",openOrdersModal);
 bar.querySelector("[data-due-reminder]")?.addEventListener("click",e=>{e.stopPropagation();shareDueReminderPDF()});
}
function renderOrders(){
 renderSalesForecast();
 const q=($("orderSearch").value||"").trim().toLowerCase();
 let sales=0,paid=0,due=0;
 orders.forEach(o=>{const state=recalculateOrderPaymentState(o);sales+=Number(o.total)||0;paid+=state.paid;due+=state.due});
 $("statSales").textContent=money(sales)+" DH";
 $("statPaid").textContent=money(paid)+" DH";
 $("statDue").textContent=money(due)+" DH";
 const list=orders.filter(o=>!q||String(o.client||"").toLowerCase().includes(q));
 $("ordersEmpty").style.display=list.length?"none":"block";
 $("ordersList").innerHTML=list.map(o=>{
   const d=new Date(o.date);
   const date=d.toLocaleDateString("fr-FR",{day:"2-digit",month:"2-digit",year:"numeric"});
   const time=d.toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"});
   const total=Number(o.total)||0;
   const state=recalculateOrderPaymentState(o);
   const paid=state.paid;
   const due=state.due;
   const status=due<=0.000001?"مخلصة كاملة":paid>0?"مخلصة جزئياً":"غير مخلصة";
   const statusClass=due<=0.000001?"paid":paid>0?"partial":"unpaid";
   const deadline=deadlineState(o);
   const rowClass=deadline.overdue&&due>0?`${statusClass} overdue`:statusClass;
   return `<div class="order-row ${rowClass}" data-order-open="${esc(o.id)}" tabindex="0" role="button">
     <div class="order-main">
       <div class="order-client">${esc(o.client)}</div>
       <small>${date} · ${time}</small>
       <div class="order-status ${statusClass}">${status}</div>
       ${o.note?`<p>${esc(o.note)}</p>`:""}
     </div>
     <div class="order-money">
       <b>${money(total)} DH</b>
       <span>خلص: ${money(paid)} DH</span>
       <span class="${due>0?"due":""}">باقي: ${money(due)} DH</span>
       ${due>0?`<button class="payment-btn" data-order-pay="${o.id}">💰 تسجيل قسط</button>`:`<span class="paid-label">✓ مخلصة</span>`}
       ${getPaymentHistory(o).length?`<small class="order-installment-summary">${getPaymentHistory(o).length} قسط · مجموع الأقساط ${money(paid)} DH</small>`:""}
       ${due>0?`<span class="deadline-chip ${deadline.overdue?"expired":""}">⏱ ${deadlineText(deadline)}</span>`:`<span class="deadline-chip paid">✓ تم الاستخلاص</span>`}
     </div>
     <button class="order-delete" data-order-delete="${o.id}" title="حذف">×</button>
   </div>`;
 }).join("");
 document.querySelectorAll("[data-order-pay]").forEach(b=>b.onclick=(e)=>{e.stopPropagation();addPayment(b.dataset.orderPay)});
 document.querySelectorAll("[data-order-delete]").forEach(b=>b.onclick=(e)=>{
   e.stopPropagation();
   if(confirm("حذف هاد الطلب من الأرشيف؟")){orders=orders.filter(o=>o.id!==b.dataset.orderDelete);localStorage.setItem("3d_peintures_orders_v1",JSON.stringify(orders));renderOrders();toast("تم حذف الطلب")}
 });
 document.querySelectorAll("[data-order-open]").forEach(b=>{
   b.onclick=()=>openOrderDetail(b.dataset.orderOpen);
   b.onkeydown=e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();openOrderDetail(b.dataset.orderOpen)}};
    });
   renderDueAlerts();
 }
 function openOrdersModal(){renderOrders();$("ordersModal").classList.add("show")}
function closeOrdersModal(){$("ordersModal").classList.remove("show")}

/* ===== Dashboard commercial ===== */
let topProductsChart=null;
let peakHoursChart=null;
function dashboardMonthLabel(key){
 const [year,month]=String(key||currentMonthKey()).split("-").map(Number);
 if(!year||!month)return key||"";
 return new Date(year,month-1,1).toLocaleDateString("fr-FR",{month:"long",year:"numeric"});
}
function dashboardOrdersForMonth(selectedMonth){
 return orders.filter(order=>monthKey(order.date)===selectedMonth);
}
function dashboardDestroyCharts(){
 if(topProductsChart){topProductsChart.destroy();topProductsChart=null}
 if(peakHoursChart){peakHoursChart.destroy();peakHoursChart=null}
}
function renderDashboard(){
 const monthInput=$("dashboardMonth");
 if(!monthInput)return;
 if(!monthInput.value)monthInput.value=currentMonthKey();
 const selectedMonth=monthInput.value;
 const selectedOrders=dashboardOrdersForMonth(selectedMonth);
 const productMap=new Map();
 const hours=Array.from({length:24},()=>0);
 let sales=0;
 selectedOrders.forEach(order=>{
   sales+=Number(order.total)||0;
   const date=new Date(order.date);
   if(!Number.isNaN(date.getTime()))hours[date.getHours()]++;
   (order.items||[]).forEach(row=>{
     const product=products.find(p=>String(p.id)===String(row.id));
     const key=String(row.id||row.code||row.name||"unknown");
     const units=orderItemUnits(row);
     const line=Number(row.lineTotal ?? ((Number(row.unitPrice ?? product?.price)||0)*units))||0;
     const item=productMap.get(key)||{name:row.name||product?.name||"Produit",units:0,sales:0};
     item.units+=units;item.sales+=line;productMap.set(key,item);
   });
 });
 const topProducts=[...productMap.values()].sort((a,b)=>b.units-a.units||b.sales-a.sales).slice(0,8);
 const peakCount=Math.max(...hours,0);
 const peakIndexes=hours.reduce((acc,value,index)=>value===peakCount&&value>0?acc.concat(index):acc,[]);
 const peakText=peakIndexes.length?peakIndexes.map(h=>`${String(h).padStart(2,"0")}:00`).join(" · "):"—";
 $("dashboardOrdersCount").textContent=String(selectedOrders.length);
 $("dashboardSalesTotal").textContent=`${money(sales)} DH`;
 $("dashboardTopProduct").textContent=topProducts[0]?.name||"—";
 $("dashboardPeakHour").textContent=peakText;
 const topEmpty=$("topProductsEmpty"),peakEmpty=$("peakHoursEmpty");
 if(topEmpty)topEmpty.style.display=topProducts.length?"none":"block";
 if(peakEmpty)peakEmpty.style.display=peakCount>0?"none":"block";
 dashboardDestroyCharts();
 if(typeof Chart==="undefined"){
   if(topEmpty){topEmpty.style.display="block";topEmpty.textContent="تعذر تحميل مكتبة الرسوم البيانية."}
   if(peakEmpty){peakEmpty.style.display="block";peakEmpty.textContent="تعذر تحميل مكتبة الرسوم البيانية."}
   return;
 }
 const gold="#f5d477",goldSoft="rgba(245,212,119,.78)",navy="#163f78",navySoft="rgba(22,63,120,.78)",grid="rgba(255,255,255,.10)",text="#dbe5f5";
 if(topProducts.length){
   const canvas=$("topProductsChart");
   topProductsChart=new Chart(canvas,{
     type:"bar",
     data:{
       labels:topProducts.map(item=>item.name.length>18?item.name.slice(0,18)+"…":item.name),
       datasets:[{label:"Unités",data:topProducts.map(item=>item.units),backgroundColor:topProducts.map((_,i)=>i===0?gold:goldSoft),borderColor:gold,borderWidth:1,borderRadius:7,barThickness:18}]
     },
     options:{
       indexAxis:"y",responsive:true,maintainAspectRatio:false,animation:{duration:450},
       plugins:{legend:{display:false},tooltip:{callbacks:{label:ctx=>`${ctx.raw} unité(s)`}}},
       scales:{x:{beginAtZero:true,ticks:{color:text,precision:0},grid:{color:grid}},y:{ticks:{color:text,font:{size:11}},grid:{display:false}}}
     }
   });
 }
 if(peakCount>0){
   const canvas=$("peakHoursChart");
   const peakConfig={
     type:"line",
     data:{
       labels:hours.map((_,i)=>`${String(i).padStart(2,"0")}h`),
       datasets:[{
         label:"Commandes",
         data:hours,
         borderColor:gold,
         backgroundColor:"rgba(245,212,119,.16)",
         pointBackgroundColor:gold,
         pointBorderColor:"#06152f",
         pointRadius:3,
         pointHoverRadius:5,
         borderWidth:2,
         tension:.35,
         fill:true
       }]
     },
     options:{
       responsive:true,
       maintainAspectRatio:false,
       animation:{duration:450},
       plugins:{legend:{display:false}},
       scales:{
         x:{ticks:{color:text,maxRotation:0,autoSkip:true,maxTicksLimit:12},grid:{color:grid}},
         y:{beginAtZero:true,ticks:{color:text,precision:0},grid:{color:grid}}
       }
     }
   };
   peakHoursChart=new Chart(canvas,peakConfig);
 }
}
function openDashboard(){
 $("actionMenu").classList.remove("show");
 $("dashboardModal").classList.add("show");
 requestAnimationFrame(renderDashboard);
}
function closeDashboard(){$("dashboardModal").classList.remove("show");dashboardDestroyCharts()}

function orderItemsForDisplay(order){
 return (order.items||[]).map(row=>{
   const p=products.find(x=>x.id===row.id)||{};
   const boxes=Number(row.qty)||0;
   const units=Number(row.units ?? p.qty)||0;
   const unitPrice=Number(row.unitPrice ?? p.price)||0;
   const name=row.name || p.name || "Produit";
   const paidUnits=Number(row.paidUnits ?? (units*boxes)) || 0;
   const freeUnits=Number(row.freeUnits ?? (hasPromo10Plus1(p)?Math.floor(paidUnits/10):0)) || 0;
   const lineTotal=Number(row.lineTotal ?? (unitPrice*paidUnits)) || 0;
   return {name,boxes,units,paidUnits,freeUnits,deliveredUnits:paidUnits+freeUnits,unitPrice,lineTotal,promotion:freeUnits>0?"10 + 1 Gratuit":""};
 });
}
function openOrderDetail(orderId){
 const o=orders.find(x=>String(x.id)===String(orderId));
 if(!o)return;
 // Hide the archive underneath while the order details are displayed.
 const archive=$("ordersModal");
 if(archive) archive.classList.remove("show");
 const d=new Date(o.date);
 const date=d.toLocaleDateString("fr-FR",{day:"2-digit",month:"2-digit",year:"numeric"});
 const time=d.toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"});
 const total=Number(o.total)||0;
 const payments=getPaymentHistory(o);
 const paid=paymentTotal(o);
 const due=Math.max(0,total-paid);
 const items=orderItemsForDisplay(o);
 $("orderDetailTitle").textContent="Commande de "+(o.client||"Client");
 $("orderDetailBody").innerHTML=`
   <div class="detail-client">
     <div><span>Client</span><strong>${esc(o.client||"—")}</strong></div>
     ${o.company?`<div><span>Société</span><strong>${esc(o.company)}</strong></div>`:""}
     ${o.ice?`<div><span>ICE</span><strong>${esc(o.ice)}</strong></div>`:""}
     ${o.phone?`<div><span>WhatsApp</span><strong>${esc(o.phone)}</strong></div>`:""}
     <div><span>Date</span><strong>${date} · ${time}</strong></div>
   </div>
   <div class="detail-products">
     <div class="detail-products-head"><span>Produit</span><span>Boîtes</span><span>Unités/boîte</span><span>Prix</span><span>Total</span></div>
     ${items.length?items.map(it=>`
       <div class="detail-product-row">
         <strong>${esc(it.name)}${it.freeUnits>0?`<small class="detail-promo-note">🎁 +${it.freeUnits} gratuit · livré ${it.deliveredUnits}</small>`:""}</strong>
         <span>${it.boxes}</span>
         <span>${it.units}</span>
         <span>${money(it.unitPrice)} DH</span>
         <b>${money(it.lineTotal)} DH</b>
       </div>`).join(""):`<div class="detail-empty">Aucun produit enregistré dans cette commande.</div>`}
   </div>
   <div class="detail-total"><span>Total Payé</span><strong>${money(total)} DH</strong></div>
   <div class="detail-payment"><span>Déjà encaissé</span><strong>${money(paid)} DH</strong><span>Reste</span><strong>${money(due)} DH</strong></div>
   <div class="detail-installments">
     <div class="detail-installments-head"><span>سجل الأقساط</span><strong>مجموع الأقساط: ${money(paid)} DH</strong></div>
     <div class="installment-list">${payments.length?payments.map((p,index)=>`<div class="installment-row"><span class="installment-index">${index+1}</span><div><b>قسط رقم ${index+1}</b><small class="installment-date">${formatPaymentDate(p.date)}</small></div><strong class="installment-amount">${money(p.amount)} DH</strong></div>`).join(""):`<div class="installment-empty">لم يتم تسجيل أي قسط بعد.</div>`}</div>
   </div>
   ${o.note?`<div class="detail-note">${esc(o.note)}</div>`:""}
   ${o.paymentNumber?`<div class="detail-note"><b>رقم الشيك / الكمبيالة:</b> ${esc(o.paymentNumber)}</div>`:""}
   <button class="gold-btn full" id="detailPaymentBtn" type="button">💰 Enregistrer un paiement</button>
 `;
 $("orderDetailModal").classList.add("show");
 const payBtn=$("detailPaymentBtn");
 if(payBtn) payBtn.onclick=()=>{addPayment(o.id);openOrderDetail(o.id)};
}
function closeOrderDetail(){
 $("orderDetailModal").classList.remove("show");
 const archive=$("ordersModal");
 if(archive) archive.classList.add("show");
}


/* form */
function openForm(p=null){
 $("formModal").classList.add("show");$("modalTitle").textContent=p?"Modifier le produit":"Nouveau produit";
  $("editId").value=p?.id||"";$("name").value=p?.name||"";$("productCode").value=productCode(p);$("price").value=p?.price??"";$("qty").value=p?.qty??"";
 $("category").value=p?canonicalCategory(p.category):canonicalCategory(active);$("availability").value=p?.availability==="unavailable"?"unavailable":"available";$("description").value=p?.description||"";selectedImage=p?.image||"";
 $("promo10Plus1").checked=hasPromo10Plus1(p);
 if(selectedImage){$("preview").src=selectedImage;$("photoPicker").classList.add("has-image")}else{$("preview").src="";$("photoPicker").classList.remove("has-image")}
}
function closeForm(){$("formModal").classList.remove("show")}
$("closeForm").onclick=closeForm;
$("formModal").onclick=e=>{if(e.target===$("formModal"))closeForm()};
$("imageInput").onchange=async e=>{
 const f=e.target.files[0];if(!f)return;
 try{selectedImage=await compressImage(f);$("preview").src=selectedImage;$("photoPicker").classList.add("has-image")}
 catch(err){toast("Impossible de charger cette image")}
};
$("productForm").onsubmit=async e=>{
 e.preventDefault();
 const id=$("editId").value||makeId();
 const i=products.findIndex(p=>p.id===id);
 const old=i>=0?products[i]:null;
 const keepCategory=old?canonicalCategory(old.category||active):canonicalCategory($("category").value||active);
  const code=normalizeProductCode($("productCode").value);
  if(!code){toast("دخل كود المنتوج مثل D402 أو W202");return;}
  const duplicate=products.find(p=>p.id!==id&&productCode(p)===code);
  if(duplicate){toast("هاد الكود مستعمل من طرف منتوج آخر");return;}
  const data={id,name:$("name").value.trim(),code,price:Number($("price").value),costPrice:old?.costPrice??0,qty:Number($("qty").value),category:keepCategory,availability:$("availability").value,description:$("description").value.trim(),image:selectedImage,promo10Plus1:$("promo10Plus1").checked};
 if(i>=0) products[i]=data; else products.unshift(data);
 if(!save()){
   await compactProductsImages();
   if(!save()){ if(i>=0) products[i]=old; else products=products.filter(p=>p.id!==id); return; }
 }
 selectedProductId=id;active=keepCategory;closeForm();render();toast(i>=0?"Produit modifié":"Produit ajouté");e.target.reset();selectedImage="";
};

/* viewer */
function updateViewerBoxTotal(p){
 const units=Number(p?.qty||1);
 const unitPrice=Number(p?.price||0);
 const total=unitPrice*units*viewerBoxQty;
 $("viewerBoxQty").textContent=viewerBoxQty;
 $("viewerBoxTotal").textContent=`${money(total)} DH`;
 $("viewerBoxUnits").textContent=`${units*viewerBoxQty} unité${units*viewerBoxQty!==1?"s":""}`;
}

function getViewerIndex(){ return products.findIndex(x=>x.id===selectedProductId); }
function updateViewerNavigation(){ const i=getViewerIndex(), total=products.length; const prev=$("viewerPrev"), next=$("viewerNext"), counter=$("viewerCounter"); if(!prev||!next)return; prev.disabled=total<=1 || i<=0; next.disabled=total<=1 || i<0 || i>=total-1; prev.classList.toggle("is-disabled",prev.disabled); next.classList.toggle("is-disabled",next.disabled); if(counter) counter.textContent=i>=0 ? `${i+1} / ${total}` : ""; }
function navigateViewer(direction){ const i=getViewerIndex(), n=i+direction; if(i<0 || n<0 || n>=products.length)return; view(products[n].id); }

function view(id){
 const p=products.find(x=>x.id===id);if(!p)return;
 selectedProductId=id;
 viewerBoxQty=1;
 updateViewerBoxTotal(p);
 const available=isAvailable(p);
  $("viewerImage").src=p.image||"";
  $("viewerName").textContent=p.name;
  $("viewerCode").textContent=productCode(p)?`Code produit : ${productCode(p)}`:"";
  $("viewerCategory").textContent=p.category;
 const badge=$("viewerPromoBadge"); if(badge) badge.style.display=hasPromo10Plus1(p)?"block":"none";
 $("viewerDescription").textContent=available?(p.description||"Produit disponible"):unavailableText();
 $("viewerPrice2").textContent=`${money(p.price)} DH`;
 $("viewerStock").textContent=p.qty;
 $("stockText").textContent="unités par boîte";

 

 const status=$("viewerAvailable");
 if(status){
   status.textContent=available?"● DISPONIBLE":"● NON DISPONIBLE";
   status.classList.toggle("unavailable",!available);
 }

 const unavailableOverlay=$("viewerUnavailable");
 unavailableOverlay.classList.toggle("show",!available);

 $("viewerCart").style.display=available?"":"none";
 $("viewerCart").onclick=(e)=>{
   e.preventDefault();
   e.stopPropagation();
   if(viewerBoxQty<=0)return;
   addToCart(p.id, viewerBoxQty);
   $("viewer").classList.remove("show");
   return false;
 };
 updateViewerNavigation();
 $("viewer").classList.add("show");
}
$("viewerPrev").onclick=()=>navigateViewer(-1);
$("viewerNext").onclick=()=>navigateViewer(1);
document.addEventListener("keydown",e=>{if(!$('viewer').classList.contains('show'))return;if(e.key==='ArrowLeft')navigateViewer(-1);if(e.key==='ArrowRight')navigateViewer(1);if(e.key==='Escape')$('viewer').classList.remove('show')});
$("viewerMinus").onclick=()=>{
 if(viewerBoxQty>0){viewerBoxQty--; const p=products.find(x=>x.id===selectedProductId); if(p){updateViewerBoxTotal(p); $("viewerCart").disabled=viewerBoxQty<=0;}}
};
$("viewerPlus").onclick=()=>{
 viewerBoxQty++; const p=products.find(x=>x.id===selectedProductId); if(p){updateViewerBoxTotal(p); $("viewerCart").disabled=false;}
};
$("closeViewer").onclick=()=>$("viewer").classList.remove("show");
$("viewer").onclick=e=>{if(e.target===$("viewer"))$("viewer").classList.remove("show")};
$("cartBtn").onclick=openCart;
$("closeCart").onclick=closeCart;
$("cartOverlay").onclick=closeCart;
$("clearCart").onclick=()=>{cart=[];saveCart();toast("Panier vidé")};
$("sendCart").onclick=sendCartOrder;

$("sendOrderSave").onclick=openOrderModal;
$("closeOrder").onclick=closeOrderModal;
$("orderModal").onclick=e=>{if(e.target===$("orderModal"))closeOrderModal()};
$("orderForm").onsubmit=saveOrder;
$("closeOrders").onclick=closeOrdersModal;
$("closeOrderDetail").onclick=closeOrderDetail;
$("orderDetailModal").onclick=e=>{if(e.target===$("orderDetailModal"))closeOrderDetail()};
$("ordersModal").onclick=e=>{if(e.target===$("ordersModal"))closeOrdersModal()};
$("closeDashboard").onclick=closeDashboard;
$("dashboardModal").onclick=e=>{if(e.target===$("dashboardModal"))closeDashboard()};
$("dashboardMonth").onchange=renderDashboard;
$("orderSearch").oninput=renderOrders;
$("clearOrders").onclick=()=>{if(!orders.length)return;if(confirm("مسح جميع الطلبات؟")){orders=[];localStorage.setItem("3d_peintures_orders_v1","[]");renderOrders();toast("تم مسح الطلبات")}};
$("closePaymentModal").onclick=closePaymentModal;
$("paymentModal").onclick=e=>{if(e.target===$("paymentModal"))closePaymentModal()};
$("paymentForm").onsubmit=savePaymentForm;
$("paymentAmount").oninput=updatePaymentPreview;
$("paymentCustomerBtn").onclick=sharePaymentSummaryWithCustomer;

$("openClientFormFromOrder").onclick=()=>{hideClientSuggestions();openClientModal($("orderClient").value.trim())};
$("orderClient").oninput=event=>renderClientSuggestions(event.target.value);
$("orderClient").onfocus=event=>{if(event.target.value.trim())renderClientSuggestions(event.target.value)};
$("orderClient").onkeydown=handleClientSuggestionKeys;
$("orderClient").onblur=()=>setTimeout(hideClientSuggestions,140);
document.addEventListener("pointerdown",event=>{if(!event.target.closest(".client-autocomplete"))hideClientSuggestions()});
$("closeClientModal").onclick=closeClientModal;
$("clientModal").onclick=e=>{if(e.target===$("clientModal"))closeClientModal()};
$("clientForm").onsubmit=saveClientForm;
$("clientManagerSearch").oninput=()=>{ $("clearClientManagerSearch").style.display=$("clientManagerSearch").value?"block":"none"; renderClientsManager(); };
$("clearClientManagerSearch").onclick=()=>{ $("clientManagerSearch").value=""; $("clearClientManagerSearch").style.display="none"; renderClientsManager(); $("clientManagerSearch").focus(); };
$("clientStatsToggle").onclick=toggleClientStats;
$("clientStatsMonth").onchange=renderClientStats;
$("salesForecastToggle").onclick=toggleSalesForecast;
$("salesForecastMonth").onchange=renderSalesForecast;
$("exportSalesForecastExcel").onclick=exportSalesForecastToExcel;
$("clientStatsSearch").oninput=renderClientStats;
$("exportStatsExcel").onclick=exportClientStatsToExcel;
$("productSearch").oninput=()=>{render();$("clearProductSearch").style.display=$("productSearch").value?"block":"none"};
$("clearProductSearch").onclick=()=>{$("productSearch").value="";$("clearProductSearch").style.display="none";render();$("productSearch").focus()};

 initProductCarousel();
 initProductFocus();
 renderCart();
 render();
 renderDueAlerts();
  setInterval(renderDueAlerts,5000);

/* ===== SLIDER — auto only, no arrows, no dots, no zoom ===== */
(function(){
  const wrap  = document.getElementById('sliderWrap');
  const track = document.getElementById('sliderTrack');
  if(!track || !wrap) return;
  const slides = Array.from(track.querySelectorAll('.slide'));
  const total = slides.length;
  if(total === 0) return;
  let current = 0;

  function goTo(n){
    const prev = current;
    current = (n + total) % total;
    if(prev === current) return;
    slides[prev].classList.remove('active');
    slides[prev].classList.add('prev');
    setTimeout(()=> slides[prev].classList.remove('prev'), 900);
    slides[current].classList.add('active');
  }

  slides[0].classList.add('active');
  setInterval(()=> goTo(current + 1), 4000);
})();


/* Splash Screen vidéo de démarrage — durée fixe de 5 secondes */
(function initSplashScreen(){
 const splash=document.getElementById("splashScreen");
 const video=document.getElementById("splashVideo");
 const progress=document.getElementById("splashProgress");
 if(!splash)return;
 let closed=false;
 const start=Date.now();
 const finish=()=>{
   if(closed)return;
   closed=true;
   if(progress)progress.style.width="100%";
   document.body.classList.remove("splash-active");
   splash.classList.add("is-leaving");
   window.setTimeout(()=>splash.remove(),700);
 };
 const updateProgress=()=>{
   if(!progress||closed)return;
   const value=Math.min(96,((Date.now()-start)/5000)*100);
   progress.style.width=`${value}%`;
 };
 const progressTimer=window.setInterval(updateProgress,100);
 window.setTimeout(()=>{window.clearInterval(progressTimer);finish();},5000);
 if(video)video.play().catch(()=>{});
})();


function paymentScheduleData(order,state=deadlineState(order)){
 const history=getPaymentHistory(order);
 const totalOrder=Math.max(0,Number(order?.total)||0);
 const paidOrder=paymentTotal(order);
 const dueOrder=Math.max(0,totalOrder-paidOrder);
 const isCredit=state.termKey==="days"&&[15,30].includes(Number(order?.paymentTermDays));
 return {history,totalOrder,paidOrder,dueOrder,isCredit,isTest:state.termKey==="test_1m"};
}
function paymentScheduleText(order,state=deadlineState(order)){
 const data=paymentScheduleData(order,state);
 if(data.isTest)return `تجربة دقيقة واحدة / Test 1 minute\nالباقي / Reste à payer : ${money(data.dueOrder)} DH`;
 if(!data.isCredit)return "إستخلاص عند الإستلام / Paiement à la livraison";
 const lines=data.history.length?data.history.map((payment,index)=>`${index+1}. ${formatPaymentDate(payment.date)} — ${money(payment.amount)} DH`):["لم تسجل أي دفعة / Aucun paiement enregistré"];
 return ["تواريخ الدفعات / Dates des paiements",...lines,`الباقي / Reste à payer : ${money(data.dueOrder)} DH`].join("\n");
}
function paymentScheduleHtml(order,state=deadlineState(order),style="card"){
 const data=paymentScheduleData(order,state);
 const summary=`<div style="font-size:13px;font-weight:400;color:#d00000;line-height:1.55;text-align:left"><div>مجموع البون / Total commande : ${money(data.totalOrder)} DH</div><div>عدد الأقساط / Nombre des acomptes : ${data.history.length}</div><div>مجموع الأقساط / Total des acomptes : ${money(data.paidOrder)} DH</div><div>المجموع ناقص الأقساط / Total - acomptes : ${money(data.dueOrder)} DH</div></div>`;
 const remainder=`<div style="margin-top:10px;padding-top:9px;border-top:2px solid #e8a0a0;text-align:center;font-weight:900;font-size:25px;color:#d00000">الباقي / Reste à payer : ${money(data.dueOrder)} DH</div>`;
 if(data.isTest)return `<div style="border:3px solid #d00000;border-radius:12px;padding:14px 18px;background:#fff5f5;color:#d00000;line-height:1.45"><div style="text-align:center;font-size:13px;font-weight:400;margin-bottom:7px">تجربة دقيقة واحدة / Test 1 minute</div>${summary}${remainder}</div>`;
  if(!data.isCredit)return `<div style="text-align:center;font-weight:800;color:#d00000;font-size:16px;line-height:1.25;border:2px solid #d00000;border-radius:9px;padding:9px 12px;background:#fff5f5">إستخلاص عند الإستلام / Paiement à la livraison</div>`;
 const rows=data.history.length?data.history.map((payment,index)=>`<div style="display:flex;justify-content:space-between;gap:12px;padding:5px 0;border-bottom:1px solid #f1dada;color:#d00000;font-size:13px;font-weight:400"><span>${index+1}. ${esc(formatPaymentDate(payment.date))}</span><span>${money(payment.amount)} DH</span></div>`).join(""):`<div style="color:#d00000;font-size:13px;font-weight:400">لم تسجل أي دفعة / Aucun paiement enregistré</div>`;
 return `<div style="border:3px solid #d00000;border-radius:12px;padding:14px 18px;background:#fff5f5;color:#d00000;line-height:1.45"><div style="text-align:center;font-size:13px;font-weight:400;margin-bottom:7px">تواريخ الدفعات / Dates des paiements</div>${summary}<div style="margin-top:7px;font-size:13px;color:#d00000;font-weight:400">${rows}</div>${remainder}</div>`;
}

const KEY="3d_peintures_catalog_v3";
const categories=["Produits","Essence Jupiter","Diluant","Colle","Peinture"];
let products=JSON.parse(localStorage.getItem(KEY)||"[]");
let active="Produits", selectedImage="", selectedProductId=null, viewerBoxQty=0;
let cart=JSON.parse(localStorage.getItem("3d_peintures_cart_v4")||"[]");
let orders=JSON.parse(localStorage.getItem("3d_peintures_orders_v1")||"[]");
const $=id=>document.getElementById(id);
products.forEach(p=>{if(p.costPrice==null)p.costPrice=0});

function save(){try{localStorage.setItem(KEY,JSON.stringify(products));return true}catch(err){console.error(err);toast(err&&err.name==="QuotaExceededError"?"Mémoire pleine : image trop grande.":"Impossible d'enregistrer le produit");return false}}
function makeId(){try{if(window.crypto&&typeof crypto.randomUUID==="function")return crypto.randomUUID()}catch(e){}return "p_"+Date.now().toString(36)+"_"+Math.random().toString(36).slice(2,10)}
function compressImage(file,maxSide=1000,quality=.78){return new Promise((resolve,reject)=>{const r=new FileReader();r.onerror=()=>reject(new Error("Lecture impossible"));r.onload=e=>{const img=new Image();img.onerror=()=>reject(new Error("Image invalide"));img.onload=()=>{const ow=img.naturalWidth||img.width,oh=img.naturalHeight||img.height,s=Math.min(1,maxSide/Math.max(ow,oh)),w=Math.max(1,Math.round(ow*s)),h=Math.max(1,Math.round(oh*s)),c=document.createElement("canvas");c.width=w;c.height=h;c.getContext("2d").drawImage(img,0,0,w,h);resolve(c.toDataURL("image/webp",quality))};img.src=e.target.result};r.readAsDataURL(file)})}
function saveCart(){localStorage.setItem("3d_peintures_cart_v4",JSON.stringify(cart));renderCart()}
function isAvailable(p){ return p && p.availability !== "unavailable"; }
function unavailableText(){ return "غير متوفر حاليا حالياً — هاد المنتوج غير متوفر حالياً"; }

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
   const line=p.price*Number(p.qty||1)*row.qty; total+=line;
   return `<div class="cart-row">
     ${p.image?`<img src="${p.image}" alt="">`:`<div></div>`}
     <div><h4>${esc(p.name)}</h4><small>${money(p.price)} DH / unité · ${p.qty} unités / boîte</small>
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
   const units=Number(p.qty)||1;
   const unit=Number(p.price)||0;
   const line=unit*units*boxes;
   total+=line;

   lines.push(`🔹 PRODUIT ${i+1}`);
   lines.push(`🧴 ${p.name}`);
   lines.push(`📦 ${boxes} boîte(s) × ${units} unités`);
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

function render(){
 $("categories").innerHTML=categories.map(c=>`<button class="cat ${active===c?"active":""}" data-cat="${esc(c)}">${esc(c)}</button>`).join("");
 document.querySelectorAll(".cat").forEach(b=>b.onclick=()=>{active=b.dataset.cat;selectedProductId=null;render()});
 $("sectionTitle").textContent=active;
 const q=$("search").value.trim().toLowerCase();
 const list=products.filter(p=>p.category===active&&(!q||p.name.toLowerCase().includes(q)));
 $("count").textContent=`${list.length} produit${list.length!==1?"s":""}`;
 $("grid").innerHTML=list.map(card).join("");
 $("empty").style.display=list.length?"none":"block";
 const selectCard=(cardEl)=>{
   document.querySelectorAll(".card.selected").forEach(other=>{ if(other!==cardEl) other.classList.remove("selected"); });
   cardEl.classList.add("selected");
   selectedProductId=cardEl.dataset.id;
 };
 document.querySelectorAll(".photo").forEach(x=>x.onclick=e=>{e.stopPropagation();selectCard(x.closest(".card"));view(x.dataset.id)});
 document.querySelectorAll(".card").forEach(x=>x.onclick=()=>selectCard(x));
 // تأثير اللمس + إطار أزرق ثابت للمنتوج المحدد
 document.querySelectorAll(".card").forEach(cardEl=>{
   const startTouch=(e)=>{
     selectCard(cardEl);
     document.querySelectorAll(".card.touching").forEach(other=>{
       if(other!==cardEl){ other.classList.remove("touching"); clearTimeout(other._touchTimer); }
     });
     const r=cardEl.getBoundingClientRect();
     const point=e.touches&&e.touches[0]?e.touches[0]:e;
     cardEl.style.setProperty("--touch-x",`${point.clientX-r.left}px`);
     cardEl.style.setProperty("--touch-y",`${point.clientY-r.top}px`);
     cardEl.classList.remove("touching");
     void cardEl.offsetWidth;
     cardEl.classList.add("touching");
     clearTimeout(cardEl._touchTimer);
     cardEl._touchTimer=setTimeout(()=>cardEl.classList.remove("touching"),520);
   };
   const endTouch=()=>{
     clearTimeout(cardEl._touchTimer);
     cardEl._touchTimer=setTimeout(()=>cardEl.classList.remove("touching"),180);
   };
   cardEl.addEventListener("pointerdown",startTouch,{passive:true});
   cardEl.addEventListener("pointerup",endTouch,{passive:true});
   cardEl.addEventListener("pointercancel",endTouch,{passive:true});
   cardEl.addEventListener("pointerleave",endTouch,{passive:true});
 });
 
}

function card(p){
 const low=Number(p.qty)<=5, available=isAvailable(p);
 return `<article class="card ${selectedProductId===p.id?"selected":""}" data-id="${p.id}">
  <div class="photo ${available?"":"is-unavailable"}" data-id="${p.id}">
   ${p.image?`<img src="${p.image}" alt="">`:`<div class="no-photo">🎨</div>`}
   <span class="badge">${esc(p.category)}</span>
   ${available?"":`<div class="unavailable-card-overlay"><span>غير متوفر حاليا</span></div>`}
  </div>
  <div class="card-body">
   <h3>${esc(p.name)}</h3><div class="desc">${esc(p.description||"Produit disponible")}</div>
   <div class="price">${money(p.price)} <small>DH</small></div>
   <div class="stock ${low?"low":""}">${available?`Unités / boîte : ${p.qty}`:unavailableText()}</div>
  </div>
 </article>`;
}

/* menu */
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


/* Sauvegarde complète : produits + informations + photos + panier */
function exportBackup(){
 const backup={
   format:"3D_PEINTURES_CATALOG_BACKUP",
   version:1,
   createdAt:new Date().toISOString(),
   products:products,
   cart:cart,
   orders:orders,
   clients:clients
 };
 const blob=new Blob([JSON.stringify(backup)],{type:"application/json"});
 const url=URL.createObjectURL(blob);
 const a=document.createElement("a");
 const d=new Date();
 const pad=n=>String(n).padStart(2,"0");
 a.href=url;
 a.download=`3D_PEINTURES_SAUVEGARDE_${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}.3dbackup`;
 document.body.appendChild(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),1000);
 toast("Sauvegarde téléchargée avec les photos");
}

function importBackupFile(file){
 if(!file)return;
 const reader=new FileReader();
 reader.onload=e=>{
   try{
     const data=JSON.parse(e.target.result);
     if(data.format!=="3D_PEINTURES_CATALOG_BACKUP" || !Array.isArray(data.products)){
       throw new Error("Format de sauvegarde invalide");
     }
     if(!confirm(`Restaurer ${data.products.length} produit(s) et leurs photos ?

Les données actuelles seront remplacées.`))return;
     products=data.products;
     cart=Array.isArray(data.cart)?data.cart:[];
     orders=Array.isArray(data.orders)?data.orders:[];
     clients=Array.isArray(data.clients)?data.clients:[];
     localStorage.setItem("3d_peintures_orders_v1",JSON.stringify(orders));
     saveClients();
     save();
     localStorage.setItem("3d_peintures_cart_v4",JSON.stringify(cart));
     selectedProductId=null;
     selectedImage="";
     active="Produits";
     renderCart();
     render();
     toast(`Sauvegarde restaurée : ${products.length} produit(s)`);
   }catch(err){
     alert("Impossible de restaurer cette sauvegarde.\nLe fichier est invalide ou incomplet.");
   }finally{
     $("backupInput").value="";
   }
 };
 reader.readAsText(file);
}

$("menuExport").onclick=()=>{
 $("actionMenu").classList.remove("show");
 exportBackup();
};
$("menuImport").onclick=()=>{
 $("actionMenu").classList.remove("show");
 $("backupInput").click();
};
$("backupInput").onchange=e=>importBackupFile(e.target.files[0]);



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
function renderClientList(){
  const dl=$("clientsList"); if(!dl)return;
  const unique=[...new Set(clients.map(c=>c.name).filter(Boolean))];
  dl.innerHTML=unique.map(n=>`<option value="${esc(n)}"></option>`).join("");
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
$("menuImportClients").onclick=()=>{
  $("actionMenu").classList.remove("show");
  $("clientsExcelInput").click();
};
$("clientsExcelInput").onchange=e=>importClientsExcel(e.target.files[0]);
renderClientList();


/* Gestion des clients */
function openClientModal(prefillName=""){
  $("clientForm").reset();
  $("clientEditId").value="";
  $("clientName").value=prefillName||$("orderClient").value.trim();
  $("clientCompany").value=""; $("clientICE").value=""; $("clientWhatsapp").value="";
  renderClientsManager();
  $("clientModal").classList.add("show");
}
function closeClientModal(){$("clientModal").classList.remove("show")}
function renderClientsManager(){
 const box=$("clientsManagerList"); if(!box)return;
 box.innerHTML=clients.map(c=>`<div class="client-manager-row"><div><b>${esc(c.name||"")}</b><small>${esc(c.company||"")}${c.ice?` · ICE ${esc(c.ice)}`:""}${c.phone?` · WhatsApp ${esc(c.phone)}`:""}</small></div><button type="button" data-client-edit="${esc(c.id)}">Modifier</button></div>`).join("") || '<div class="cart-empty">Aucun client enregistré.</div>';
 box.querySelectorAll("[data-client-edit]").forEach(btn=>btn.onclick=()=>{
   const c=clients.find(x=>x.id===btn.dataset.clientEdit); if(!c)return;
   $("clientEditId").value=c.id; $("clientName").value=c.name||""; $("clientCompany").value=c.company||""; $("clientICE").value=c.ice||""; $("clientWhatsapp").value=c.phone||"";
 });
}
function saveClientForm(e){
 e.preventDefault();
 const name=$("clientName").value.trim(); if(!name){alert("دخل اسم الكليان");return}
 const data={id:$("clientEditId").value||("c_"+Date.now().toString(36)),name,company:$("clientCompany").value.trim(),ice:$("clientICE").value.trim(),phone:$("clientWhatsapp").value.trim()};
 const idx=clients.findIndex(c=>c.id===data.id);
 const duplicate=clients.findIndex(c=>c.id!==data.id && String(c.name||"").trim().toLowerCase()===name.toLowerCase());
 if(duplicate>=0){ clients[duplicate]={...clients[duplicate],...data,id:clients[duplicate].id}; }
 else if(idx>=0) clients[idx]=data; else clients.unshift(data);
 saveClients(); renderClientsManager(); $("orderClient").value=name; closeClientModal(); toast("تم حفظ معلومات الكليان");
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
 $("orderClient").value="";
 $("orderNote").value="إستخلاص عند الاستلام — Paiement à la livraison";
 $("orderGrandTotal").textContent=money(x.total)+" DH";
 $("orderDue").textContent="غير مخلص";
 $("orderProfit").textContent=money(x.profit)+" DH";
 // La fenêtre d'enregistrement passe au-dessus du panier : le panier et ses boutons restent derrière.
 $("orderModal").classList.add("show");
 // Ne pas ouvrir automatiquement le clavier sur Android.
}
function closeOrderModal(){$("orderModal").classList.remove("show")}
async function createOrderPDF(order){
 try{
   if(!window.html2canvas || !window.jspdf) throw new Error("PDF libraries unavailable");

   // Pre-load logo as base64 so html2canvas can render it offline
   let logoB64 = "";
   try{
     const r = await fetch("https://www.dropbox.com/scl/fi/xw1zrjilt00hydjh1bc6m/1756847562213.jpg?rlkey=hfxxdkzfb6c2av6op4qibeu8e&st=yv1m9vxd&raw=1");
     const blob = await r.blob();
     logoB64 = await new Promise(res=>{ const fr=new FileReader(); fr.onload=e=>res(e.target.result); fr.readAsDataURL(blob); });
   }catch(e){ console.warn("Logo load failed",e); }

   const root=document.createElement("div");
   root.dir="ltr";
   root.style.cssText="position:fixed;left:-10000px;top:0;width:760px;background:#fff;color:#172033;padding:42px;font-family:Arial,sans-serif;z-index:-1;box-sizing:border-box";
   const d=new Date(order.date);
   const date=d.toLocaleDateString("fr-FR",{day:"2-digit",month:"2-digit",year:"numeric"});
   const time=d.toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"});
   const rows=order.items.map(row=>{
     const p=products.find(x=>x.id===row.id); if(!p)return "";
     const boxes=Number(row.qty)||0, units=Number(p.qty)||0, line=Number(p.price||0)*units*boxes;
     return `<tr><td style="padding:12px;border-bottom:1px solid #ddd;text-align:right">${esc(p.name)}</td><td style="padding:12px;border-bottom:1px solid #ddd;text-align:center">${boxes}</td><td style="padding:12px;border-bottom:1px solid #ddd;text-align:center">${units}</td><td style="padding:12px;border-bottom:1px solid #ddd;text-align:right">${money(p.price)} DH</td><td style="padding:12px;border-bottom:1px solid #ddd;text-align:right;font-weight:700">${money(line)} DH</td></tr>`;
   }).join("");

   const logoHtml = logoB64
     ? `<div style="margin-top:40px;text-align:center"><img src="${logoB64}" style="width:180px;max-width:55%;height:auto;opacity:.18;filter:grayscale(1)"></div>`
     : `<div style="margin-top:40px;text-align:center;font-size:22px;letter-spacing:6px;font-weight:900;color:#ddd;opacity:.35">3D PEINTURES</div>`;

   root.innerHTML=`<div style="border-bottom:4px solid #12386f;padding-bottom:18px;margin-bottom:25px">
<div style="font-size:16px;letter-spacing:4px;color:#b58a2a;font-weight:700">3D PEINTURES</div>
<div style="font-size:34px;font-weight:800;margin-top:6px">BON DE COMMANDE</div>
<div style="font-size:14px;color:#667085;margin-top:8px">${date} à ${time}</div></div>
<div style="display:flex;justify-content:space-between;gap:25px;margin-bottom:25px;direction:ltr">
<div style="flex:1;border:1px solid #ddd;border-radius:12px;padding:18px"><div style="color:#777">CLIENT</div><div style="font-size:24px;font-weight:800;margin-top:8px">${esc(order.client)}</div>
${order.company?`<div style="margin-top:8px"><b>Société :</b> ${esc(order.company)}</div>`:""}${order.ice?`<div style="margin-top:5px"><b>ICE :</b> ${esc(order.ice)}</div>`:""}${order.phone?`<div style="margin-top:5px"><b>Téléphone :</b> ${esc(order.phone)}</div>`:""}</div>
<div style="width:240px;border:1px solid #ddd;border-radius:12px;padding:18px"><div style="color:#777">DATE</div><div style="font-size:20px;font-weight:700;margin-top:8px">${date} · ${time}</div></div></div>
<table style="width:100%;border-collapse:collapse;font-size:16px;direction:ltr"><thead><tr style="background:#12386f;color:#fff"><th style="padding:12px;text-align:left">Désignation</th><th style="padding:12px">Boîtes</th><th style="padding:12px">Unités / boîte</th><th style="padding:12px;text-align:right">Prix unitaire</th><th style="padding:12px;text-align:right">Total</th></tr></thead><tbody>${rows}</tbody></table>
<div style="margin-top:25px;margin-left:auto;width:360px;border:2px solid #12386f;border-radius:14px;padding:18px;direction:ltr"><div style="display:flex;justify-content:space-between;font-size:24px;font-weight:900"><span>Total Payé</span><span>${money(order.total)} DH</span></div></div>
<div style="margin-top:38px;text-align:center;font-weight:900;color:#ff0000;font-size:30px;line-height:1.25">إستخلاص عند الاستلام</div>
<div style="text-align:center;font-weight:900;color:#ff0000;font-size:24px;line-height:1.25">Paiement à la livraison</div>
<div style="margin-top:28px;text-align:center;color:#777;font-size:14px">Merci pour votre confiance · 3D PEINTURES</div>
${logoHtml}`;

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
async function shareOrderPDF(order){
 const nativePayload={
   id:order.id,date:order.date,client:order.client,company:order.company||"",
   ice:order.ice||"",phone:order.phone||"",whatsapp:order.phone||"",total:Number(order.total||0),
   paid:Number(order.paid||0),due:Number(order.due||0),status:order.status||"unpaid",
   note:order.note||"إستخلاص عند الاستلام — Paiement à la livraison",
   items:order.items.map(row=>{
     const p=products.find(x=>x.id===row.id)||{};
     const boxes=Number(row.qty)||0, units=Number(p.qty)||0;
     return {name:p.name||"",boxes,units,unitPrice:Number(p.price||0),lineTotal:Number(p.price||0)*units*boxes};
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
     const total=boxes*units*price;
     lines.push(`🔹 ${p.name||it.name} — ${boxes} boîte(s) × ${units} u = *${money(total)} DH*`);
   });
   lines.push("","💰 *Total Payé : "+money(order.total)+" DH*","","إستخلاص عند الاستلام — Paiement à la livraison");
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
 const order={
   id:makeId(),date:new Date().toISOString(),client,
   company:clientObj.company||clientObj.societe||"",
   ice:clientObj.ice||"",phone:clientObj.phone||"",
   total:x.total,paid:0,due:x.total,profit:x.profit,
   status:"unpaid",note:$('orderNote').value.trim() || "إستخلاص عند الاستلام — Paiement à la livraison",
   items:cart.map(row=>{
     const p=products.find(x=>x.id===row.id)||{};
     const boxes=Number(row.qty)||0, units=Number(p.qty)||0, unitPrice=Number(p.price)||0;
     return {
       id:row.id, qty:boxes,
       name:p.name||"",
       units,
       unitPrice,
       lineTotal:unitPrice*units*boxes
     };
   })
 };
 orders.unshift(order);
 localStorage.setItem("3d_peintures_orders_v1",JSON.stringify(orders));
 cart=[];saveCart();closeOrderModal();
 toast("تسجلت الكوموند — جاري تجهيز Bon de commande PDF…");
 await shareOrderPDF(order);
}
function addPayment(orderId){
 const order=orders.find(o=>o.id===orderId);
 if(!order)return;
 const remaining=Math.max(0,Number(order.total||0)-Number(order.paid||0));
 if(remaining<=0){toast("هاد الكوموند مخلصة كاملة");return}
 const raw=prompt(`الكوموند: ${order.client}\nالمجموع: ${money(order.total)} DH\nمخلص دابا: ${money(order.paid||0)} DH\nالباقي: ${money(remaining)} DH\n\nدخل شحال خلص الكليان دابا (DH):`, String(remaining));
 if(raw===null)return;
 const amount=Number(String(raw).replace(',','.'));
 if(!Number.isFinite(amount)||amount<=0){alert("دخل مبلغ صحيح.");return}
 const added=Math.min(amount,remaining);
 order.paid=Number(order.paid||0)+added;
 order.due=Math.max(0,Number(order.total||0)-order.paid);
 order.status=order.due<=0.000001?"paid":"partial";
 order.updatedAt=new Date().toISOString();
 localStorage.setItem("3d_peintures_orders_v1",JSON.stringify(orders));
 renderOrders();
 toast(order.due<=0.000001?"الكوموند تخلصات كاملة و بقات فالأرشيف":"تسجل الخلاص وباقي جزء من الكوموند");
}
function renderOrders(){
 const q=($("orderSearch").value||"").trim().toLowerCase();
 let sales=0,paid=0,due=0,profit=0;
 orders.forEach(o=>{sales+=Number(o.total)||0;paid+=Number(o.paid)||0;due+=Math.max(0,Number(o.due ?? ((Number(o.total)||0)-(Number(o.paid)||0))));profit+=Number(o.profit)||0});
 $("statSales").textContent=money(sales)+" DH";
 $("statPaid").textContent=money(paid)+" DH";
 $("statDue").textContent=money(due)+" DH";
 $("statProfit").textContent=money(profit)+" DH";
 const list=orders.filter(o=>!q||String(o.client||"").toLowerCase().includes(q));
 $("ordersEmpty").style.display=list.length?"none":"block";
 $("ordersList").innerHTML=list.map(o=>{
   const d=new Date(o.date);
   const date=d.toLocaleDateString("fr-FR",{day:"2-digit",month:"2-digit",year:"numeric"});
   const time=d.toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"});
   const total=Number(o.total)||0;
   const paid=Number(o.paid)||0;
   const due=Math.max(0,Number(o.due ?? (total-paid)));
   const status=due<=0.000001?"مخلصة كاملة":paid>0?"مخلصة جزئياً":"غير مخلصة";
   const statusClass=due<=0.000001?"paid":paid>0?"partial":"unpaid";
   return `<div class="order-row ${statusClass}" data-order-open="${esc(o.id)}" tabindex="0" role="button">
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
       <span class="profit">ربح: ${money(o.profit)} DH</span>
       ${due>0?`<button class="payment-btn" data-order-pay="${o.id}">💰 تسجيل الخلاص</button>`:`<span class="paid-label">✓ مخلصة</span>`}
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
}
function openOrdersModal(){renderOrders();$("ordersModal").classList.add("show")}
function closeOrdersModal(){$("ordersModal").classList.remove("show")}

function orderItemsForDisplay(order){
 return (order.items||[]).map(row=>{
   const p=products.find(x=>x.id===row.id)||{};
   const boxes=Number(row.qty)||0;
   const units=Number(row.units ?? p.qty)||0;
   const unitPrice=Number(row.unitPrice ?? p.price)||0;
   const name=row.name || p.name || "Produit";
   const lineTotal=Number(row.lineTotal ?? (unitPrice*units*boxes)) || 0;
   return {name,boxes,units,unitPrice,lineTotal};
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
 const paid=Number(o.paid)||0;
 const due=Math.max(0,Number(o.due ?? total-paid));
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
         <strong>${esc(it.name)}</strong>
         <span>${it.boxes}</span>
         <span>${it.units}</span>
         <span>${money(it.unitPrice)} DH</span>
         <b>${money(it.lineTotal)} DH</b>
       </div>`).join(""):`<div class="detail-empty">Aucun produit enregistré dans cette commande.</div>`}
   </div>
   <div class="detail-total"><span>Total Payé</span><strong>${money(total)} DH</strong></div>
   <div class="detail-payment"><span>Déjà encaissé</span><strong>${money(paid)} DH</strong><span>Reste</span><strong>${money(due)} DH</strong></div>
   ${o.note?`<div class="detail-note">${esc(o.note)}</div>`:""}
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
 $("editId").value=p?.id||"";$("name").value=p?.name||"";$("price").value=p?.price??"";$("costPrice").value=p?.costPrice??0;$("qty").value=p?.qty??"";
 $("category").value=p?.category||active;$("availability").value=p?.availability==="unavailable"?"unavailable":"available";$("description").value=p?.description||"";selectedImage=p?.image||"";
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
 const data={id,name:$("name").value.trim(),price:Number($("price").value),costPrice:Number($("costPrice").value)||0,qty:Number($("qty").value),category:$("category").value,availability:$("availability").value,description:$("description").value.trim(),image:selectedImage};
 const i=products.findIndex(p=>p.id===id);
 const old=i>=0?products[i]:null;
 if(i>=0) products[i]=data; else products.unshift(data);
 if(!save()){
   await compactProductsImages();
   if(!save()){ if(i>=0) products[i]=old; else products=products.filter(p=>p.id!==id); return; }
 }
 selectedProductId=id;active=data.category;closeForm();render();toast(i>=0?"Produit modifié":"Produit ajouté");e.target.reset();selectedImage="";
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
 $("viewerCategory").textContent=p.category;
 $("viewerDescription").textContent=available?(p.description||"Produit disponible"):unavailableText();
 $("viewerPrice2").textContent=`${money(p.price)} DH`;
 $("viewerStock").textContent=p.qty;
 $("stockText").textContent="unités par boîte";

 $("viewerImageName").textContent=p.name;
 $("viewerImageUnits").textContent=`${p.qty} unités / boîte`;
 $("viewerImagePrice").textContent=`${money(p.price)} DH`;

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
$("search").oninput=render;
$("cartBtn").onclick=openCart;
$("closeCart").onclick=closeCart;
$("cartOverlay").onclick=closeCart;
$("clearCart").onclick=()=>{cart=[];saveCart();toast("Panier vidé")};
$("sendCart").onclick=sendCartOrder;

$("sendOrderSave").onclick=openOrderModal;
$("closeOrder").onclick=closeOrderModal;
$("orderModal").onclick=e=>{if(e.target===$("orderModal"))closeOrderModal()};
$("orderForm").onsubmit=saveOrder;
$("menuOrders").onclick=()=>{$("actionMenu").classList.remove("show");openOrdersModal()};
$("closeOrders").onclick=closeOrdersModal;
$("closeOrderDetail").onclick=closeOrderDetail;
$("orderDetailModal").onclick=e=>{if(e.target===$("orderDetailModal"))closeOrderDetail()};
$("ordersModal").onclick=e=>{if(e.target===$("ordersModal"))closeOrdersModal()};
$("orderSearch").oninput=renderOrders;
$("clearOrders").onclick=()=>{if(!orders.length)return;if(confirm("مسح جميع الطلبات؟")){orders=[];localStorage.setItem("3d_peintures_orders_v1","[]");renderOrders();toast("تم مسح الطلبات")}};

$("openClientFormFromOrder").onclick=()=>openClientModal($("orderClient").value.trim());
$("closeClientModal").onclick=closeClientModal;
$("clientModal").onclick=e=>{if(e.target===$("clientModal"))closeClientModal()};
$("clientForm").onsubmit=saveClientForm;
$("menuClients").onclick=()=>{$("actionMenu").classList.remove("show");openClientModal()};

renderCart();
render();

/* ===== SLIDER — auto only, no arrows, no dots ===== */
(function(){
  const wrap  = document.getElementById('sliderWrap');
  const track = document.getElementById('sliderTrack');
  if(!track || !wrap) return;
  const slides = Array.from(track.querySelectorAll('.slide'));
  const total = slides.length;
  if(total === 0) return;
  let current = 0, autoTimer;

  // Ken Burns variants per slide
  const kbAnims = ['kenBurns','kenBurns2','kenBurns3','kenBurns','kenBurns3','kenBurns2'];

  function applyKB(slide, idx){
    const img = slide.querySelector('img');
    if(!img) return;
    img.style.animation = 'none';
    void img.offsetWidth;
    img.style.animation = kbAnims[idx % kbAnims.length] + ' 6.5s ease-out forwards';
  }

  function goTo(n){
    const prev = current;
    current = (n + total) % total;
    if(prev === current) return;
    slides[prev].classList.remove('active');
    slides[prev].classList.add('prev');
    setTimeout(()=> slides[prev].classList.remove('prev'), 900);
    applyKB(slides[current], current);
    slides[current].classList.add('active');
  }

  // Init first slide
  slides[0].classList.add('active');
  applyKB(slides[0], 0);

  // Auto every 4s
  autoTimer = setInterval(()=> goTo(current + 1), 4000);
})();

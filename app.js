const KEY="3d_peintures_catalog_v3";
const categories=["Produits","Essence Jupiter","Diluant","Colle","Peinture"];
let products=JSON.parse(localStorage.getItem(KEY)||"[]");
let active="Produits", selectedImage="", selectedProductId=null, viewerBoxQty=1;
let cart=JSON.parse(localStorage.getItem("3d_peintures_cart_v4")||"[]");
const $=id=>document.getElementById(id);

function save(){localStorage.setItem(KEY,JSON.stringify(products))}
function saveCart(){localStorage.setItem("3d_peintures_cart_v4",JSON.stringify(cart));renderCart()}
function isAvailable(p){ return p && p.availability !== "unavailable"; }
function unavailableText(){ return "غير موجود حالياً — هاد المنتوج غير متوفر حالياً"; }
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
 document.querySelectorAll(".photo").forEach(x=>x.onclick=e=>{e.stopPropagation();selectedProductId=x.dataset.id;view(x.dataset.id)});
 document.querySelectorAll(".card").forEach(x=>x.onclick=()=>{selectedProductId=x.dataset.id;});
 
}

function card(p){
 const low=Number(p.qty)<=5, available=isAvailable(p);
 return `<article class="card ${selectedProductId===p.id?"selected":""}" data-id="${p.id}">
  <div class="photo ${available?"":"is-unavailable"}" data-id="${p.id}">
   ${p.image?`<img src="${p.image}" alt="">`:`<div class="no-photo">🎨</div>`}
   <span class="badge">${esc(p.category)}</span>
   ${available?"":`<div class="unavailable-card-overlay"><span>غير موجود</span></div>`}
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
   cart:cart
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
     if(!confirm(`Restaurer ${data.products.length} produit(s) et leurs photos ?\n\nLes données actuelles seront remplacées.`))return;
     products=data.products;
     cart=Array.isArray(data.cart)?data.cart:[];
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

/* form */
function openForm(p=null){
 $("formModal").classList.add("show");$("modalTitle").textContent=p?"Modifier le produit":"Nouveau produit";
 $("editId").value=p?.id||"";$("name").value=p?.name||"";$("price").value=p?.price??"";$("qty").value=p?.qty??"";
 $("category").value=p?.category||active;$("availability").value=p?.availability==="unavailable"?"unavailable":"available";$("description").value=p?.description||"";selectedImage=p?.image||"";
 if(selectedImage){$("preview").src=selectedImage;$("photoPicker").classList.add("has-image")}else{$("preview").src="";$("photoPicker").classList.remove("has-image")}
}
function closeForm(){$("formModal").classList.remove("show")}
$("closeForm").onclick=closeForm;
$("formModal").onclick=e=>{if(e.target===$("formModal"))closeForm()};
$("imageInput").onchange=e=>{
 const f=e.target.files[0];if(!f)return;const r=new FileReader();
 r.onload=ev=>{selectedImage=ev.target.result;$("preview").src=selectedImage;$("photoPicker").classList.add("has-image")};r.readAsDataURL(f);
};
$("productForm").onsubmit=e=>{
 e.preventDefault();const id=$("editId").value||crypto.randomUUID();
 const data={id,name:$("name").value.trim(),price:Number($("price").value),qty:Number($("qty").value),category:$("category").value,availability:$("availability").value,description:$("description").value.trim(),image:selectedImage};
 const i=products.findIndex(p=>p.id===id);if(i>=0){products[i]=data}else{products.unshift(data)}selectedProductId=id;active=data.category;save();closeForm();render();toast(i>=0?"Produit modifié":"Produit ajouté");e.target.reset();selectedImage="";
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

function view(id){
 const p=products.find(x=>x.id===id);if(!p)return;
 selectedProductId=id;
 viewerBoxQty=1;
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
   addToCart(p.id, viewerBoxQty);
   $("viewer").classList.remove("show");
   return false;
 };
 $("viewer").classList.add("show");
}
$("viewerMinus").onclick=()=>{
 if(viewerBoxQty>1){viewerBoxQty--; const p=products.find(x=>x.id===selectedProductId); if(p)updateViewerBoxTotal(p);}
};
$("viewerPlus").onclick=()=>{
 viewerBoxQty++; const p=products.find(x=>x.id===selectedProductId); if(p)updateViewerBoxTotal(p);
};
$("closeViewer").onclick=()=>$("viewer").classList.remove("show");
$("viewer").onclick=e=>{if(e.target===$("viewer"))$("viewer").classList.remove("show")};
$("search").oninput=render;
$("cartBtn").onclick=openCart;
$("closeCart").onclick=closeCart;
$("cartOverlay").onclick=closeCart;
$("clearCart").onclick=()=>{cart=[];saveCart();toast("Panier vidé")};
renderCart();
render();

const KEY='zamzam_catalog_v1';
const categories=['Produits','Essence Jupiter','Diluant','Colle','Peinture'];
let products=JSON.parse(localStorage.getItem(KEY)||'[]');
let active='Produits';
let selectedImage='';
const $=id=>document.getElementById(id);

function save(){localStorage.setItem(KEY,JSON.stringify(products))}
function toast(t){const x=$('toast');x.textContent=t;x.classList.add('show');setTimeout(()=>x.classList.remove('show'),1800)}
function renderCategories(){
  $('categories').innerHTML=categories.map(c=>`<button class="cat ${active===c?'active':''}" data-cat="${c}">${c}</button>`).join('');
  document.querySelectorAll('.cat').forEach(b=>b.onclick=()=>{active=b.dataset.cat;render()});
}
function render(){
  renderCategories();
  $('sectionTitle').textContent=active;
  const q=$('search').value.trim().toLowerCase();
  const list=products.filter(p=>p.category===active && (!q || p.name.toLowerCase().includes(q)));
  $('count').textContent=`${list.length} produit${list.length!==1?'s':''}`;
  $('grid').innerHTML=list.map(p=>card(p)).join('');
  $('empty').style.display=list.length?'none':'block';
  document.querySelectorAll('.edit').forEach(b=>b.onclick=()=>edit(b.dataset.id));
  document.querySelectorAll('.delete').forEach(b=>b.onclick=()=>removeProduct(b.dataset.id));
}
function card(p){
 const low=Number(p.qty)<=5;
 return `<article class="card">
   <div class="photo">${p.image?`<img src="${p.image}" alt="">`:'<div class="no-photo">📦</div>'}<span class="badge">${p.category}</span></div>
   <div class="card-body">
    <h3>${esc(p.name)}</h3>
    <div class="desc">${esc(p.description||'Produit disponible')}</div>
    <div class="price">${money(p.price)} <small>DH</small></div>
    <div class="stock ${low?'low':''}">Stock : ${p.qty}${low?' • Stock faible':''}</div>
    <div class="actions"><button class="action edit" data-id="${p.id}">Modifier</button><button class="action delete" data-id="${p.id}">Supprimer</button></div>
   </div>
 </article>`
}
function esc(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}
function money(v){return Number(v||0).toLocaleString('fr-FR',{minimumFractionDigits:2,maximumFractionDigits:2})}

function openModal(p=null){
 $('modal').classList.add('show');
 $('modalTitle').textContent=p?'Modifier le produit':'Nouveau produit';
 $('editId').value=p?.id||'';
 $('name').value=p?.name||'';
 $('price').value=p?.price??'';
 $('qty').value=p?.qty??'';
 $('category').value=p?.category||active;
 $('description').value=p?.description||'';
 selectedImage=p?.image||'';
 if(selectedImage){$('preview').src=selectedImage;$('photoPicker').classList.add('has-image')}else{$('preview').src='';$('photoPicker').classList.remove('has-image')}
}
function closeModal(){$('modal').classList.remove('show')}
function edit(id){const p=products.find(x=>x.id===id);if(p)openModal(p)}
function removeProduct(id){if(confirm('Supprimer ce produit ?')){products=products.filter(p=>p.id!==id);save();render();toast('Produit supprimé')}}
function readImage(file){
 if(!file)return;
 const r=new FileReader();
 r.onload=e=>{selectedImage=e.target.result;$('preview').src=selectedImage;$('photoPicker').classList.add('has-image')};
 r.readAsDataURL(file);
}
$('imageInput').onchange=e=>readImage(e.target.files[0]);
$('productForm').onsubmit=e=>{
 e.preventDefault();
 const id=$('editId').value||crypto.randomUUID();
 const data={id,name:$('name').value.trim(),price:Number($('price').value),qty:Number($('qty').value),category:$('category').value,description:$('description').value.trim(),image:selectedImage};
 const i=products.findIndex(p=>p.id===id);
 if(i>=0)products[i]=data;else products.unshift(data);
 active=data.category;save();closeModal();render();toast(i>=0?'Produit modifié':'Produit ajouté');
 e.target.reset();selectedImage='';
};
function backup(){
 const blob=new Blob([JSON.stringify(products,null,2)],{type:'application/json'});
 const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='zamzam-catalog-backup.json';a.click();URL.revokeObjectURL(a.href);toast('Sauvegarde téléchargée');
}
function importBackup(){
 const input=document.createElement('input');input.type='file';input.accept='.json';
 input.onchange=e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{try{const x=JSON.parse(r.result);if(!Array.isArray(x))throw 0;products=x;save();render();toast('Sauvegarde importée')}catch{toast('Fichier invalide')}};r.readAsText(f)};input.click();
}
$('closeModal').onclick=closeModal;
$('modal').onclick=e=>{if(e.target===$('modal'))closeModal()};
$('addTop').onclick=$('heroAdd').onclick=$('emptyAdd').onclick=$('navAdd').onclick=()=>openModal();
$('backupBtn').onclick=$('navBackup').onclick=()=>{if(products.length)backup();else toast('Aucun produit à sauvegarder')};
$('search').oninput=render;
render();

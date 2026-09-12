/* Supabase: autenticación privada. La conexión de datos se incorporará en el siguiente paso. */
let supabaseClient = null;
let authUser = null;
async function initSupabaseAuth(){
  const cfg=window.SUPABASE_CONFIG||{};
  if(!window.supabase || !cfg.url || !cfg.publishableKey || cfg.publishableKey.includes('PEGA_AQUI')){
    console.warn('Supabase no está configurado todavía.');
    return false;
  }
  supabaseClient=window.supabase.createClient(cfg.url,cfg.publishableKey);
  const {data,error}=await supabaseClient.auth.getSession();
  if(error || !data.session){ location.replace('login.html'); return false; }
  authUser=data.session.user;
  renderAuthUI();
  supabaseClient.auth.onAuthStateChange((event,session)=>{
    if(event==='SIGNED_OUT'){ location.replace('login.html'); }
    else if(session){ authUser=session.user; renderAuthUI(); }
  });
  return true;
}
function renderAuthUI(){
  document.querySelectorAll('.site-header nav').forEach(nav=>{
    if(nav.querySelector('.auth-user')) return;
    const wrap=document.createElement('span');
    wrap.className='auth-user';
    wrap.innerHTML=`<span>${escAuth(authUser?.email||'')}</span><button class="logout-btn" type="button">Salir</button>`;
    nav.appendChild(wrap);
    wrap.querySelector('.logout-btn').onclick=()=>supabaseClient?.auth.signOut();
  });
}
function escAuth(v){return String(v||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));}

/* V1 — estructura preparada para crecer: ficha base + especificaciones por categoría. */
const products = [
  {id:1, name:"Vruna", slug:"vruna", brand:"Nihm", sku:"NIHM-VRUNA", collection:"—", designer:"—", manufacturer:"Nihm", year:"—", category:"Mobiliario", subcategory:"Silla", description:"Silla de líneas contemporáneas para proyectos de interiorismo.", images:["Foto principal","Vista lateral","Detalle material"], variants:["Natural"], materials:["Madera"], construction:"Madera", finish:["Madera natural"], surfaceTexture:"Lisa", colors:["Natural"], dimensions:{width:"—",height:"—",depth:"—"}, style:["Contemporáneo"], applications:["Residencial","Comercial"], indoorOutdoor:"Interior", price:null, currency:"PEN", priceLastUpdated:"—", availability:"Consultar", leadTime:"—", minimumOrder:"—", warranty:"—", countryOfOrigin:"Perú", certifications:[], maintenance:"—", files:{CAD:[],SKP:[],RVT:[],BIM:["3D"],textures:[],PDF:[]}, supplier:{website:"—",contact:"—",showroom:"—"}, sample:{available:false,size:"—"}, tone1:"#e6dfd3",tone2:"#c8bcaa"},
  {id:2, name:"Silla de comedor", slug:"silla-de-comedor", brand:"Marca por añadir", sku:"—", collection:"—", designer:"—", manufacturer:"—", year:"—", category:"Mobiliario", subcategory:"Silla", description:"Modelo de muestra para nuestra biblioteca.", images:["Foto principal","Vista 3/4","Detalle"], variants:["Natural"], materials:["Madera"], construction:"—", finish:["Madera"], surfaceTexture:"Lisa", colors:["Natural"], dimensions:{width:"—",height:"—",depth:"—"}, style:["Minimalista"], applications:["Residencial"], indoorOutdoor:"Interior", price:null,currency:"PEN",priceLastUpdated:"—",availability:"Consultar",leadTime:"—",minimumOrder:"—",warranty:"—",countryOfOrigin:"—",certifications:[],maintenance:"—",files:{CAD:["CAD"],SKP:["3D"],RVT:[],BIM:[],textures:[],PDF:[]},supplier:{website:"—",contact:"—",showroom:"—"},sample:{available:false,size:"—"},tone1:"#ded7ca",tone2:"#b8aa98"},
  {id:3, name:"Luminaria decorativa", slug:"luminaria-decorativa", brand:"Marca por añadir", sku:"—", collection:"—", designer:"—", manufacturer:"—", year:"—", category:"Iluminación", subcategory:"Suspensión", description:"Luminaria decorativa de muestra.", images:["Foto principal","Vista encendida","Detalle"], variants:["Negro"], materials:["Metal"], construction:"Metal", finish:["Metal pintado"], surfaceTexture:"Lisa", colors:["Negro"], dimensions:{width:"—",height:"—",depth:"—"}, style:["Contemporáneo"], applications:["Comercial","Hospitality"], indoorOutdoor:"Interior", price:null,currency:"PEN",priceLastUpdated:"—",availability:"Consultar",leadTime:"—",minimumOrder:"—",warranty:"—",countryOfOrigin:"—",certifications:[],maintenance:"—",files:{CAD:["CAD"],SKP:["3D"],RVT:[],BIM:["BIM"],textures:[],PDF:[]},supplier:{website:"—",contact:"—",showroom:"—"},sample:{available:false,size:"—"},technical:{power:"—",lumens:"—",colorTemperature:"—",CRI:"—",IP:"—",dimmable:"—"},tone1:"#ddd9d1",tone2:"#a7a197"},
  {id:4, name:"Lavatorio", slug:"lavatorio", brand:"Marca por añadir", sku:"—", collection:"—", designer:"—", manufacturer:"—", year:"—", category:"Baño", subcategory:"Lavatorio", description:"Producto de baño de muestra.", images:["Foto principal","Vista superior","Detalle"], variants:["Blanco"], materials:["Cerámica"], construction:"Cerámica vitrificada", finish:["Cerámica vitrificada"], surfaceTexture:"Lisa", colors:["Blanco"], dimensions:{width:"—",height:"—",depth:"—"}, style:["Minimalista"], applications:["Residencial","Comercial"], indoorOutdoor:"Interior", price:null,currency:"PEN",priceLastUpdated:"—",availability:"Consultar",leadTime:"—",minimumOrder:"—",warranty:"—",countryOfOrigin:"—",certifications:[],maintenance:"—",files:{CAD:["CAD"],SKP:[],RVT:[],BIM:["BIM"],textures:[],PDF:[]},supplier:{website:"—",contact:"—",showroom:"—"},sample:{available:false,size:"—"},technical:{installation:"—",waterConsumption:"—",flowRate:"—"},tone1:"#e9e7e1",tone2:"#c7c4bd"},
  {id:5, name:"Porcelanato", slug:"porcelanato", brand:"Marca por añadir", sku:"—", collection:"—", designer:"—", manufacturer:"—", year:"—", category:"Acabados", subcategory:"Revestimiento", description:"Superficie de muestra para pisos y revestimientos.", images:["Foto principal","Textura","Aplicación"], variants:["Beige"], materials:["Porcelánico"], construction:"Porcelánico", finish:["Mate"], surfaceTexture:"Mate", colors:["Beige"], dimensions:{width:"—",height:"—",depth:"—",thickness:"—"}, style:["Orgánico"], applications:["Residencial","Comercial","Hospitality"], indoorOutdoor:"Interior / Exterior", price:null,currency:"PEN",priceLastUpdated:"—",availability:"Consultar",leadTime:"—",minimumOrder:"—",warranty:"—",countryOfOrigin:"—",certifications:[],maintenance:"—",files:{CAD:[],SKP:[],RVT:[],BIM:[],textures:[],PDF:["Ficha"]},supplier:{website:"—",contact:"—",showroom:"—"},sample:{available:false,size:"—"},technical:{format:"—",rectified:"—",shadeVariation:"—",slipRating:"—",piecesPerBox:"—",coveragePerBox:"—",recommendedGrout:"—"},tone1:"#ddd3c3",tone2:"#b7aa97"},
  {id:6, name:"Sofá modular", slug:"sof-modular", brand:"Marca por añadir", sku:"—", collection:"—", designer:"—", manufacturer:"—", year:"—", category:"Mobiliario", subcategory:"Sofá", description:"Sofá modular de muestra para proyectos residenciales y hospitality.", images:["Foto principal","Vista lateral","Detalle textil"], variants:["Crudo"], materials:["Textil","Madera"], construction:"Estructura de madera", finish:["Tapizado"], surfaceTexture:"Textil", colors:["Crudo"], dimensions:{width:"—",height:"—",depth:"—"}, style:["Contemporáneo"], applications:["Residencial","Hospitality"], indoorOutdoor:"Interior", price:null,currency:"PEN",priceLastUpdated:"—",availability:"Consultar",leadTime:"—",minimumOrder:"—",warranty:"—",countryOfOrigin:"—",certifications:[],maintenance:"—",files:{CAD:[],SKP:["3D"],RVT:[],BIM:[],textures:[],PDF:[]},supplier:{website:"—",contact:"—",showroom:"—"},sample:{available:false,size:"—"},tone1:"#e2ddd5",tone2:"#b9b1a6"},
  {id:7, name:"Mesa auxiliar", slug:"mesa-auxiliar", brand:"Marca por añadir", sku:"—", collection:"—", designer:"—", manufacturer:"—", year:"—", category:"Mobiliario", subcategory:"Mesa", description:"Mesa auxiliar de muestra.", images:["Foto principal","Vista lateral","Detalle material"], variants:["Crema"], materials:["Piedra"], construction:"—", finish:["Piedra natural"], surfaceTexture:"—", colors:["Crema"], dimensions:{width:"—",height:"—",depth:"—"}, style:["Orgánico"], applications:["Residencial"], indoorOutdoor:"Interior", price:null,currency:"PEN",priceLastUpdated:"—",availability:"Consultar",leadTime:"—",minimumOrder:"—",warranty:"—",countryOfOrigin:"—",certifications:[],maintenance:"—",files:{CAD:[],SKP:["3D"],RVT:[],BIM:[],textures:[],PDF:[]},supplier:{website:"—",contact:"—",showroom:"—"},sample:{available:false,size:"—"},tone1:"#e2d8c9",tone2:"#b9aa98"},
  {id:8, name:"Aplique mural", slug:"aplique-mural", brand:"Marca por añadir", sku:"—", collection:"—", designer:"—", manufacturer:"—", year:"—", category:"Iluminación", subcategory:"Aplique", description:"Aplique mural de muestra.", images:["Foto principal","Vista encendida","Detalle"], variants:["Negro"], materials:["Metal"], construction:"Metal", finish:["Metal pintado"], surfaceTexture:"Lisa", colors:["Negro"], dimensions:{width:"—",height:"—",depth:"—"}, style:["Minimalista"], applications:["Residencial","Comercial"], indoorOutdoor:"Interior", price:null,currency:"PEN",priceLastUpdated:"—",availability:"Consultar",leadTime:"—",minimumOrder:"—",warranty:"—",countryOfOrigin:"—",certifications:[],maintenance:"—",files:{CAD:["CAD"],SKP:[],RVT:[],BIM:["BIM"],textures:[],PDF:[]},supplier:{website:"—",contact:"—",showroom:"—"},sample:{available:false,size:"—"},technical:{power:"—",lumens:"—",colorTemperature:"—",CRI:"—",IP:"—",dimmable:"—"},tone1:"#d9d6d0",tone2:"#9c9992"}
];
const categories=[["🪑","Mobiliario","Sillas, mesas, sofás..."],["💡","Iluminación","Decorativa y técnica"],["🚿","Baño","Sanitarios y griferías"],["🧱","Acabados","Pisos y revestimientos"],["🪵","Maderas","Tableros y enchapes"],["🪨","Piedras","Mármol, cuarzo, sinterizados"],["🧵","Textiles","Telas, cortinas, alfombras"],["🌿","Exterior","Mobiliario y jardín"]];
let savedFavorites=[]; let savedProjects=[];
try{savedFavorites=JSON.parse(localStorage.getItem("ci-favorites")||"[]");if(!Array.isArray(savedFavorites))savedFavorites=[];}catch(e){savedFavorites=[];}
try{savedProjects=JSON.parse(localStorage.getItem("ci-projects")||"[]");if(!Array.isArray(savedProjects))savedProjects=[];}catch(e){savedProjects=[];}
const state={filter:{category:"Todos",material:"Todos",style:"Todos",file:"Todos",availability:"Todos",application:"Todos"},favorites:new Set(savedFavorites),projects:savedProjects};
const $=id=>document.getElementById(id); const arr=v=>Array.isArray(v)?v:(v?[v]:[]); const esc=v=>String(v??"—").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[c]));
function save(){localStorage.setItem("ci-favorites",JSON.stringify([...state.favorites]));localStorage.setItem("ci-projects",JSON.stringify(state.projects));}
function toast(msg){const t=$("toast");t.textContent=msg;t.classList.add("show");clearTimeout(window._toast);window._toast=setTimeout(()=>t.classList.remove("show"),1800)}
function uniqueValues(fn){return [...new Set(products.flatMap(fn).filter(Boolean))].sort()}

function slugify(v){return String(v||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"")}
function productCardHTML(p){
  const files=allFiles(p);
  const isFav=state.favorites.has(p.id);
  return `<article class="product-card" data-product-id="${p.id}">
    <div class="product-image" style="--tone1:${p.tone1||'#e6dfd3'};--tone2:${p.tone2||'#c8bcaa'}">
      <span class="image-placeholder" aria-hidden="true"></span>
      <button class="favorite-btn ${isFav?'saved':''}" data-favorite="${p.id}" aria-label="${isFav?'Quitar de favoritos':'Guardar en favoritos'}">${isFav?'♥':'♡'}</button>
      <span class="product-file-count">${files.length?files.slice(0,3).map(esc).join(' · '):'Sin archivos'}</span>
    </div>
    <div class="product-info">
      <p class="product-category">${esc(p.category)} · ${esc(p.subcategory)}</p>
      <h3>${esc(p.name)}</h3>
      <p class="product-brand">${esc(p.brand)}</p>
      <div class="product-bottom"><span>${p.price==null?'Consultar precio':esc(p.currency==='PEN'?`S/ ${p.price}`:p.price)}</span><span>${esc(p.materials.join(', '))}</span></div>
      <div class="product-actions"><button class="quick-view" data-quick-view="${p.id}">Vista rápida</button><a class="text-link" href="producto.html?slug=${encodeURIComponent(p.slug)}">Ver ficha →</a></div>
    </div>
  </article>`;
}
function bindProductCards(){
  document.querySelectorAll('[data-quick-view]').forEach(b=>b.onclick=()=>openProduct(Number(b.dataset.quickView)));
  document.querySelectorAll('[data-favorite]').forEach(b=>b.onclick=(e)=>{e.preventDefault();e.stopPropagation();toggleFavorite(Number(b.dataset.favorite));});
}
function initIndexPage(){
  if(!$('categoryGrid') || !$('productGrid')) return;
  renderCategories(); renderFilters(); renderProducts(); renderBrands(); updateCounts();
  if($('searchInput')) $('searchInput').oninput=renderProducts;
  if($('filterToggle')) $('filterToggle').onclick=()=>{$('filterPanel').classList.toggle('open');$('filterToggle').querySelector('span').textContent=$('filterPanel').classList.contains('open')?'−':'＋'};
}
function renderCategories(){if(!$('categoryGrid'))return;$('categoryGrid').innerHTML=categories.map(([s,n,d])=>`<a class="category" href="categoria.html?slug=${encodeURIComponent(slugify(n))}"><span class="symbol">${s}</span><div><strong>${esc(n)}</strong><small>${esc(d)}</small></div><span class="category-arrow">→</span></a>`).join("")}
function renderChips(id,values,key){if(!$('id'))return;$(id).innerHTML=["Todos",...values].map(v=>`<button class="chip ${state.filter[key]===v?"active":""}" data-key="${key}" data-value="${esc(v)}">${esc(v)}</button>`).join("");document.querySelectorAll(`#${id} .chip`).forEach(b=>b.onclick=()=>{state.filter[b.dataset.key]=b.dataset.value;renderFilters();renderProducts()})}
function renderFilters(){renderChips("categoryFilters",uniqueValues(p=>[p.category]),"category");renderChips("materialFilters",uniqueValues(p=>p.materials),"material");renderChips("styleFilters",uniqueValues(p=>p.style),"style");renderChips("fileFilters",["CAD","3D","BIM","Ficha"],"file");renderChips("availabilityFilters",uniqueValues(p=>[p.availability]),"availability");renderChips("applicationFilters",uniqueValues(p=>p.applications),"application")}
function allFiles(p){return Object.entries(p.files||{}).flatMap(([k,v])=>arr(v).map(x=>x||k));}
function matches(p){const q=$("searchInput").value.toLowerCase().trim();const hay=[p.name,p.brand,p.sku,p.collection,p.category,p.subcategory,p.description,...p.materials,...p.colors,...p.style,...p.applications].join(" ").toLowerCase();return(state.filter.category==="Todos"||p.category===state.filter.category)&&(state.filter.material==="Todos"||p.materials.includes(state.filter.material))&&(state.filter.style==="Todos"||p.style.includes(state.filter.style))&&(state.filter.file==="Todos"||allFiles(p).some(f=>f.toLowerCase().includes(state.filter.file.toLowerCase())))&&(state.filter.availability==="Todos"||p.availability===state.filter.availability)&&(state.filter.application==="Todos"||p.applications.includes(state.filter.application))&&(!q||hay.includes(q))}
function renderProducts(){const list=products.filter(matches);if($("resultsCount")) $("resultsCount").textContent=`${list.length} productos`;if($("productGrid")) $("productGrid").innerHTML=list.length?list.map(productCardHTML).join(""):`<p class="empty">No encontramos productos con esos criterios.</p>`;bindProductCards()}
function updateCounts(){if($("favoriteCount")) $("favoriteCount").textContent=state.favorites.size;if($("projectCount")) $("projectCount").textContent=state.projects.length}
function detail(label,value){return `<div class="detail"><strong>${esc(label)}</strong>${esc(value||"—")}</div>`}
function technicalDetails(p){const t=p.technical||{};const map={power:"Potencia",lumens:"Lúmenes",colorTemperature:"Temperatura de color",CRI:"CRI",IP:"IP",dimmable:"Dimerizable",installation:"Instalación",waterConsumption:"Consumo de agua",flowRate:"Caudal",format:"Formato",rectified:"Rectificado",shadeVariation:"Variación de tono",slipRating:"Antideslizante",piecesPerBox:"Piezas/caja",coveragePerBox:"m²/caja",recommendedGrout:"Boquilla recomendada"};return Object.entries(map).filter(([k])=>t[k]&&t[k]!=="—").map(([k,l])=>detail(l,t[k])).join("")}
function openProduct(id){const p=products.find(x=>x.id===id);if(!p||!$("productModal")||!( $("modalContent") )){toast("No se pudo abrir la vista rápida");return;}const images=p.images||[];const files=allFiles(p);$("modalContent").innerHTML=`<div class="modal-content"><div class="gallery"><div class="gallery-main" id="galleryMain" style="background:linear-gradient(145deg,${p.tone1},${p.tone2})"><span class="gallery-label" id="galleryLabel" aria-hidden="true"></span><button class="gallery-arrow prev" id="galleryPrev">‹</button><button class="gallery-arrow next" id="galleryNext">›</button><span class="gallery-counter" id="galleryCounter">1 / ${images.length}</span></div><div class="gallery-thumbs">${images.map((im,i)=>`<button class="gallery-thumb ${i===0?'active':''}" data-gallery="${i}" style="background:linear-gradient(145deg,${p.tone1},${p.tone2})">${esc(im)}</button>`).join("")}</div></div><div class="modal-info"><p class="eyebrow">${esc(p.category)} · ${esc(p.subcategory)}</p><h3>${esc(p.name)}</h3><div class="modal-brand">${esc(p.brand)} · ${esc(p.collection)}</div><div class="modal-price">${p.price==null?"Consultar precio":esc(p.currency==="PEN"?`S/ ${p.price}`:p.price)}</div><p class="modal-description">${esc(p.description)}</p><div class="detail-grid">${detail("SKU",p.sku)}${detail("Diseñador",p.designer)}${detail("Fabricante",p.manufacturer)}${detail("Año",p.year)}${detail("Materialidad",p.materials.join(", "))}${detail("Construcción",p.construction)}${detail("Acabado",p.finish.join(", "))}${detail("Textura",p.surfaceTexture)}${detail("Color",p.colors.join(", "))}${detail("Variantes",p.variants.join(", "))}${detail("Dimensiones",Object.values(p.dimensions||{}).filter(Boolean).join(" × ")||"—")}${detail("Estilo",p.style.join(", "))}${detail("Uso",p.applications.join(", "))}${detail("Interior / exterior",p.indoorOutdoor)}${detail("Disponibilidad",p.availability)}${detail("Tiempo de entrega",p.leadTime)}${detail("Pedido mínimo",p.minimumOrder)}${detail("Garantía",p.warranty)}${detail("Origen",p.countryOfOrigin)}${detail("Precio actualizado",p.priceLastUpdated)}${detail("Mantenimiento",p.maintenance)}${technicalDetails(p)}</div><div class="file-section"><span class="file-title">ARCHIVOS DISPONIBLES</span><div class="badges">${files.map(f=>`<span class="badge">${esc(f)}</span>`).join("")||'<span class="empty">Pendiente</span>'}</div></div><div class="modal-actions"><button class="primary" onclick="openProjectPicker(${p.id});closeModal('productModal')">＋ Añadir a proyecto</button><button onclick="toggleFavorite(${p.id})">♡ Favorito</button></div></div></div>`;let gi=0;const show=i=>{gi=(i+images.length)%images.length;$("galleryLabel").textContent=images[gi];$("galleryCounter").textContent=`${gi+1} / ${images.length}`;document.querySelectorAll('.gallery-thumb').forEach((b,j)=>b.classList.toggle('active',j===gi))};$("galleryPrev").onclick=()=>show(gi-1);$("galleryNext").onclick=()=>show(gi+1);document.querySelectorAll('.gallery-thumb').forEach(b=>b.onclick=()=>show(+b.dataset.gallery));$("productModal").classList.add('open')}
function closeModal(id){$(id).classList.remove("open")}
function toggleFavorite(id){
  state.favorites.has(id)?state.favorites.delete(id):state.favorites.add(id);
  save(); updateCounts();
  if($("productGrid")) renderProducts();
  if($("favoritesProductGrid")) renderFavoritesPage();
  if($("categoryProductGrid")) renderCategoryPage();
  const cardBtn=document.querySelector(`[data-favorite="${id}"]`);
  if(cardBtn){const on=state.favorites.has(id);cardBtn.classList.toggle("saved",on);cardBtn.textContent=on?"♥":"♡";cardBtn.setAttribute("aria-label",on?"Quitar de favoritos":"Guardar en favoritos");}
  toast(state.favorites.has(id)?"Guardado en favoritos":"Eliminado de favoritos");
}
function openDrawer(){if(!$('projectDrawer'))return;$("projectDrawer").classList.add("open");$("drawerBackdrop").classList.add("open");renderProjects()};function closeDrawer(){if(!$('projectDrawer'))return;$("projectDrawer").classList.remove("open");$("drawerBackdrop").classList.remove("open")}
function renderProjects(){const list=$("projectList");if(!state.projects.length){list.innerHTML='<div class="empty">Todavía no tienes proyectos.<br>Créelos arriba y luego guarda productos dentro de ellos.</div>';return}list.innerHTML=state.projects.map((p,i)=>`<article class="project-card"><div class="project-title"><strong>${esc(p.name)}</strong><span class="project-count">${p.items.length} productos</span></div>${p.items.length?`<div class="project-items">${p.items.map(id=>{const x=products.find(z=>z.id===id);return `<div class="mini-item">${x?esc(x.name):"Producto"}</div>`}).join("")}</div>`:'<div class="empty">Sin productos todavía.</div>'}</article>`).join("")}
let pendingProductId=null;function openProjectPicker(id){pendingProductId=id;const p=products.find(x=>x.id===id);$("projectPickerContent").innerHTML=`<div class="picker-head"><p class="eyebrow">GUARDAR PRODUCTO</p><h3>${esc(p.name)}</h3><p>${esc(p.brand)}</p></div><div class="picker-list">${state.projects.length?state.projects.map((project,i)=>`<button class="picker-project" data-project="${i}"><span class="picker-icon">＋</span><span><strong>${esc(project.name)}</strong><small>${project.items.length} productos guardados</small></span><span>›</span></button>`).join(""):'<div class="empty">Todavía no tienes proyectos.</div>'}</div><button class="new-project-inline" id="newProjectInline">＋ Crear nuevo proyecto</button>`;$("projectPicker").classList.add('open');document.querySelectorAll('.picker-project').forEach(b=>b.onclick=()=>{const i=+b.dataset.project;if(!state.projects[i].items.includes(pendingProductId))state.projects[i].items.push(pendingProductId);save();updateCounts();closeProjectPicker();renderProjects();toast(`Añadido a "${state.projects[i].name}"`)});$("newProjectInline").onclick=()=>{closeProjectPicker();openDrawer();$("projectNameInput").focus()}}
function closeProjectPicker(){$("projectPicker").classList.remove('open');pendingProductId=null}
function renderBrands(){if(!$('brandList'))return;const brands=[...new Set(products.map(p=>p.brand))].filter(Boolean).sort();$("brandList").innerHTML=brands.map(b=>`<button class="brand-pill" data-brand="${esc(b)}">${esc(b)}</button>`).join("");$("brandCount").textContent=`${brands.length} marcas de muestra`;document.querySelectorAll('[data-brand]').forEach(b=>b.onclick=()=>{const name=b.dataset.brand;$("searchInput").value=name;renderProducts();$("catalogo").scrollIntoView({behavior:'smooth'});toast(`Filtrando: ${name}`)})}
function initCommonUI(){
  if($("addProjectBtn")) $("addProjectBtn").onclick=()=>{const name=$("projectNameInput").value.trim();if(!name)return toast("Escribe un nombre para el proyecto");if(state.projects.some(p=>p.name.toLowerCase()===name.toLowerCase()))return toast("Ese proyecto ya existe");state.projects.push({name,items:[],createdAt:new Date().toISOString()});$("projectNameInput").value="";save();updateCounts();renderProjects();toast("Proyecto creado")};
  if($("projectsBtn")) $("projectsBtn").onclick=openDrawer;
  if($("drawerBackdrop")) $("drawerBackdrop").onclick=closeDrawer;
  if($("visualSearchBtn")) $("visualSearchBtn").onclick=()=>toast("Búsqueda visual: la conectaremos después de cargar imágenes reales");
  document.querySelectorAll("[data-close]").forEach(b=>b.onclick=()=>b.dataset.close==="productModal"?closeModal("productModal"):closeDrawer());
  if($("productModal")) $("productModal").onclick=e=>{if(e.target.id==="productModal")closeModal("productModal")};
  if($("projectPicker")) $("projectPicker").onclick=e=>{if(e.target.id==="projectPicker")closeProjectPicker()};
  if($("favoriteCount")) updateCounts();
}

(async()=>{
  const ok=await initSupabaseAuth();
  if(!ok) return;
  initCommonUI();
  initIndexPage();
})();

const categoryDescriptions={
  "mobiliario":"Sillas, mesas, sofás y piezas para equipar espacios.",
  "iluminacion":"Iluminación decorativa y técnica para proyectos de interiorismo.",
  "bano":"Sanitarios, lavatorios, griferías y accesorios.",
  "acabados":"Pisos, revestimientos y superficies para interiores y exteriores.",
  "maderas":"Tableros, enchapes y soluciones en madera.",
  "piedras":"Mármol, cuarzo, sinterizados y otras piedras.",
  "textiles":"Telas, cortinas, alfombras y soluciones textiles.",
  "exterior":"Mobiliario y productos pensados para espacios exteriores."
};
function renderCategoryPage(){
  const grid=$("categoryProductGrid"); if(!grid) return;
  const slug=new URLSearchParams(location.search).get("slug")||"";
  const category=categories.find(([,name])=>slugify(name)===slug);
  if(!category){ $("categoryTitle").textContent="Categoría no encontrada"; $("categoryDescription").textContent="La categoría que buscas no existe."; grid.innerHTML='<p class="empty">Vuelve al catálogo para explorar todas las categorías.</p>'; return; }
  const name=category[1]; const list=products.filter(p=>p.category===name);
  document.title=`${name} · Catálogo Interiorismo Perú`;
  $("categoryEyebrow").textContent="EXPLORAR · CATEGORÍA"; $("categoryTitle").textContent=name; $("categoryDescription").textContent=categoryDescriptions[slug]||category[2]; $("categoryResults").textContent=`${list.length} productos`;
  grid.innerHTML=list.length?list.map(productCardHTML).join(""): '<p class="empty">Todavía no hay productos en esta categoría.</p>';
  bindProductCards(); updateCounts();
}
function renderFavoritesPage(){
  const grid=$("favoritesProductGrid"); if(!grid) return;
  const list=products.filter(p=>state.favorites.has(p.id));
  document.title=`Mis favoritos · Catálogo Interiorismo Perú`;
  $("favoriteDescription").textContent=list.length?`${list.length} ${list.length===1?"producto guardado":"productos guardados"}.`:'Todavía no has guardado productos. Explora el catálogo y pulsa ♡ para añadirlos aquí.';
  if($("favoritesToolbarCount")) $("favoritesToolbarCount").textContent=list.length?`${list.length} guardados`:"Sin guardados";
  grid.innerHTML=list.length?list.map(productCardHTML).join(""):'<div class="favorites-empty"><div class="favorites-empty-icon">♡</div><h2>Aún no tienes favoritos</h2><p>Guarda productos que te interesen para encontrarlos rápidamente después.</p><a class="primary-link" href="index.html#catalogo">Explorar catálogo</a></div>';
  bindProductCards(); updateCounts();
}

function renderProductPage(){
  const mount=$('productPage'); if(!mount) return;
  const slug=new URLSearchParams(location.search).get('slug');
  const p=products.find(x=>x.slug===slug);
  if(!p){mount.innerHTML=`<div class="product-not-found"><a class="back-link" href="index.html">← Volver al catálogo</a><p class="eyebrow">PRODUCTO</p><h1>Producto no encontrado</h1><p>El producto que buscas no existe o fue movido.</p><a class="primary-link" href="index.html#catalogo">Explorar catálogo</a></div>`;return;}
  document.title=`${p.name} · ${p.brand} | Catálogo Interiorismo Perú`;
  const images=p.images||['Foto principal'];
  const files=allFiles(p);
  const detailRows=[detail('SKU',p.sku),detail('Colección',p.collection),detail('Diseñador',p.designer),detail('Fabricante',p.manufacturer),detail('Año',p.year),detail('Materialidad',p.materials.join(', ')),detail('Construcción',p.construction),detail('Acabado',p.finish.join(', ')),detail('Textura',p.surfaceTexture),detail('Color',p.colors.join(', ')),detail('Variantes',p.variants.join(', ')),detail('Dimensiones',Object.values(p.dimensions||{}).filter(Boolean).join(' × ')||'—'),detail('Estilo',p.style.join(', ')),detail('Uso',p.applications.join(', ')),detail('Interior / exterior',p.indoorOutdoor),detail('Disponibilidad',p.availability),detail('Tiempo de entrega',p.leadTime),detail('Pedido mínimo',p.minimumOrder),detail('Garantía',p.warranty),detail('Origen',p.countryOfOrigin),detail('Precio actualizado',p.priceLastUpdated),detail('Mantenimiento',p.maintenance),technicalDetails(p)];
  mount.innerHTML=`<div class="product-page-wrap"><a class="back-link" href="index.html">← Volver al catálogo</a><div class="product-page-grid"><div><div class="page-gallery-main" id="pageGallery" style="--tone1:${p.tone1};--tone2:${p.tone2}"><span id="pageGalleryLabel" aria-hidden="true"></span><button id="pagePrev">‹</button><button id="pageNext">›</button><span id="pageCounter">1 / ${images.length}</span></div><div class="page-gallery-thumbs">${images.map((im,i)=>`<button aria-label="Imagen ${i+1}" class="page-thumb ${i===0?'active':''}" data-page-gallery="${i}" style="--tone1:${p.tone1};--tone2:${p.tone2}"></button>`).join('')}</div></div><div class="product-page-info"><p class="eyebrow">${esc(p.category)} · ${esc(p.subcategory)}</p><h1>${esc(p.name)}</h1><p class="page-brand">${esc(p.brand)} · ${esc(p.collection)}</p><div class="page-price">${p.price==null?'Consultar precio':esc(p.currency==='PEN'?`S/ ${p.price}`:p.price)}</div><p class="page-description">${esc(p.description)}</p><div class="page-actions"><button class="primary" id="pageAdd">＋ Añadir a proyecto</button><button id="pageFav">♡ Guardar</button></div><div class="page-section"><h2>Información del producto</h2><div class="detail-grid">${detailRows.join('')}</div></div><div class="page-section"><h2>Archivos para diseño</h2><div class="resource-list">${files.length?files.map(f=>`<span class="resource">${esc(f)}</span>`).join(''):'<span class="empty">Todavía no hay archivos cargados.</span>'}</div></div></div></div></div>`;
  let gi=0; const show=i=>{gi=(i+images.length)%images.length;$('pageGalleryLabel').textContent=images[gi];$('pageCounter').textContent=`${gi+1} / ${images.length}`;document.querySelectorAll('[data-page-gallery]').forEach((b,j)=>b.classList.toggle('active',j===gi))};
  $('pagePrev').onclick=()=>show(gi-1); $('pageNext').onclick=()=>show(gi+1); document.querySelectorAll('[data-page-gallery]').forEach(b=>b.onclick=()=>show(+b.dataset.pageGallery));
  $('pageAdd').onclick=()=>openProjectPicker(p.id); $('pageFav').onclick=()=>{toggleFavorite(p.id);$('pageFav').textContent=state.favorites.has(p.id)?'♥ Guardado':'♡ Guardar';}; $('pageFav').textContent=state.favorites.has(p.id)?'♥ Guardado':'♡ Guardar';
}
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',()=>{ if(supabaseClient) renderProductPage(); }); else if(supabaseClient) renderProductPage();

/* Supabase: autenticación privada + favoritos sincronizados. */
let supabaseClient = null;
let authUser = null;
const productDbIds = new Map();
let favoritesReady = false;
let projectsReady = false;
const projectDbItems = new Map();

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

async function initSupabaseFavorites(){
  if(!supabaseClient || !authUser) return false;
  const slugs=products.map(p=>p.slug);
  const {data:dbProducts,error:productError}=await supabaseClient
    .from('products').select('id,slug').in('slug',slugs);
  if(productError){ console.error(productError); toast('No se pudo conectar favoritos con la base de datos.'); return false; }
  productDbIds.clear();
  (dbProducts||[]).forEach(row=>productDbIds.set(row.slug,row.id));
  if(productDbIds.size===0){ toast('Primero necesitamos cargar los productos en Supabase.'); return false; }

  const localBeforeMigration=[...state.favorites];
  const migrationKey='ci-favorites-migrated-v1';
  if(!localStorage.getItem(migrationKey) && localBeforeMigration.length){
    const rows=localBeforeMigration.map(localId=>{
      const p=products.find(x=>x.id===localId); const dbId=p&&productDbIds.get(p.slug);
      return dbId?{user_id:authUser.id,product_id:dbId}:null;
    }).filter(Boolean);
    if(rows.length){
      const {error}=await supabaseClient.from('favorites').upsert(rows,{onConflict:'user_id,product_id',ignoreDuplicates:true});
      if(error){ console.error(error); toast('No se pudieron migrar algunos favoritos.'); return false; }
    }
    localStorage.setItem(migrationKey,'1');
  } else if(!localStorage.getItem(migrationKey)){
    localStorage.setItem(migrationKey,'1');
  }

  const {data:remote,error:favoriteError}=await supabaseClient
    .from('favorites').select('product_id').eq('user_id',authUser.id);
  if(favoriteError){ console.error(favoriteError); toast('No se pudieron cargar tus favoritos.'); return false; }
  const dbToLocal=new Map(products.map(p=>[productDbIds.get(p.slug),p.id]));
  state.favorites=new Set((remote||[]).map(r=>dbToLocal.get(r.product_id)).filter(id=>id!=null));
  save();
  favoritesReady=true;
  updateCounts();
  refreshCurrentPage();
  return true;
}


async function initSupabaseProjects(){
  if(!supabaseClient || !authUser) return false;
  const {data:dbProjects,error:projectError}=await supabaseClient
    .from('projects')
    .select('id,name,client,location,description,status,owner_id,created_at,updated_at')
    .eq('owner_id',authUser.id)
    .order('created_at',{ascending:true});
  if(projectError){
    console.error(projectError);
    toast('No se pudieron cargar tus proyectos.');
    return false;
  }

  const projectIds=(dbProjects||[]).map(p=>p.id);
  let dbItems=[];
  if(projectIds.length){
    const {data:items,error:itemError}=await supabaseClient
      .from('project_items')
      .select('id,project_id,product_id,room,quantity,unit,waste_percent,calculated_quantity,purchase_unit,purchase_factor,purchase_quantity,price,currency,supplier_name,quote_status,notes,added_by,created_at,updated_at')
      .in('project_id',projectIds)
      .order('created_at',{ascending:true});
    if(itemError){
      console.error(itemError);
      toast('No se pudieron cargar los productos de tus proyectos.');
      return false;
    }
    dbItems=items||[];
  }

  projectDbItems.clear();
  const dbToLocal=new Map(products.map(p=>[productDbIds.get(p.slug),p.id]));
  (dbItems||[]).forEach(item=>{
    const localId=dbToLocal.get(item.product_id);
    if(localId!=null){
      if(!projectDbItems.has(item.project_id)) projectDbItems.set(item.project_id,[]);
      projectDbItems.get(item.project_id).push(item);
    }
  });

  state.projects=(dbProjects||[]).map(row=>({
    id:row.id,
    name:row.name,
    client:row.client||'',
    location:row.location||'',
    description:row.description||'',
    status:row.status||'draft',
    createdAt:row.created_at,
    updatedAt:row.updated_at,
    items:(projectDbItems.get(row.id)||[]).map(item=>dbToLocal.get(item.product_id)).filter(id=>id!=null)
  }));
  save();
  projectsReady=true;
  updateCounts();
  refreshCurrentPage();
  return true;
}

function refreshCurrentPage(){
  if($('productGrid')) renderProducts();
  if($('favoritesProductGrid')) renderFavoritesPage();
  if($('categoryProductGrid')) renderCategoryPage();
  if($('productPage')) renderProductPage();
  if($('projectPage')) renderProjectPage();
}

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
async function toggleFavorite(id){
  const p=products.find(x=>x.id===id);
  const dbId=p&&productDbIds.get(p.slug);
  if(!favoritesReady || !dbId){ toast('Favoritos todavía no están listos.'); return; }
  const wasFavorite=state.favorites.has(id);
  if(wasFavorite) state.favorites.delete(id); else state.favorites.add(id);
  save(); updateCounts();
  refreshCurrentPage();
  try{
    if(wasFavorite){
      const {error}=await supabaseClient.from('favorites').delete().eq('user_id',authUser.id).eq('product_id',dbId);
      if(error) throw error;
    } else {
      const {error}=await supabaseClient.from('favorites').upsert({user_id:authUser.id,product_id:dbId},{onConflict:'user_id,product_id',ignoreDuplicates:true});
      if(error) throw error;
    }
    toast(wasFavorite?'Eliminado de favoritos':'Guardado en favoritos');
  }catch(error){
    console.error(error);
    if(wasFavorite) state.favorites.add(id); else state.favorites.delete(id);
    save(); updateCounts(); refreshCurrentPage();
    toast('No se pudo guardar el cambio.');
  }
}
function openDrawer(){if(!$('projectDrawer'))return;$("projectDrawer").classList.add("open");$("drawerBackdrop").classList.add("open");renderProjects()};function closeDrawer(){if(!$('projectDrawer'))return;$("projectDrawer").classList.remove("open");$("drawerBackdrop").classList.remove("open")}
function projectItemsFor(project){return projectDbItems.get(project.id)||[]}
function productFromDbId(dbId){const match=products.find(x=>productDbIds.get(x.slug)===dbId);return match||null}
function renderProjects(){
  const list=$('projectList');
  if(!list) return;
  const inputWrap=$('projectNameInput')?.parentElement;
  if(inputWrap) inputWrap.style.display='flex';
  if(!state.projects.length){
    list.innerHTML='<div class="empty">Todavía no tienes proyectos.</div>';
    return;
  }
  list.innerHTML=state.projects.map(p=>{
    const items=projectItemsFor(p);
    return `<article class="project-card" data-project-id="${esc(p.id)}" style="cursor:pointer"><div class="project-title"><strong>${esc(p.name)}</strong><span class="project-count">${items.length} ${items.length===1?'producto':'productos'}</span></div>${items.length?`<div class="project-items">${items.slice(0,6).map(item=>{const x=productFromDbId(item.product_id);return `<div class="mini-item">${x?esc(x.name):'Producto'}</div>`}).join('')}</div>`:'<div class="empty">Sin productos todavía.</div>'}<div style="margin-top:12px;font-size:10px;color:#777">Abrir proyecto →</div></article>`;
  }).join('');
  list.querySelectorAll('[data-project-id]').forEach(card=>card.onclick=()=>{
    window.location.href=`proyecto.html?id=${encodeURIComponent(card.dataset.projectId)}`;
  });
}

function renderProjectPage(){
  const mount=$('projectPage');
  if(!mount || !projectsReady) return;
  const projectId=new URLSearchParams(location.search).get('id');
  const project=state.projects.find(p=>String(p.id)===String(projectId));
  if(!project){
    document.title='Proyecto no encontrado · Catálogo Interiorismo Perú';
    mount.innerHTML=`<div class="project-page-wrap"><a class="back-link" href="index.html">← Volver al catálogo</a><p class="eyebrow">PROYECTO</p><h1>Proyecto no encontrado</h1><p class="page-description">El proyecto que buscas no existe o no tienes acceso.</p><a class="primary-link" href="index.html">Volver al catálogo</a></div>`;
    return;
  }

  const items=projectItemsFor(project);
  document.title=`${project.name} · Proyecto | Catálogo Interiorismo Perú`;
  const unitOptions=['und.','m²','m','ml','kg','g','l','set'];
  const escAttr=(v)=>esc(v).replace(/"/g,'&quot;');
  const cleanNumber=(n)=>Number.isInteger(Number(n))?String(Number(n)):String(Number(Number(n).toFixed(3)));
  const purchaseName=(u,n)=>{
    const q=Number(n);
    const singular={
      'und.':'und.', 'set':'set', 'caja':'caja', 'rollo':'rollo', 'pieza':'pieza',
      'saco':'saco', 'paquete':'paquete', 'bolsa':'bolsa', 'm':'m', 'ml':'ml',
      'm²':'m²', 'kg':'kg', 'g':'g', 'l':'l'
    };
    const plural={
      'und.':'und.', 'set':'sets', 'caja':'cajas', 'rollo':'rollos', 'pieza':'piezas',
      'saco':'sacos', 'paquete':'paquetes', 'bolsa':'bolsas', 'm':'m', 'ml':'ml',
      'm²':'m²', 'kg':'kg', 'g':'g', 'l':'l'
    };
    const key=String(u||'und.').trim().toLowerCase();
    if(q===1) return `1 ${singular[key]||key}`;
    return `${cleanNumber(q)} ${plural[key]||key}`;
  };
  const thumb=(x)=>{
    const tone1=x?.tone1||'#e6dfd3', tone2=x?.tone2||'#c8bcaa';
    const initial=(x?.name||'P').trim().charAt(0).toUpperCase();
    return `<span class="ci-thumb" style="--t1:${escAttr(tone1)};--t2:${escAttr(tone2)}"><span>${esc(initial)}</span></span>`;
  };

  mount.innerHTML=`<div class="project-page-wrap project-page-clean ci-project-v2">
    <style>
      .ci-project-v2{width:min(1320px,calc(100% - 64px))!important;max-width:1320px!important;margin:0 auto!important;color:var(--ink)!important}
      .ci-project-v2 .ci-top{display:flex!important;justify-content:space-between!important;align-items:center!important;margin-bottom:28px!important}
      .ci-project-v2 .ci-heading{display:flex!important;justify-content:space-between!important;align-items:flex-end!important;border-bottom:1px solid var(--line)!important;padding-bottom:22px!important}
      .ci-project-v2 .ci-heading h1{margin:0 0 7px!important;font-size:clamp(48px,6vw,76px)!important;line-height:.98!important;font-weight:500!important}
      .ci-project-v2 .ci-meta{margin:0!important;font-size:11px!important;color:#777!important}
      .ci-project-v2 .ci-section{margin-top:52px!important;width:100%!important;max-width:none!important}
      .ci-project-v2 .ci-section-head{display:flex!important;justify-content:space-between!important;align-items:flex-end!important;border-bottom:1px solid var(--line)!important;padding-bottom:14px!important}
      .ci-project-v2 .ci-section-head h2{margin:0 0 4px!important;font-size:27px!important;font-weight:500!important}
      .ci-project-v2 .ci-note{margin:0!important;font-size:10px!important;color:#888!important}
      .ci-project-v2 .ci-table{width:100%!important;min-width:0!important}
      .ci-project-v2 .ci-header,.ci-project-v2 .ci-row{display:grid!important;grid-template-columns:minmax(0,2.45fr) minmax(90px,1fr) minmax(90px,.9fr) minmax(145px,1.35fr) minmax(105px,1.05fr) 42px!important;column-gap:18px!important;align-items:center!important;box-sizing:border-box!important}
      .ci-project-v2 .ci-header{padding:11px 0!important;border-bottom:1px solid var(--line)!important}
      .ci-project-v2 .ci-header span{font-size:8px!important;letter-spacing:.12em!important;color:#999!important}
      .ci-project-v2 .ci-row{position:relative!important;min-width:0!important;padding:18px 0!important;border-bottom:1px solid var(--line)!important;background:transparent!important}
      .ci-project-v2 .ci-product{display:flex!important;align-items:center!important;gap:12px!important;min-width:0!important;color:inherit!important;text-decoration:none!important}
      .ci-project-v2 .ci-thumb{width:64px!important;height:64px!important;flex:0 0 64px!important;display:flex!important;align-items:center!important;justify-content:center!important;background:linear-gradient(145deg,var(--t1),var(--t2))!important;border:1px solid rgba(0,0,0,.05)!important}
      .ci-project-v2 .ci-thumb span{font-size:17px!important;font-weight:500!important;opacity:.48!important}
      .ci-project-v2 .ci-num{width:20px!important;flex:0 0 20px!important;font-size:8px!important;color:#aaa!important}
      .ci-project-v2 .ci-product-copy{min-width:0!important}
      .ci-project-v2 .ci-product h3{margin:0 0 3px!important;font-size:14px!important;line-height:1.2!important;font-weight:500!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important}
      .ci-project-v2 .ci-product p{margin:0!important;font-size:9px!important;line-height:1.2!important;color:#888!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important}
      .ci-project-v2 .ci-value{min-width:0!important;font-size:11px!important;line-height:1.35!important;color:var(--ink)!important;background:transparent!important;padding:0!important;border:0!important;overflow:visible!important;white-space:normal!important;display:flex!important;flex-direction:column!important;align-items:flex-start!important;justify-content:center!important;gap:4px!important;min-height:32px!important;box-sizing:border-box!important}
      .ci-project-v2 .ci-value strong{display:block!important;width:max-content!important;max-width:100%!important;margin:0!important;padding:0!important;background:transparent!important;border:0!important;font-size:11px!important;line-height:1.35!important;font-weight:500!important;color:var(--ink)!important;white-space:nowrap!important}
      .ci-project-v2 .ci-secondary{display:block!important;width:auto!important;max-width:100%!important;margin:0!important;padding:0!important;background:transparent!important;border:0!important;font-size:8px!important;line-height:1.25!important;font-weight:400!important;color:#999!important;white-space:nowrap!important}
      .ci-project-v2 .ci-buy strong{font-size:11px!important;line-height:1.35!important;font-weight:500!important}
      .ci-project-v2 .ci-buy .ci-secondary{margin-top:0!important}.ci-project-v2 .ci-secondary-spacer{visibility:hidden!important}
      .ci-project-v2 .ci-edit{justify-self:end!important;width:34px!important;height:34px!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;border:1px solid var(--line)!important;background:transparent!important;color:var(--ink)!important;font:inherit!important;font-size:16px!important;line-height:1!important;padding:0!important;cursor:pointer!important;white-space:nowrap!important}
      .ci-project-v2 .ci-edit:hover{background:#fafafa!important}
      .ci-project-v2 .ci-edit svg{width:15px!important;height:15px!important;display:block!important}
      .ci-project-v2 .ci-edit-panel{grid-column:1/-1!important;display:none!important;border-top:1px solid var(--line)!important;padding:18px 0 2px!important;margin-top:18px!important;background:transparent!important}
      .ci-project-v2 .ci-row.is-editing .ci-edit-panel{display:block!important}
      .ci-project-v2 .ci-form{display:grid!important;grid-template-columns:1.3fr .8fr .7fr 1fr .9fr 1fr!important;gap:12px!important;align-items:end!important}
      .ci-project-v2 .ci-field{display:flex!important;flex-direction:column!important;gap:6px!important;min-width:0!important}
      .ci-project-v2 .ci-field label{font-size:8px!important;letter-spacing:.09em!important;color:#999!important}
      .ci-project-v2 .ci-field input,.ci-project-v2 .ci-field select{width:100%!important;height:34px!important;box-sizing:border-box!important;border:1px solid var(--line)!important;background:#fff!important;padding:8px 9px!important;font:inherit!important;font-size:10px!important;color:var(--ink)!important;outline:none!important;border-radius:0!important}
      .ci-project-v2 .ci-actions{display:flex!important;justify-content:flex-end!important;gap:8px!important;margin-top:13px!important}
      .ci-project-v2 .ci-save{background:var(--ink)!important;color:#fff!important;border:0!important;padding:8px 13px!important;font:inherit!important;font-size:9px!important;cursor:pointer!important}
      .ci-project-v2 .ci-cancel{background:transparent!important;color:var(--ink)!important;border:1px solid var(--line)!important;padding:8px 13px!important;font:inherit!important;font-size:9px!important;cursor:pointer!important}
      .ci-project-v2 .ci-empty{padding:35px 0!important;border-top:1px solid var(--line)!important}
      @media(max-width:1100px){.ci-project-v2{width:calc(100% - 32px)!important}.ci-project-v2 .ci-header,.ci-project-v2 .ci-row{grid-template-columns:minmax(0,2.2fr) minmax(80px,1fr) minmax(80px,.9fr) minmax(125px,1.25fr) minmax(95px,.95fr) 40px!important;column-gap:14px!important}.ci-project-v2 .ci-thumb{width:56px!important;height:56px!important;flex-basis:56px!important}}
      @media(max-width:760px){.ci-project-v2{padding:0 5vw 60px!important}.ci-project-v2 .ci-top,.ci-project-v2 .ci-heading,.ci-project-v2 .ci-section-head{display:block!important}.ci-project-v2 .ci-heading{padding-bottom:18px!important}.ci-project-v2 .ci-section{margin-top:40px!important}.ci-project-v2 .ci-header{display:none!important}.ci-project-v2 .ci-row{display:grid!important;grid-template-columns:1fr 1fr!important;row-gap:14px!important;column-gap:16px!important;padding:18px 0!important}.ci-project-v2 .ci-product{grid-column:1/-1!important}.ci-project-v2 .ci-value:nth-of-type(2){grid-column:1!important}.ci-project-v2 .ci-value:nth-of-type(3){grid-column:2!important}.ci-project-v2 .ci-value:nth-of-type(4){grid-column:1/-1!important}.ci-project-v2 .ci-buy{grid-column:1!important}.ci-project-v2 .ci-edit{grid-column:2!important;justify-self:end!important}.ci-project-v2 .ci-edit-panel{grid-column:1/-1!important}.ci-project-v2 .ci-form{grid-template-columns:1fr 1fr!important}.ci-project-v2 .ci-actions{justify-content:flex-start!important}}
    </style>

    <div class="project-page-top ci-top"><a class="back-link" href="index.html">← Volver al catálogo</a><button class="project-top-action" id="projectAddProduct">＋ Agregar producto</button></div>

    <div class="project-page-heading ci-heading">
      <div><p class="eyebrow">PROYECTO</p><h1>${esc(project.name)}</h1><p class="project-meta ci-meta">${items.length} ${items.length===1?'producto':'productos'}${project.client?` · ${esc(project.client)}`:''}${project.location?` · ${esc(project.location)}`:''}</p></div>
      <span class="project-status">${esc(project.status||'draft')}</span>
    </div>

    <section class="project-products-section ci-section">
      <div class="project-section-heading ci-section-head"><div><p class="eyebrow">ESPECIFICACIÓN</p><h2>Productos del proyecto</h2><p class="project-edit-note ci-note">Una vista limpia de lo esencial. Usa el lápiz para cambiar cantidades, compra o merma.</p></div><span>${items.length} ${items.length===1?'producto':'productos'}</span></div>
      ${items.length?`<div class="project-products-list ci-table">
        <div class="project-col-head ci-header"><span>PRODUCTO</span><span>AMBIENTE</span><span>CANTIDAD</span><span>COMPRA</span><span>A COMPRAR</span><span></span></div>
        ${items.map((item,index)=>{
          const x=productFromDbId(item.product_id);
          const productHref=x?`producto.html?slug=${encodeURIComponent(x.slug)}`:'#';
          const qty=Number(item.quantity)||0;
          const unit=item.unit||'und.';
          const wasteActive=item.waste_percent!==null && item.waste_percent!==undefined;
          const waste=Number(item.waste_percent)||0;
          const calculated=Number((qty*(wasteActive?1+waste/100:1)).toFixed(3));
          const purchaseUnit=item.purchase_unit||unit||'und.';
          const purchaseFactor=Number(item.purchase_factor)||1;
          const purchaseQty=purchaseFactor>0?Math.ceil(calculated/purchaseFactor):0;
          const room=item.room||'—';
          const purchaseCaption=(purchaseUnit!==unit || purchaseFactor!==1)
            ? `${cleanNumber(purchaseFactor)} ${unit} / ${purchaseUnit}`
            : `Por unidad`;
          const purchaseSub=wasteActive&&waste?`${cleanNumber(waste)}% · ${cleanNumber(calculated)} ${unit}`:'';
          const buyLabel=purchaseName(purchaseUnit,purchaseQty);
          return `<article class="project-product-row ci-row" data-item-id="${esc(item.id)}">
            <a class="project-product-main ci-product" href="${productHref}"><div class="project-product-index ci-num">${String(index+1).padStart(2,'0')}</div>${thumb(x)}<div class="ci-product-copy"><h3>${x?esc(x.name):'Producto'}</h3><p>${x?esc(x.brand):'Producto del catálogo'}</p></div></a>
            <div class="project-summary ci-value"><strong>${esc(room)}</strong></div>
            <div class="project-summary ci-value"><strong>${esc(`${cleanNumber(qty)} ${unit}`)}</strong></div>
            <div class="project-summary ci-value ci-purchase"><strong>${purchaseCaption}</strong>${purchaseSub?`<span class="ci-secondary">${esc(purchaseSub)}</span>`:'<span class="ci-secondary ci-secondary-spacer" aria-hidden="true">&nbsp;</span>'}</div>
            <div class="project-summary project-buy-result ci-value ci-buy"><strong>${esc(buyLabel)}</strong>${wasteActive&&waste?`<span class="ci-secondary">${esc(`${cleanNumber(calculated)} ${unit} con merma`)}</span>`:'<span class="ci-secondary ci-secondary-spacer" aria-hidden="true">&nbsp;</span>'}</div>
            <button type="button" class="project-edit-btn ci-edit" data-edit-item="${esc(item.id)}" aria-label="Editar ${escAttr(x?x.name:'producto')}" title="Editar"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 16.5V20h3.5L18.8 8.7l-3.5-3.5L4 16.5Zm12.8-12.8 3.5 3.5 1.1-1.1a1.5 1.5 0 0 0 0-2.1l-1.4-1.4a1.5 1.5 0 0 0-2.1 0l-1.1 1.1Z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg></button>
            <div class="project-edit-panel ci-edit-panel">
              <div class="project-edit-grid ci-form">
                <div class="project-edit-field ci-field"><label>AMBIENTE</label><input data-edit-field="room" type="text" value="${escAttr(item.room||'')}" placeholder="Ej. Comedor"></div>
                <div class="project-edit-field ci-field"><label>CANTIDAD</label><input data-edit-field="quantity" type="number" min="0" step="0.001" value="${qty}"></div>
                <div class="project-edit-field ci-field"><label>UNIDAD</label><select data-edit-field="unit">${unitOptions.map(u=>`<option value="${u}" ${u===unit?'selected':''}>${u}</option>`).join('')}</select></div>
                <div class="project-edit-field ci-field"><label>UNIDAD DE COMPRA</label><input data-edit-field="purchase_unit" type="text" value="${escAttr(purchaseUnit)}" placeholder="caja"></div>
                <div class="project-edit-field ci-field"><label>CONTENIDO / UNIDAD</label><input data-edit-field="purchase_factor" type="number" min="0.001" step="0.001" value="${purchaseFactor}"></div>
                <div class="project-edit-field ci-field"><label>MERMA</label><select data-edit-field="merma_mode"><option value="none" ${!wasteActive?'selected':''}>No aplicar</option><option value="percent" ${wasteActive?'selected':''}>Aplicar %</option></select></div>
              </div>
              <div class="project-merma-editor" style="display:${wasteActive?'block':'none'};margin-top:12px;max-width:180px"><div class="project-edit-field ci-field"><label>PORCENTAJE DE MERMA</label><input data-edit-field="waste_percent" type="number" min="0" step="0.1" value="${waste}"></div></div>
              <p class="project-edit-hint">Los resultados de compra se calculan automáticamente.</p>
              <div class="project-edit-actions ci-actions"><button type="button" class="project-cancel-btn ci-cancel" data-cancel-edit>Cancelar</button><button type="button" class="project-save-btn ci-save" data-save-edit>Guardar cambios</button></div>
            </div>
          </article>`;
        }).join('')}
      </div>`:'<div class="project-empty"><h3>Este proyecto todavía no tiene productos.</h3><p>Agrega productos desde cualquier ficha del catálogo.</p><button class="primary" id="projectAddEmpty">＋ Agregar producto</button></div>'}
    </section>
  </div>`;

  const getItem=(row)=>items.find(i=>String(i.id)===String(row?.dataset.itemId));
  const saveEditedItem=async(row)=>{
    const item=getItem(row); if(!item) return;
    const get=(field)=>row.querySelector(`[data-edit-field="${field}"]`);
    const room=(get('room')?.value||'').trim()||null;
    const quantity=Math.max(0,Number(get('quantity')?.value)||0);
    const unit=get('unit')?.value||'und.';
    const purchaseUnit=(get('purchase_unit')?.value||'').trim()||unit;
    const purchaseFactor=Math.max(.001,Number(get('purchase_factor')?.value)||1);
    const mode=get('merma_mode')?.value||'none';
    const waste=mode==='percent'?Math.max(0,Number(get('waste_percent')?.value)||0):null;
    const calculated=Number((quantity*(waste===null?1:1+waste/100)).toFixed(3));
    const purchaseQuantity=purchaseFactor>0?Math.ceil(calculated/purchaseFactor):null;
    const payload={room,quantity,unit,purchase_unit:purchaseUnit,purchase_factor:purchaseFactor,waste_percent:waste,calculated_quantity:calculated,purchase_quantity:purchaseQuantity};
    const saveBtn=row.querySelector('[data-save-edit]');
    if(saveBtn){saveBtn.disabled=true;saveBtn.textContent='Guardando…';}
    try{
      const {data,error}=await supabaseClient.from('project_items').update(payload).eq('id',item.id).select('id,project_id,product_id,room,quantity,unit,waste_percent,calculated_quantity,purchase_unit,purchase_factor,purchase_quantity,price,currency,supplier_name,quote_status,notes,added_by,created_at,updated_at').single();
      if(error) throw error;
      Object.assign(item,data); renderProjectPage(); toast('Cambios guardados');
    }catch(error){console.error(error);toast('No se pudieron guardar los cambios.');if(saveBtn){saveBtn.disabled=false;saveBtn.textContent='Guardar cambios';}}
  };

  mount.querySelectorAll('[data-edit-item]').forEach(btn=>btn.addEventListener('click',()=>{
    const row=btn.closest('.project-product-row');
    const wasEditing=row.classList.contains('is-editing');
    mount.querySelectorAll('.project-product-row.is-editing').forEach(r=>r.classList.remove('is-editing'));
    if(!wasEditing) row.classList.add('is-editing');
  }));
  mount.querySelectorAll('[data-cancel-edit]').forEach(btn=>btn.addEventListener('click',()=>btn.closest('.project-product-row')?.classList.remove('is-editing')));
  mount.querySelectorAll('[data-save-edit]').forEach(btn=>btn.addEventListener('click',()=>saveEditedItem(btn.closest('.project-product-row'))));
  mount.querySelectorAll('[data-edit-field="merma_mode"]').forEach(sel=>sel.addEventListener('change',()=>{
    const panel=sel.closest('.ci-edit-panel');
    const editor=panel?.querySelector('.project-merma-editor');
    if(editor) editor.style.display=sel.value==='percent'?'block':'none';
  }));
  $('projectAddProduct')?.addEventListener('click',()=>{ location.href='index.html'; });
  $('projectAddEmpty')?.addEventListener('click',()=>{ location.href='index.html'; });
}

async function openProjectPicker(id){
  pendingProductId=id;
  const p=products.find(x=>x.id===id);
  if(!p || !$('projectPickerContent')) return;
  if(!projectsReady){ toast('Los proyectos todavía se están cargando.'); return; }
  $('projectPickerContent').innerHTML=`<div class="picker-head"><p class="eyebrow">GUARDAR PRODUCTO</p><h3>${esc(p.name)}</h3><p>${esc(p.brand)}</p></div><div class="picker-list">${state.projects.length?state.projects.map((project,i)=>{const count=projectItemsFor(project).length;return `<button class="picker-project" data-project="${i}"><span class="picker-icon">＋</span><span><strong>${esc(project.name)}</strong><small>${count} ${count===1?'producto guardado':'productos guardados'}</small></span><span>›</span></button>`}).join(''):'<div class="empty">Todavía no tienes proyectos.</div>'}</div><button class="new-project-inline" id="newProjectInline">＋ Crear nuevo proyecto</button>`;
  $('projectPicker').classList.add('open');
  document.querySelectorAll('.picker-project').forEach(b=>b.onclick=async()=>{
    const i=+b.dataset.project;
    const project=state.projects[i];
    if(!project) return;
    const existing=projectItemsFor(project).some(item=>item.product_id===productDbIds.get(p.slug));
    if(existing){ toast(`“${p.name}” ya está en “${project.name}”`); closeProjectPicker(); return; }
    const productDbId=productDbIds.get(p.slug);
    if(!productDbId){ toast('No encontramos este producto en Supabase.'); return; }
    b.disabled=true;
    const {data:item,error}=await supabaseClient.from('project_items').insert({
      project_id:project.id,
      product_id:productDbId,
      quantity:1,
      unit:'und.',
      waste_percent:0,
      purchase_unit:'und.',
      purchase_factor:1
    }).select('id,project_id,product_id,room,quantity,unit,waste_percent,calculated_quantity,purchase_unit,purchase_factor,purchase_quantity,price,currency,supplier_name,quote_status,notes,added_by,created_at,updated_at').single();
    if(error){
      console.error(error);
      b.disabled=false;
      toast('No se pudo añadir el producto al proyecto.');
      return;
    }
    if(!projectDbItems.has(project.id)) projectDbItems.set(project.id,[]);
    projectDbItems.get(project.id).push(item);
    project.items.push(id);
    save(); updateCounts(); closeProjectPicker(); renderProjects();
    toast(`Añadido a “${project.name}”`);
  });
  $('newProjectInline').onclick=()=>{closeProjectPicker();openDrawer();$('projectNameInput').focus()};
}
function closeProjectPicker(){$('projectPicker').classList.remove('open');pendingProductId=null}
function renderBrands(){if(!$('brandList'))return;const brands=[...new Set(products.map(p=>p.brand))].filter(Boolean).sort();$("brandList").innerHTML=brands.map(b=>`<button class="brand-pill" data-brand="${esc(b)}">${esc(b)}</button>`).join("");$("brandCount").textContent=`${brands.length} marcas de muestra`;document.querySelectorAll('[data-brand]').forEach(b=>b.onclick=()=>{const name=b.dataset.brand;$("searchInput").value=name;renderProducts();$("catalogo").scrollIntoView({behavior:'smooth'});toast(`Filtrando: ${name}`)})}
function initCommonUI(){
  if($("addProjectBtn")) $("addProjectBtn").onclick=async()=>{const name=$("projectNameInput").value.trim();if(!name)return toast("Escribe un nombre para el proyecto");if(state.projects.some(p=>p.name.toLowerCase()===name.toLowerCase()))return toast("Ese proyecto ya existe");if(!supabaseClient||!authUser){toast("La sesión todavía no está lista.");return;}const btn=$("addProjectBtn");btn.disabled=true;const {data:row,error}=await supabaseClient.from('projects').insert({name,owner_id:authUser.id,status:'draft'}).select('id,name,client,location,description,status,owner_id,created_at,updated_at').single();if(error){console.error(error);btn.disabled=false;toast('No se pudo crear el proyecto.');return;}state.projects.push({id:row.id,name:row.name,client:row.client||'',location:row.location||'',description:row.description||'',status:row.status||'draft',createdAt:row.created_at,updatedAt:row.updated_at,items:[]});projectDbItems.set(row.id,[]);$("projectNameInput").value="";btn.disabled=false;save();updateCounts();renderProjects();toast("Proyecto creado")};
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
  await initSupabaseFavorites();
  await initSupabaseProjects();
  initIndexPage();
  refreshCurrentPage();
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
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',()=>{ if(supabaseClient){ renderProductPage(); renderProjectPage(); } }); else if(supabaseClient){ renderProductPage(); renderProjectPage(); }

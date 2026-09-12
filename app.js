const products = [
  { id:1, name:"Vruna", brand:"Nihm", category:"Mobiliario", price:"S/ —", material:"", label:"Silla" },
  { id:2, name:"Silla de comedor", brand:"Marca por añadir", category:"Mobiliario", price:"S/ —", material:"Madera", label:"Silla" },
  { id:3, name:"Luminaria decorativa", brand:"Marca por añadir", category:"Iluminación", price:"S/ —", material:"Metal", label:"Iluminación" },
  { id:4, name:"Lavatorio", brand:"Marca por añadir", category:"Baño", price:"S/ —", material:"Cerámica", label:"Sanitario" },
  { id:5, name:"Porcelanato", brand:"Marca por añadir", category:"Acabados", price:"S/ —", material:"Porcelánico", label:"Revestimiento" },
  { id:6, name:"Sofá modular", brand:"Marca por añadir", category:"Mobiliario", price:"S/ —", material:"Textil", label:"Sofá" }
];

const categories = [
  ["🪑","Mobiliario","Sillas, mesas, sofás..."],
  ["💡","Iluminación","Decorativa y técnica"],
  ["🚿","Baño","Sanitarios y griferías"],
  ["🧱","Acabados","Pisos y revestimientos"],
  ["🪵","Maderas","Tableros y enchapes"],
  ["🪨","Piedras","Mármol, cuarzo, sinterizados"],
  ["🧵","Textiles","Telas, cortinas, alfombras"],
  ["🌿","Exterior","Mobiliario y jardín"]
];

const grid = document.getElementById("productGrid");
const categoryGrid = document.getElementById("categoryGrid");
const search = document.getElementById("searchInput");
const favoriteCount = document.getElementById("favoriteCount");
let currentFilter = "Todos";
let favorites = new Set();

function renderCategories(){
  categoryGrid.innerHTML = categories.map(([symbol,name,desc]) => `
    <article class="category" data-category="${name}">
      <span class="symbol">${symbol}</span>
      <div><strong>${name}</strong><small>${desc}</small></div>
    </article>`).join("");
  document.querySelectorAll(".category").forEach(el => el.addEventListener("click",()=>{
    currentFilter = el.dataset.category;
    document.querySelectorAll(".filter").forEach(b=>b.classList.remove("active"));
    renderProducts();
    document.getElementById("catalogo").scrollIntoView({behavior:"smooth"});
  }));
}

function renderProducts(){
  const q = search.value.toLowerCase().trim();
  const filtered = products.filter(p => {
    const matchesFilter = currentFilter === "Todos" || p.category === currentFilter;
    const matchesSearch = !q || `${p.name} ${p.brand} ${p.category} ${p.material}`.toLowerCase().includes(q);
    return matchesFilter && matchesSearch;
  });

  grid.innerHTML = filtered.length ? filtered.map(p=>`
    <article class="product-card">
      <button class="heart ${favorites.has(p.id) ? "saved":""}" data-id="${p.id}" aria-label="Guardar favorito">${favorites.has(p.id) ? "♥":"♡"}</button>
      <div class="product-image">${p.label}<br><small>imagen del producto</small></div>
      <div class="product-info">
        <div class="product-brand">${p.brand}</div>
        <div class="product-name">${p.name}</div>
        <div class="product-meta"><span>${p.category}</span><span class="product-price">${p.price}</span></div>
      </div>
    </article>`).join("") : `<p>No encontramos productos con esa búsqueda.</p>`;

  document.querySelectorAll(".heart").forEach(btn=>btn.addEventListener("click",()=>{
    const id = Number(btn.dataset.id);
    favorites.has(id) ? favorites.delete(id) : favorites.add(id);
    favoriteCount.textContent = favorites.size;
    renderProducts();
  }));
}

document.querySelectorAll(".filter").forEach(btn=>btn.addEventListener("click",()=>{
  currentFilter = btn.dataset.filter;
  document.querySelectorAll(".filter").forEach(b=>b.classList.remove("active"));
  btn.classList.add("active");
  renderProducts();
}));

search.addEventListener("input", renderProducts);

renderCategories();
renderProducts();

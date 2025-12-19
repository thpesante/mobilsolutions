const firebaseConfig = {
    apiKey: "AIzaSyDHZzoPhzUPX-6BWaCx4J5xeXwSeOYmkMY",
    authDomain: "taxinet-929d8.firebaseapp.com",
    projectId: "taxinet-929d8",
    storageBucket: "taxinet-929d8.appspot.com",
    messagingSenderId: "52566606294",
    appId: "1:52566606294:web:6a2b4f1e7c964502c46477"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// --- Location Data ---
const ECUADOR_DATA = {
    "Azuay": ["Cuenca", "Girón", "Gualaceo", "Nabón", "Paute", "Pucará", "San Fernando", "Santa Isabel", "Sigsig", "Oña", "Chordeleg", "El Pan", "Sevilla de Oro", "Guachapala", "Camilo Ponce Enríquez"],
    "Bolívar": ["Guaranda", "Chillanes", "Chimbo", "Echeandía", "San Miguel", "Caluma", "Las Naves"],
    "Cañar": ["Azogues", "Biblián", "Cañar", "La Troncal", "El Tambo", "Déleg", "Suscal"],
    "Carchi": ["Tulcán", "Bolívar", "Espejo", "Mira", "Montúfar", "San Pedro de Huaca"],
    "Chimborazo": ["Riobamba", "Alausi", "Colta", "Chambo", "Chunchi", "Guamote", "Guano", "Pallatanga", "Penipe", "Cumandá"],
    "Cotopaxi": ["Latacunga", "La Maná", "Pangua", "Pujilí", "Salcedo", "Saquisilí", "Sigchos"],
    "El Oro": ["Machala", "Arenillas", "Atahualpa", "Balsas", "Chilla", "El Guabo", "Huaquillas", "Marcabelí", "Pasaje", "Piñas", "Portovelo", "Santa Rosa", "Zaruma", "Las Lajas"],
    "Esmeraldas": ["Esmeraldas", "Eloy Alfaro", "Muisne", "Quinindé", "San Lorenzo", "Atacames", "Rioverde"],
    "Galápagos": ["San Cristóbal", "Isabela", "Santa Cruz"],
    "Guayas": ["Guayaquil", "Alfredo Baquerizo Moreno", "Balao", "Balzar", "Colimes", "Daule", "Durán", "El Empalme", "El Triunfo", "Milagro", "Naranjal", "Naranjito", "Palestina", "Pedro Carbo", "Samborondón", "Santa Lucía", "Salitre", "San Jacinto de Yaguachi", "Playas", "Simón Bolívar", "Coronel Marcelino Maridueña", "Lomas de Sargentillo", "Nobol", "General Antonio Elizalde", "Isidro Ayora"],
    "Imbabura": ["Ibarra", "Antonio Ante", "Cotacachi", "Otavalo", "Pimampiro", "San Miguel de Urcuquí"],
    "Loja": ["Loja", "Calvas", "Catamayo", "Celica", "Chaguarpamba", "Espíndola", "Gonzanamá", "Macará", "Paltas", "Puyango", "Saraguro", "Sozoranga", "Zapotillo", "Pindal", "Quilanga", "Olmedo"],
    "Los Ríos": ["Babahoyo", "Baba", "Montalvo", "Puebloviejo", "Quevedo", "Urdaneta", "Ventanas", "Vínces", "Palenque", "Buena Fe", "Valencia", "Mocache", "Quinsaloma"],
    "Manabí": ["Portoviejo", "Bolívar", "Chone", "El Carmen", "Flavio Alfaro", "Jipijapa", "Junín", "Manta", "Montecristi", "Paján", "Pedernales", "Pichincha", "Rocafuerte", "Santa Ana", "Sucre", "Tosagua", "24 de Mayo", "Jama", "Jaramijó", "Olmedo", "Puerto López", "San Vicente"],
    "Morona Santiago": ["Morona", "Gualaquiza", "Limón Indanza", "Palora", "Santiago", "Sucúa", "Huamboya", "San Juan Bosco", "Taisha", "Logroño", "Pablo Sexto", "Tiwintza"],
    "Napo": ["Tena", "Archidona", "El Chaco", "Quijos", "Carlos Julio Arosemena Tola"],
    "Orellana": ["Orellana", "Aguarico", "La Joya de los Sachas", "Loreto"],
    "Pastaza": ["Pastaza", "Mera", "Santa Clara", "Arajuno"],
    "Pichincha": ["Quito", "Cayambe", "Mejía", "Pedro Moncayo", "Rumiñahui", "San Miguel de los Bancos", "Pedro Vicente Maldonado", "Puerto Quito"],
    "Santa Elena": ["Santa Elena", "La Libertad", "Salinas"],
    "Santo Domingo de los Tsáchilas": ["Santo Domingo"],
    "Sucumbíos": ["Lago Agrio", "Gonzalo Pizarro", "Putumayo", "Shushufindi", "Sucumbíos", "Cascales", "Cuyabeno"],
    "Tungurahua": ["Ambato", "Baños de Agua Santa", "Cevallos", "Mocha", "Patate", "Quero", "San Pedro de Pelileo", "Santiago de Píllaro", "Tisaleo"],
    "Zamora Chinchipe": ["Zamora", "Centinela del Cóndor", "Chinchipe", "El Pangui", "Nangaritza", "Palanda", "Yacuambi", "Yantzaza"]
};


// --- Global State ---
let currentUser = null; // Holds profile data from Firestore
let temporaryLocation = null; // Holds location selected in the modal
let allLocalProducts = [];
let allLocalOffers = [];
let localVendors = [];


// --- DOM Elements ---
const getEl = (id) => document.getElementById(id);
const mainContent = getEl('main-content');
const categoryScroll = getEl('category-scroll');
const offersContainer = getEl('offers-container');
const recommendationsContainer = getEl('recommendations-container');
const productGrid = getEl('product-grid');
const searchInput = getEl('search-input');
const productsSection = getEl('products-section');
const vendorsContainer = getEl('vendedores-container');

// Location Modal Elements
const locationButton = getEl('location-button');
const locationModal = getEl('location-modal');
const provinceSelect = getEl('province-select');
const cantonSelect = getEl('canton-select');
const cancelLocationChange = getEl('cancel-location-change');
const saveLocationChange = getEl('save-location-change');

const spinner = '<div class="spinner-container"><div class="spinner"></div></div>';

// --- Authentication ---
auth.onAuthStateChanged(user => {
    if (user) {
        console.log("Usuario autenticado:", user.uid);
        // Load data with the user's default location from Firestore first
        loadHomepageData(user.uid, null); 
    } else {
        window.location.href = 'app.html';
    }
});


// --- Data Loading and Processing ---

const normalizeLocation = (str) => (typeof str === 'string' ? str.trim().toLowerCase() : '');

async function loadHomepageData(uid, newLocation) {
    // If it's the first load, set up categories and scrollers
    if (!newLocation) {
        displayCategories();
        startAutoScroll(categoryScroll);
        startAutoScroll(vendorsContainer);
    }
    showAllSpinners();

    try {
        // If currentUser is not loaded yet, fetch from Firestore
        if (!currentUser) {
            const userDoc = await db.collection('users').doc(uid).get();
            if (!userDoc.exists) throw new Error("User document not found in Firestore.");
            currentUser = { uid, ...userDoc.data() };
            console.log("Datos del comprador (desde Firestore):", currentUser);
        }

        // Determine which location to use: the temporary one from the modal or the user's default
        const locationToUse = newLocation || { province: currentUser.province, canton: currentUser.canton };
        
        if (!locationToUse.province || !locationToUse.canton) {
            showEmptyState("Define una ubicación en tu perfil o selecciónala manualmente para empezar.");
            return;
        }

        const targetProvince = normalizeLocation(locationToUse.province);
        const targetCanton = normalizeLocation(locationToUse.canton);
        console.log(`Cargando datos para: Provincia='${targetProvince}', Cantón='${targetCanton}'`);

        const vendorsSnap = await db.collection('users').where('role', '==', 'Vendedor').get();
        const allVendors = vendorsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        const vendorsMap = new Map();
        allVendors.forEach(v => {
            v.statusInfo = isVendorOpen(v);
            vendorsMap.set(v.id, v);
        });

        localVendors = allVendors.filter(v => 
            normalizeLocation(v.province) === targetProvince && 
            normalizeLocation(v.canton) === targetCanton
        );
        
        console.log(`Encontrados ${localVendors.length} vendedores en la zona seleccionada.`);
        renderVendors(localVendors);

        if (localVendors.length === 0) {
            showEmptyState("No hay vendedores en tu zona por el momento. ¡Prueba otra ubicación!");
            return;
        }

        const localVendorIds = localVendors.map(v => v.id);

        const idChunks = [];
        for (let i = 0; i < localVendorIds.length; i += 10) {
            idChunks.push(localVendorIds.slice(i, i + 10));
        }

        const productPromises = idChunks.map(chunk => db.collection('products').where('uidVendedor', 'in', chunk).get());
        const productSnapshots = await Promise.all(productPromises);
        
        let allProducts = [];
        productSnapshots.forEach(snapshot => {
            snapshot.docs.forEach(doc => {
                 const product = { id: doc.id, ...doc.data() };
                product.vendor = vendorsMap.get(product.uidVendedor);
                if (product.vendor) allProducts.push(product);
            });
        });
        
        console.log(`Total de ${allProducts.length} productos cargados de vendedores locales.`);

        allLocalProducts = allProducts.filter(p => !p.isOffer);
        allLocalOffers = allProducts.filter(p => p.isOffer);

        renderProducts(allLocalProducts);
        renderOffers(allLocalOffers);
        fetchRecommendations(uid, allProducts);

    } catch (error) {
        console.error("Error crítico al cargar los datos de la página principal:", error);
        showEmptyState("Hubo un error al cargar los datos. Revisa la consola.");
    }
}


function showAllSpinners() {
    offersContainer.innerHTML = spinner;
    recommendationsContainer.innerHTML = spinner;
    productGrid.innerHTML = spinner;
    vendorsContainer.innerHTML = spinner;
}

function showEmptyState(message) {
    vendorsContainer.innerHTML = `<p class="empty-state">${message}</p>`;
    productGrid.innerHTML = '';
    offersContainer.innerHTML = '';
    recommendationsContainer.innerHTML = '';
}

function isVendorOpen(vendor) {
    if (vendor.status?.closedToday === true) {
        return { isOpen: false, reason: vendor.status.reason || 'Cerrado temporalmente' };
    }
    if (!vendor.schedule) {
        return { isOpen: true, reason: 'Horario no definido' };
    }
    try {
        const now = new Date();
        const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const todayName = dayNames[now.getDay()];
        const todaySchedule = vendor.schedule[todayName];

        if (!todaySchedule || !todaySchedule.open || !todaySchedule.close) {
            return { isOpen: false, reason: 'Cerrado este día' };
        }
        const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
        if (currentTime >= todaySchedule.open && currentTime < todaySchedule.close) {
            return { isOpen: true, reason: 'Abierto' };
        }
        return { isOpen: false, reason: (currentTime < todaySchedule.open) ? `Abre a las ${todaySchedule.open}` : `Cerró a las ${todaySchedule.close}` };
    } catch (e) {
        return { isOpen: false, reason: 'Error en horario' };
    }
}

async function fetchRecommendations(uid, localProducts) {
    recommendationsContainer.innerHTML = spinner;
    try {
        const ordersSnap = await db.collection("pedidos").where("compradorUID", "==", uid).limit(10).get();
        if (ordersSnap.empty) {
             renderRecommendations([]);
            return;
        }

        const catCounts = new Map();
        const prodPromises = ordersSnap.docs.map(doc => doc.ref.collection("productos").get());
        const prodSnaps = await Promise.all(prodPromises);
        
        prodSnaps.forEach(snap => snap.forEach(prodDoc => {
            const cat = prodDoc.data().category;
            if(cat) catCounts.set(cat, (catCounts.get(cat) || 0) + 1);
        }));

        if (catCounts.size === 0) { renderRecommendations([]); return; }
        
        const topCat = [...catCounts.entries()].sort((a,b) => b[1]-a[1])[0][0];
        const recoProds = localProducts.filter(p => p.category === topCat && !p.isOffer).slice(0, 10);
        
        renderRecommendations(recoProds);
    } catch (e) {
        console.error("Error building recommendations:", e);
        recommendationsContainer.innerHTML = '<p class="empty-state">Error al cargar recomendaciones.</p>';
    }
}


// --- UI Rendering ---

function renderVendors(vendors) {
    if (!vendors || vendors.length === 0) { return; }
    vendorsContainer.innerHTML = vendors.map(createVendorCard).join('');
}

function renderProducts(products) {
    if (!products || products.length === 0) {
        productGrid.innerHTML = '<p class="empty-state">No hay productos que coincidan.</p>';
        return;
    }
    productGrid.innerHTML = products.map(createProductCard).join('');
}

function renderOffers(offers) {
    if (!offers || offers.length === 0) {
        offersContainer.innerHTML = '<p class="empty-state">No hay ofertas en tu zona.</p>';
        return;
    }
    offersContainer.innerHTML = offers.map(createOfferCard).join('');
}

function renderRecommendations(products) {
    if (!products || products.length === 0) {
        recommendationsContainer.innerHTML = '<p class="empty-state">Compra más para ver recomendaciones.</p>';
        return;
    }
    recommendationsContainer.innerHTML = products.map(createProductCard).join('');
}


// --- Card Creation ---

function createVendorCard(vendor) {
    const isClosed = !vendor.statusInfo.isOpen;
    const linkClass = isClosed ? 'vendor-card-link closed' : 'vendor-card-link';

    return `
        <a href="productos_local.html?vendorId=${vendor.id}" class="${linkClass}" title="${vendor.fullName} - ${vendor.statusInfo.reason}">
            <div class="category-card" style="padding: 10px 0; background-color: #f0f0f0; box-shadow: none; width: 100%; height: auto; min-height: 120px;">
                <img src="${vendor.profilePicUrl || 'https://via.placeholder.com/150'}" alt="${vendor.fullName}" style="width: 70px; height: 70px; border-radius: 50%; object-fit: cover; border: 2px solid var(--primary-purple); margin-bottom: 8px;">
                <p style="font-size: 13px; font-weight: bold; text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 90%;">${vendor.fullName}</p>
            </div>
        </a>`;
}

function createProductCard(p) {
    const isOutOfStock = p.disponible === false;
    const isVendorClosed = p.vendor?.statusInfo?.isOpen === false;

    let cardClass = 'product-card';
    let title = p.name;

    if (isOutOfStock) {
        cardClass += ' unavailable';
        title = `${p.name} (Agotado)`;
    } else if (isVendorClosed) {
        cardClass += ' closed';
        title = `${p.name} (Local cerrado: ${p.vendor.statusInfo.reason})`;
    }

    return `
        <div class="${cardClass}" data-id="${p.id}" title="${title}">
            <div class="img-container">
                <img src="${p.imageUrl || 'https://via.placeholder.com/150'}" alt="${p.name}">
            </div>
            <div class="info">
                <p class="name">${p.name}</p>
                <p class="price">S/ ${p.price.toFixed(2)}</p>
            </div>
        </div>`;
}

function createOfferCard(p) {
    const isOutOfStock = p.disponible === false;
    const isVendorClosed = p.vendor?.statusInfo?.isOpen === false;
    let cardClass = 'offer-card';
    let title = p.name;

    if (isOutOfStock) cardClass += ' unavailable';
    else if (isVendorClosed) cardClass += ' closed';
    
    return `
        <div class="${cardClass}" data-id="${p.id}" title="${title}">
            <div class="img-container">
                <img src="${p.imageUrl || 'https://via.placeholder.com/220'}" alt="${p.name}">
            </div>
            <div class="info">
                <p class="name">${p.name}</p>
                <div class="price-container">
                    ${p.price ? `<span class="price-original">S/ ${p.price.toFixed(2)}</span>` : ''}
                    ${p.offerPrice ? `<span class="price-final">S/ ${p.offerPrice.toFixed(2)}</span>` : ''}
                </div>
            </div>
        </div>`;
}


// --- UI Interaction & Helpers ---

function displayCategories() {
    const categories = [
        { name: "Todos", icon: "todos.png" }, { name: "Alcohol", icon: "alcohol.png" },
        { name: "Bebidas", icon: "bebidas.png" }, { name: "Comida", icon: "comida.png" },
        { name: "Farmacia", icon: "farmacia.png" }, { name: "Comida Rápida", icon: "comida_rapida.png" },
        { name: "Snacks", icon: "snacks.png" }
    ];
    categoryScroll.innerHTML = categories.map(cat => `
        <div class="category-card" data-category="${cat.name}">
            <img src="images/${cat.icon}" alt="${cat.name}"><p>${cat.name}</p>
        </div>`).join('');
    categoryScroll.querySelector('.category-card')?.classList.add('active');
}

function startAutoScroll(element) {
    if (element.scrollInterval) clearInterval(element.scrollInterval);
    element.scrollInterval = setInterval(() => {
        if (!element || element.matches(':hover') || element.scrollWidth <= element.clientWidth) return;
        element.scrollLeft >= (element.scrollWidth - element.clientWidth - 5)
            ? element.scrollTo({ left: 0, behavior: 'smooth' })
            : element.scrollBy({ left: 120, behavior: 'smooth' });
    }, 4000);
}


// --- Location Modal Logic ---

function populateCantons(provinceName) {
    const cantons = ECUADOR_DATA[provinceName] || [];
    cantonSelect.innerHTML = '<option value="">Selecciona un cantón</option>'; // Placeholder
    cantons.forEach(canton => {
        const option = document.createElement('option');
        option.value = canton;
        option.textContent = canton;
        cantonSelect.appendChild(option);
    });
    cantonSelect.disabled = cantons.length === 0;
}

function openLocationModal() {
    if (!currentUser) { alert("Tus datos de usuario aún no han cargado."); return; }

    provinceSelect.innerHTML = '<option value="">Selecciona una provincia</option>';
    Object.keys(ECUADOR_DATA).forEach(province => {
        const option = document.createElement('option');
        option.value = province;
        option.textContent = province;
        provinceSelect.appendChild(option);
    });
    
    // Pre-select current location
    const currentLocation = temporaryLocation || currentUser;
    if (currentLocation.province) {
        provinceSelect.value = currentLocation.province;
        populateCantons(currentLocation.province);
        if (currentLocation.canton) {
            cantonSelect.value = currentLocation.canton;
        }
    }

    saveLocationChange.disabled = !cantonSelect.value;
    locationModal.style.display = 'flex';
}

function closeLocationModal() {
    locationModal.style.display = 'none';
}


// --- Event Listeners ---

locationButton.addEventListener('click', openLocationModal);
cancelLocationChange.addEventListener('click', closeLocationModal);
locationModal.addEventListener('click', (e) => {
    if (e.target === locationModal) closeLocationModal(); // Close if clicking on overlay
});

provinceSelect.addEventListener('change', () => {
    populateCantons(provinceSelect.value);
    cantonSelect.value = ''; // Reset canton selection
    saveLocationChange.disabled = true;
});

cantonSelect.addEventListener('change', () => {
    saveLocationChange.disabled = !cantonSelect.value;
});

saveLocationChange.addEventListener('click', () => {
    const newProvince = provinceSelect.value;
    const newCanton = cantonSelect.value;

    if (!newProvince || !newCanton) {
        alert("Debes seleccionar una provincia y un cantón.");
        return;
    }

    temporaryLocation = { province: newProvince, canton: newCanton };
    closeLocationModal();
    loadHomepageData(currentUser.uid, temporaryLocation);
});


searchInput.addEventListener('input', e => {
    const query = e.target.value.toLowerCase();
    const activeCategory = categoryScroll.querySelector('.category-card.active')?.dataset.category || "Todos";
    
    let productsToFilter = (activeCategory === "Todos") 
        ? allLocalProducts 
        : allLocalProducts.filter(p => p.category === activeCategory);
    
    const searchResults = productsToFilter.filter(p => p.name.toLowerCase().includes(query));
    renderProducts(searchResults);
});

mainContent.addEventListener('click', (e) => {
    const card = e.target.closest('.product-card, .offer-card, .category-card');
    if (!card) return;

    if (card.classList.contains('unavailable') || card.classList.contains('closed')) {
        return; // Ignores clicks on disabled cards
    }
    
    const vendorLink = e.target.closest('.vendor-card-link');
    if (vendorLink) {
        if (vendorLink.classList.contains('closed')) e.preventDefault();
        return;
    }

    const productId = card.dataset.id;
    const category = card.dataset.category;

    if (productId) {
        window.location.href = `ver-producto.html?id=${productId}`;
    } else if (category) {
        handleCategoryClick(card);
    }
});

function handleCategoryClick(clickedCard) {
    categoryScroll.querySelectorAll('.category-card').forEach(c => c.classList.remove('active'));
    clickedCard.classList.add('active');

    const category = clickedCard.dataset.category;
    const query = searchInput.value.toLowerCase();

    let filtered = (category === "Todos")
        ? allLocalProducts
        : allLocalProducts.filter(p => p.category === category);
    
    if (query) {
        filtered = filtered.filter(p => p.name.toLowerCase().includes(query));
    }

    renderProducts(filtered);
    productsSection.scrollIntoView({ behavior: 'smooth' });
}

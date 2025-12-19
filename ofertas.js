function navigateTo(path) { window.location.href = path; }

const firebaseConfig = { apiKey: "AIzaSyDHZzoPhzUPX-6BWaCx4J5xeXwSeOYmkMY", authDomain: "taxinet-929d8.firebaseapp.com", projectId: "taxinet-929d8", storageBucket: "taxinet-929d8.appspot.com", messagingSenderId: "52566606294", appId: "1:52566606294:web:6a2b4f1e7c964502c46477" };

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

const userEmailSpan = document.getElementById('user-email');
const logoutBtn = document.getElementById('logout-btn');
const productGrid = document.getElementById('product-selection-grid');
const activeOffersContainer = document.getElementById('active-offers-container');
const suggestionsContainer = document.getElementById('suggestions-container');
const createOfferBtn = document.getElementById('create-offer-btn');
const discountInput = document.getElementById('discount-percentage');

auth.onAuthStateChanged(async (user) => {
    if (user) {
        userEmailSpan.textContent = user.email;
        // Ahora pasamos el objeto 'user' para poder usar su UID en las consultas
        await Promise.all([ loadProductsForSelection(user), loadActiveOffers(user), loadOfferSuggestions(user) ]);
    } else { 
        window.location.href = 'app.html'; 
    }
});

// Modificado para aceptar 'user' y filtrar por 'uidVendedor'
async function loadProductsForSelection(user) {
     try {
        // Filtramos los productos por el uidVendedor que coincida con el usuario actual
        const snapshot = await db.collection('products').where('uidVendedor', '==', user.uid).get();
        const products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        productGrid.innerHTML = '';
        const productsWithoutOffer = products.filter(p => !p.isOffer);
        if (productsWithoutOffer.length === 0) {
            productGrid.innerHTML = '<p>No tienes productos disponibles para crear nuevas ofertas.</p>';
            return;
        }
        productsWithoutOffer.forEach(product => {
            const item = document.createElement('div');
            item.className = 'product-item';
            item.dataset.productId = product.id;
            item.innerHTML = `<input type="checkbox" class="checkbox" data-product-id="${product.id}" style="display: none;"><img src="${product.imageUrl || 'https://via.placeholder.com/150'}" alt="${product.name}"><div class="product-name">${product.name}</div>`;
            item.addEventListener('click', () => toggleProductSelection(product.id));
            productGrid.appendChild(item);
        });
    } catch (error) { 
        console.error('Error cargando productos:', error);
        productGrid.innerHTML = `<p>Error al cargar productos. Por favor, revisa las reglas de seguridad de Firestore y asegúrate de que exista un índice para la consulta.</p>`;
    }
}

function toggleProductSelection(productId, forceState = null) {
    const item = productGrid.querySelector(`.product-item[data-product-id='${productId}']`);
    if (!item) return;
    const checkbox = item.querySelector('.checkbox');
    const newState = forceState !== null ? forceState : !checkbox.checked;
    checkbox.checked = newState;
    item.classList.toggle('selected', newState);
}

// Modificado para aceptar 'user' y filtrar por 'uidVendedor'
async function loadActiveOffers(user) {
    try {
        // Añadimos el filtro por 'uidVendedor'
        const snapshot = await db.collection('products').where('isOffer', '==', true).where('uidVendedor', '==', user.uid).get();
        const offers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        activeOffersContainer.innerHTML = '';
        if (offers.length === 0) {
            activeOffersContainer.innerHTML = '<p>No hay ofertas activas en este momento.</p>';
            return;
        }
        offers.forEach(offer => {
            const card = document.createElement('div');
            card.className = 'offer-card';
            card.innerHTML = `<img src="${offer.imageUrl || 'https://via.placeholder.com/280'}" alt="${offer.name}"><h3>${offer.name}</h3><div class="price-container"><span class="price-original">S/ ${parseFloat(offer.price || 0).toFixed(2)}</span><span class="price-final">S/ ${parseFloat(offer.offerPrice || 0).toFixed(2)}</span></div><div class="discount-badge">-${offer.discountPercentage}%</div><button class="delete-offer-btn" data-product-id="${offer.id}" title="Eliminar Oferta"><i class="fas fa-trash-alt"></i></button>`;
            card.querySelector('.delete-offer-btn').addEventListener('click', () => removeOffer(offer.id));
            activeOffersContainer.appendChild(card);
        });
    } catch (error) { 
        console.error('Error cargando ofertas activas:', error);
        activeOffersContainer.innerHTML = `<p>Error al cargar ofertas. Firestore podría requerir un índice compuesto. Revisa la consola del navegador para ver el enlace y crearlo.</p>`;
    }
}

// Modificado para aceptar 'user' y filtrar por 'uidVendedor'
async function loadOfferSuggestions(user) {
    try {
        // 1. Obtener solo los productos del usuario actual
        const productsSnapshot = await db.collection('products').where('uidVendedor', '==', user.uid).get();
        const userProducts = productsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const allUserProductIds = new Set(userProducts.map(p => p.id));

        // 2. Obtener los pedidos de este vendedor para saber qué productos se han vendido
        const ordersSnapshot = await db.collection('orders').where('uidVendedor', '==', user.uid).get();
        const soldProductIds = new Set();
        ordersSnapshot.docs.forEach(doc => {
            const items = doc.data().items || [];
            items.forEach(item => soldProductIds.add(item.productId));
        });

        // 3. Encontrar los IDs de productos del usuario que nunca se han vendido
        const unsoldProductIds = [...allUserProductIds].filter(id => !soldProductIds.has(id));
        
        suggestionsContainer.innerHTML = '';
        if (unsoldProductIds.length === 0) {
            suggestionsContainer.innerHTML = '<p>¡Buen trabajo! Todos tus productos se han vendido al menos una vez.</p>';
            return;
        }

        // 4. De los no vendidos, crear las sugerencias
        const suggestions = userProducts.filter(p => unsoldProductIds.includes(p.id) && !p.isOffer);
        
        if (suggestions.length === 0) {
            suggestionsContainer.innerHTML = '<p>No hay sugerencias de ofertas por ahora.</p>';
            return;
        }

        suggestions.slice(0, 5).forEach(product => { // Limitar a 5 sugerencias
            const card = document.createElement('div');
            card.className = 'suggestion-card';
            card.innerHTML = `<img src="${product.imageUrl || 'https://via.placeholder.com/200'}" alt="${product.name}"><div class="product-name">${product.name}</div><button class="quick-offer-btn" data-product-id="${product.id}">Crear Oferta Rápida</button>`;
            card.querySelector('.quick-offer-btn').addEventListener('click', () => { 
                document.querySelectorAll('.product-item.selected').forEach(item => toggleProductSelection(item.dataset.productId, false));
                toggleProductSelection(product.id, true);
                discountInput.focus();
                discountInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
            });
            suggestionsContainer.appendChild(card);
        });

    } catch (error) { 
        console.error('Error cargando sugerencias:', error);
        suggestionsContainer.innerHTML = `<p>No se pudieron cargar las sugerencias. Revisa la consola para posibles errores de índices en Firestore.</p>`;
    }
}

createOfferBtn.addEventListener('click', async () => {
    const user = auth.currentUser;
    if (!user) return alert('Debes iniciar sesión para crear ofertas.');

    const productIds = Array.from(productGrid.querySelectorAll('.checkbox:checked')).map(cb => cb.dataset.productId);
    const discountPercentage = parseInt(discountInput.value);

    if (productIds.length === 0) return alert('Por favor, selecciona al menos un producto.');
    if (isNaN(discountPercentage) || discountPercentage < 1 || discountPercentage > 99) return alert('Introduce un descuento válido (1-99).');
    
    try {
        const batch = db.batch();
        const productPromises = productIds.map(id => db.collection('products').doc(id).get());
        const productDocs = await Promise.all(productPromises);

        for (const doc of productDocs) {
            // Doble chequeo para asegurar que el producto le pertenece
            if (doc.exists && doc.data().uidVendedor === user.uid) { 
                const product = doc.data();
                const originalPrice = product.price;
                const offerPrice = originalPrice * (1 - discountPercentage / 100);
                
                batch.update(doc.ref, {
                    isOffer: true,
                    offerPrice: offerPrice,
                    discountPercentage: discountPercentage
                });
            }
        }
        
        await batch.commit();
        alert('¡Ofertas creadas con éxito!');
        discountInput.value = '';
        await Promise.all([ loadProductsForSelection(user), loadActiveOffers(user), loadOfferSuggestions(user) ]);

    } catch (error) { 
        console.error("Error al crear ofertas:", error);
        alert(`Error al crear las ofertas. Revisa la consola y las reglas de seguridad.`);
    }
});

async function removeOffer(productId) {
    const user = auth.currentUser;
    if (!user) return alert('Debes iniciar sesión para eliminar ofertas.');
    if (!confirm('¿Seguro que quieres eliminar esta oferta?')) return;

    try {
        const productRef = db.collection('products').doc(productId);
        
        const doc = await productRef.get();
        if (doc.exists && doc.data().uidVendedor !== user.uid) {
            alert('No tienes permiso para eliminar esta oferta.');
            return;
        }

        await productRef.update({
            isOffer: firebase.firestore.FieldValue.delete(),
            offerPrice: firebase.firestore.FieldValue.delete(),
            discountPercentage: firebase.firestore.FieldValue.delete()
        });

        alert('Oferta eliminada con éxito.');
        await Promise.all([ loadProductsForSelection(user), loadActiveOffers(user), loadOfferSuggestions(user) ]);
    } catch (error) { 
        console.error("Error al eliminar oferta:", error);
        alert(`Error al eliminar la oferta. Revisa la consola y las reglas de seguridad.`);
    }
}

logoutBtn.addEventListener('click', () => auth.signOut().then(() => { window.location.href = 'app.html'; }));
const menuBtn = document.getElementById('menu-btn');
const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('sidebar-overlay');
menuBtn.addEventListener('click', () => { sidebar.classList.toggle('open'); overlay.classList.toggle('open'); });
overlay.addEventListener('click', () => { sidebar.classList.remove('open'); overlay.classList.remove('open'); });
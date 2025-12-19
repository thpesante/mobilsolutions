const firebaseConfig = { apiKey: "AIzaSyDHZzoPhzUPX-6BWaCx4J5xeXwSeOYmkMY", authDomain: "taxinet-929d8.firebaseapp.com", projectId: "taxinet-929d8", storageBucket: "taxinet-929d8.appspot.com", messagingSenderId: "52566606294", appId: "1:52566606294:web:6a2b4f1e7c964502c46477" };
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

let currentUser = null, userCart = [], ubicacionSeleccionada = null, map, marker;

auth.onAuthStateChanged(user => user ? (currentUser = user, setupUI(), loadCart()) : window.location.href = '/');

function setupUI(){
    document.getElementById('main-content').innerHTML = `
        <div id="loader"><div class="spinner"></div></div>
        <div id="cart-view" class="hidden">
            <div class="cart-container"><div class="cart-items"><h2 id="cart-title">Tu Carrito</h2><div id="cart-items-list"></div></div><div class="order-summary"><h2>Resumen de Pedido</h2><div id="summary-subtotal" class="summary-row"></div><div id="summary-total" class="summary-row summary-total"></div><div class="delivery-options"><h4>Opciones de Entrega</h4><div class="form-check"><input class="form-check-input" type="checkbox" id="check_retirar_tienda"><label class="form-check-label" for="check_retirar_tienda">Retirar en tienda</label></div><div class="form-check"><input class="form-check-input" type="checkbox" id="check_enviar_domicilio"><label class="form-check-label" for="check_enviar_domicilio">Enviar a domicilio</label></div></div><button id="checkout-btn" class="checkout-btn">Proceder al Pago</button></div></div></div>
        <div id="empty-cart-view" class="empty-cart-container hidden"><i class="fas fa-shopping-cart"></i><h2>Tu carrito está vacío</h2><p>Parece que aún no has agregado productos. ¡Empieza a explorar!</p><a href="home.html">Seguir Comprando</a></div>
        <section id="recommendations-section" class="products-section hidden"><h2>Productos Recomendados</h2><div id="recommendations-container" class="horizontal-scroll"></div></section>
        <section id="offers-section" class="products-section hidden"><h2>Ofertas</h2><div id="offers-container" class="horizontal-scroll"></div></section>
    `;
    document.querySelector('.bottom-nav').innerHTML = `<a href="home.html"><i class="fas fa-home"></i><p>Inicio</p></a><a href="cart.html" class="active"><i class="fas fa-shopping-cart"></i><p>Carrito</p></a><a href="
    
    mi-cuenta.html"><i class="fas fa-user"></i><p>Cuenta</p></a>`;

    const checkRetirar = document.getElementById('check_retirar_tienda'), checkEnviar = document.getElementById('check_enviar_domicilio');
    checkRetirar.addEventListener('change', (e) => { e.target.checked ? (checkEnviar.checked = false, checkEnviar.disabled = true) : checkEnviar.disabled = false; });
    checkEnviar.addEventListener('change', (e) => { e.target.checked ? (checkRetirar.checked = false, checkRetirar.disabled = true, mostrarMapaEnDialogo()) : (checkRetirar.disabled = false, ubicacionSeleccionada = null); });
    
    document.getElementById('checkout-btn').addEventListener('click', mostrarResumenPedido);
    setupModal('map-modal', 'confirm-location-btn', () => {
        if(ubicacionSeleccionada) { document.getElementById('map-modal').style.display = 'none'; } 
        else { alert('Por favor, selecciona una ubicación en el mapa.'); }
    });
    setupModal('order-summary-modal', 'confirm-order-btn', generarPedido);
}

function setupModal(modalId, confirmBtnId, onConfirm) {
    const modal = document.getElementById(modalId);
    modal.querySelector('.close-btn').onclick = () => modal.style.display = "none";
    document.getElementById(confirmBtnId).onclick = onConfirm;
    window.addEventListener('click', (event) => { if (event.target == modal) modal.style.display = "none"; });
}

function mostrarMapaEnDialogo() { /* ... existing code ... */ }
function initMap(location) { /* ... existing code ... */ }
function mostrarResumenPedido(){ /* ... existing code ... */ }
async function generarPedido(){ /* ... existing code ... */ }

function loadCart() {
    const cartRef = db.collection('carritos').doc(currentUser.uid);
    cartRef.onSnapshot(doc => {
        document.getElementById('loader').classList.add('hidden');
        const cartView = document.getElementById('cart-view'), emptyCartView = document.getElementById('empty-cart-view');
        if (doc.exists && doc.data().products && doc.data().products.length > 0) {
            userCart = doc.data().products;
            renderCart(userCart);
            cartView.classList.remove('hidden');
            emptyCartView.classList.add('hidden');
            document.getElementById('recommendations-section').classList.add('hidden');
            document.getElementById('offers-section').classList.add('hidden');
        } else {
            userCart = [];
            cartView.classList.add('hidden');
            emptyCartView.classList.remove('hidden');
            fetchRecommendedProducts();
            fetchOffers();
        }
    });
}

function renderCart(products) {
    document.getElementById('cart-items-list').innerHTML = products.map(p => `
        <div class="cart-item" data-id="${p.id}">
            <img src="${p.imageUrl}" alt="${p.name}"><div class="item-info"><h3>${p.name}</h3><p>S/ ${p.offerPrice ? p.offerPrice.toFixed(2) : p.price.toFixed(2)}</p></div>
            <div class="quantity-controls"><button onclick="decrementQuantity('${p.id}')">-</button><span>${p.quantity}</span><button onclick="incrementQuantity('${p.id}')">+</button></div>
            <p class="item-price">S/ ${((p.offerPrice || p.price) * p.quantity).toFixed(2)}</p>
            <button class="remove-item" onclick="removeItem('${p.id}')"><i class="fas fa-trash-alt"></i></button></div>`).join('');
    updateSummary(products);
}

function updateSummary(products) {
    const subtotal = products.reduce((acc, p) => acc + (p.offerPrice || p.price) * p.quantity, 0);
    document.getElementById('summary-subtotal').innerHTML = `<span>Subtotal</span><span>S/ ${subtotal.toFixed(2)}</span>`;
    document.getElementById('summary-total').innerHTML = `<span>Total</span><span>S/ ${subtotal.toFixed(2)}</span>`;
}

async function fetchOffers() {
    const offersContainer = document.getElementById('offers-container');
    const offersSection = document.getElementById('offers-section');
    try {
        const snapshot = await db.collection("products").where("isOffer", "==", true).limit(10).get();
        if (snapshot.empty) {
            offersSection.classList.add('hidden');
            return;
        }
        const offers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        offersContainer.innerHTML = offers.map(renderProductCard).join('');
        offersSection.classList.remove('hidden');
    } catch (error) {
        console.error("Error fetching offers:", error);
    }
}

async function fetchRecommendedProducts() {
    const recContainer = document.getElementById('recommendations-container');
    const recSection = document.getElementById('recommendations-section');
    try {
        const ordersSnapshot = await db.collection("pedidos").where("compradorUID", "==", currentUser.uid).get();
        if (ordersSnapshot.empty) {
            recSection.classList.add('hidden');
            return;
        }
        let categoryCounts = {};
        for (const orderDoc of ordersSnapshot.docs) {
            const productsSnapshot = await orderDoc.ref.collection('productos').get();
            productsSnapshot.forEach(productDoc => {
                const category = productDoc.data().category;
                if(category) categoryCounts[category] = (categoryCounts[category] || 0) + 1;
            });
        }
        const topCategories = Object.keys(categoryCounts).sort((a, b) => categoryCounts[b] - categoryCounts[a]).slice(0, 3);

        if (topCategories.length === 0) {
            recSection.classList.add('hidden');
            return;
        }

        const productsSnapshot = await db.collection('products').where('category', 'in', topCategories).limit(10).get();
        const recommended = productsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        if(recommended.length > 0){
            recContainer.innerHTML = recommended.map(renderProductCard).join('');
            recSection.classList.remove('hidden');
        } else {
            recSection.classList.add('hidden');
        }
    } catch (error) {
        console.error("Error fetching recommendations:", error);
    }
}

function renderProductCard(product) {
    const price = product.isOffer ? product.offerPrice : product.price;
    return `
        <a href="ver-producto.html?id=${product.id}" class="product-card">
            <img src="${product.imageUrl || 'https://via.placeholder.com/150'}" alt="${product.name}">
            <div class="info">
                <p class="name">${product.name}</p>
                <p class="price">S/ ${price.toFixed(2)}</p>
            </div>
        </a>
    `;
}

function incrementQuantity(productId) { db.runTransaction(async t => { const ref = db.collection('carritos').doc(currentUser.uid); const doc = await t.get(ref); const p = doc.data().products; const i = p.findIndex(item => item.id === productId); p[i].quantity++; t.update(ref, {products: p}); }); }
function decrementQuantity(productId) { db.runTransaction(async t => { const ref = db.collection('carritos').doc(currentUser.uid); const doc = await t.get(ref); let p = doc.data().products; const i = p.findIndex(item => item.id === productId); if (p[i].quantity > 1) { p[i].quantity--; } else { p = p.filter(item => item.id !== productId); } t.update(ref, {products: p}); }); }
function removeItem(productId) { db.runTransaction(async t => { const ref = db.collection('carritos').doc(currentUser.uid); const doc = await t.get(ref); const p = doc.data().products.filter(item => item.id !== productId); t.update(ref, {products: p}); }); }

// --- Full versions of previously shortened functions for clarity ---
function mostrarMapaEnDialogo() {
    document.getElementById('map-modal').style.display = "block";
    if (typeof google === 'object' && typeof google.maps === 'object') {
        navigator.geolocation.getCurrentPosition(position => {
            const userLocation = { lat: position.coords.latitude, lng: position.coords.longitude };
            initMap(userLocation);
        }, () => initMap({ lat: -12.046374, lng: -77.042793 }));
    } else {
         document.getElementById('map').innerHTML = "<p>No se pudo cargar Google Maps. Verifica la clave de API.</p>"
    }
}

function initMap(location) {
    map = new google.maps.Map(document.getElementById("map"), { zoom: 15, center: location });
    marker = new google.maps.Marker({ position: location, map, draggable: true });
    ubicacionSeleccionada = location;
    map.addListener('click', (e) => { marker.setPosition(e.latLng); ubicacionSeleccionada = e.latLng.toJSON(); });
    marker.addListener('dragend', (e) => { ubicacionSeleccionada = e.latLng.toJSON(); });
}

function mostrarResumenPedido(){
    const checkRetirar = document.getElementById('check_retirar_tienda').checked;
    const checkEnviar = document.getElementById('check_enviar_domicilio').checked;

    if(!checkRetirar && !checkEnviar) return alert('Por favor, seleccione una opción de entrega.');
    if(checkEnviar && !ubicacionSeleccionada) return alert('Por favor, confirme una ubicación para el envío a domicilio.');

    let total = 0;
    let resumenText = "Cant  Producto              P.U.    P.T.\n";
    resumenText += "------------------------------------------\n";
    userCart.forEach(p => {
        const price = p.offerPrice || p.price;
        const itemTotal = p.quantity * price;
        total += itemTotal;
        resumenText += `${p.quantity.toString().padEnd(5)} ${p.name.padEnd(20)} ${price.toFixed(2).padEnd(8)} ${itemTotal.toFixed(2)}\n`;
    });
    resumenText += "------------------------------------------\n";
    resumenText += `Total: S/ ${total.toFixed(2)}`;

    document.getElementById('order-summary-text').textContent = resumenText;
    const qrcodeContainer = document.getElementById('qrcode');
    qrcodeContainer.innerHTML = "";
    new QRCode(qrcodeContainer, { text: resumenText, width: 200, height: 200 });

    document.getElementById('order-summary-modal').style.display = 'block';
}

async function generarPedido(){
    const btn = document.getElementById('confirm-order-btn');
    btn.disabled = true; btn.textContent = 'Generando...';

    const checkRetirar = document.getElementById('check_retirar_tienda').checked;
    const deliveryMethod = checkRetirar ? 'Retirar en tienda' : 'Enviar a domicilio';
    const total = userCart.reduce((acc, p) => acc + (p.offerPrice || p.price) * p.quantity, 0);

    const pedidoData = {
        compradorUID: currentUser.uid,
        date: firebase.firestore.FieldValue.serverTimestamp(),
        deliveryMethod,
        total,
        status: 'Pendiente',
        vendedorNombre: "El Barril",
        vendedorUbi: new firebase.firestore.GeoPoint(-2.9955010414123535, -79.0462417602539)
    };

    if (deliveryMethod === 'Enviar a domicilio') {
        pedidoData.clienteUbi = new firebase.firestore.GeoPoint(ubicacionSeleccionada.lat, ubicacionSeleccionada.lng);
        pedidoData.addressReference = document.getElementById('address-reference').value;
    }
    
    try {
        const nuevoPedidoRef = await db.collection('pedidos').add(pedidoData);
        const batch = db.batch();
        userCart.forEach(product => {
            const productRef = nuevoPedidoRef.collection('productos').doc();
            batch.set(productRef, product);
        });
        await batch.commit();
        await db.collection('carritos').doc(currentUser.uid).delete();
        alert('¡Pedido generado con éxito!');
        window.location.href = 'home.html';
    } catch (error) {
        console.error("Error al generar pedido: ", error);
        alert('Hubo un error al generar el pedido.');
    } finally {
        btn.disabled = false; btn.textContent = 'Confirmar Pedido';
    }
}

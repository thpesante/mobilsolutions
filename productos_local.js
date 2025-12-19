const firebaseConfig = { apiKey: "AIzaSyDHZzoPhzUPX-6BWaCx4J5xeXwSeOYmkMY", authDomain: "taxinet-929d8.firebaseapp.com", projectId: "taxinet-929d8", storageBucket: "taxinet-929d8.appspot.com", messagingSenderId: "52566606294", appId: "1:52566606294:web:6a2b4f1e7c964502c46477" };
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

const vendorNameDisplay = document.getElementById('vendor-name-display');
const vendorLogo = document.getElementById('vendor-logo');
const productsGrid = document.getElementById('products-grid');
const searchInput = document.getElementById('search-input');
let allVendorProducts = []; // To store all products for this vendor
let currentVendorId = null;

// Function to get query parameters from URL
function getQueryParams() {
    const params = {};
    window.location.search.substring(1).split('&').forEach(param => {
        const parts = param.split('=');
        params[parts[0]] = decodeURIComponent(parts[1]);
    });
    return params;
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
    const queryParams = getQueryParams();
    currentVendorId = queryParams.vendorId;

    if (currentVendorId) {
        await fetchVendorDetails(currentVendorId);
        await fetchAndDisplayVendorProducts(currentVendorId);
    } else {
        vendorNameDisplay.textContent = 'Error: Local no encontrado';
        productsGrid.innerHTML = '<p class="empty-state">No se especificó un local. Por favor, regresa y selecciona uno.</p>';
    }
});

async function fetchVendorDetails(vendorId) {
    try {
        const doc = await db.collection('users').doc(vendorId).get();
        if (doc.exists) {
            const vendorData = doc.data();
            vendorNameDisplay.textContent = vendorData.fullName || 'Local Desconocido';
            vendorLogo.src = vendorData.profilePicUrl || 'https://via.placeholder.com/40'; // Set logo source
        } else {
            vendorNameDisplay.textContent = 'Local Desconocido';
            vendorLogo.src = 'https://via.placeholder.com/40'; // Default logo
        }
    } catch (error) {
        console.error("Error fetching vendor details:", error);
        vendorNameDisplay.textContent = 'Error al cargar local';
        vendorLogo.src = 'https://via.placeholder.com/40'; // Default logo on error
    }
}

async function fetchAndDisplayVendorProducts(vendorId) {
    productsGrid.innerHTML = '<div class="spinner-container"><div class="spinner"></div></div>';
    try {
        // Assuming 'uidVendedor' in 'products' collection matches the vendor's UID
        const snapshot = await db.collection('products').where('uidVendedor', '==', vendorId).get();
        allVendorProducts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderProducts(allVendorProducts);
    } catch (error) {
        console.error("Error fetching vendor products:", error);
        productsGrid.innerHTML = '<p class="empty-state">Error al cargar productos de este local.</p>';
    }
}

function renderProducts(products) {
    productsGrid.innerHTML = '';
    if (products.length === 0) {
        productsGrid.innerHTML = '<p class="empty-state">Este local no tiene productos disponibles.</p>';
        return;
    }
    products.forEach(p => {
        productsGrid.innerHTML += createProductCard(p);
    });
}

function createProductCard(p) {
    const placeholderImg = 'https://via.placeholder.com/150'; // Default image if none
    return `
        <div class="product-card" data-id="${p.id}" data-vendor-id="${p.uidVendedor}">
            <div class="img-container"><img src="${p.imageUrl || placeholderImg}" alt="${p.name}" onerror="this.onerror=null;this.src='${placeholderImg}';"></div>
            <div class="info">
                <p class="name">${p.name}</p>
                <p class="price">S/ ${parseFloat(p.price || 0).toFixed(2)}</p>
            </div>
        </div>`;
}

searchInput.addEventListener('input', e => {
    const query = e.target.value.toLowerCase();
    const filteredProducts = allVendorProducts.filter(p => p.name.toLowerCase().includes(query));
    renderProducts(filteredProducts);
});

// Redirect to a specific product detail page (ver-producto-local.html)
productsGrid.addEventListener('click', (e) => {
    const card = e.target.closest('.product-card');
    if (card) {
        const productId = card.dataset.id;
        // currentVendorId is already available from the URL and stored globally
        
        // Store all products from this vendor in sessionStorage
        sessionStorage.setItem(`vendorProducts_${currentVendorId}`, JSON.stringify(allVendorProducts));

        window.location.href = `ver-producto-local.html?id=${productId}&vendorId=${currentVendorId}`;
    }
});
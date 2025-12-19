const firebaseConfig = { apiKey: "AIzaSyDHZzoPhzUPX-6BWaCx4J5xeXwSeOYmkMY", authDomain: "taxinet-929d8.firebaseapp.com", projectId: "taxinet-929d8", storageBucket: "taxinet-929d8.appspot.com", messagingSenderId: "52566606294", appId: "1:52566606294:web:6a2b4f1e7c964502c46477" };
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

const getEl = (id) => document.getElementById(id);
const productDetailContainer = getEl('product-detail');
const moreProductsGrid = getEl('more-products-grid');
const backButton = getEl('back-button');
const spinner = '<div class="spinner-container"><div class="spinner"></div></div>';

let currentVendorId = null;
let currentProduct = null;
let currentUser = null;
let allVendorProductsFromSession = []; // New global variable for products from sessionStorage

document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('id');
    currentVendorId = urlParams.get('vendorId');

    // Retrieve allVendorProducts from sessionStorage
    const sessionData = sessionStorage.getItem(`vendorProducts_${currentVendorId}`);
    if (sessionData) {
        allVendorProductsFromSession = JSON.parse(sessionData);
    }

    auth.onAuthStateChanged(user => {
        if (user) {
            currentUser = user;
            if (productId && currentVendorId) {
                loadProductDetails(productId, currentVendorId);
            } else {
                productDetailContainer.innerHTML = '<p class="empty-state">Producto no especificado.</p>';
                moreProductsGrid.innerHTML = '';
            }
        } else {
            window.location.href = 'app.html';
        }
    });
    
    if (currentVendorId) {
        backButton.href = `productos_local.html?vendorId=${currentVendorId}`;
    } else {
        backButton.href = 'home.html';
    }
});

async function loadProductDetails(productId, vendorId) {
    productDetailContainer.innerHTML = spinner;
    moreProductsGrid.innerHTML = spinner;
    try {
        // Try to find the product in sessionStorage first
        let product = allVendorProductsFromSession.find(p => p.id === productId);

        if (product) { // If found in session, use it
            currentProduct = product;
            renderProductDetail(currentProduct);
            // Now render "More Products" from session data
            const otherProducts = allVendorProductsFromSession.filter(p => p.id !== productId);
            renderMoreProducts(otherProducts);
        } else { // If not found in session (e.g., direct access), fetch from Firestore
            const productDoc = await db.collection('products').doc(productId).get();
            if (productDoc.exists) {
                currentProduct = { id: productDoc.id, ...productDoc.data() };
                renderProductDetail(currentProduct);
                // Fallback: If not in session, fetch all products for this vendor from DB
                await fetchMoreProductsFromVendor(currentProduct.id, vendorId);
            } else {
                productDetailContainer.innerHTML = '<p class="empty-state">Producto no encontrado.</p>';
                moreProductsGrid.innerHTML = '';
            }
        }
    } catch (error) {
        console.error("Error loading product details:", error);
        productDetailContainer.innerHTML = '<p class="empty-state">Error al cargar el producto.</p>';
        moreProductsGrid.innerHTML = '';
    }
}

function renderProductDetail(product) {
    productDetailContainer.innerHTML = `
        <img src="${product.imageUrl || 'https://via.placeholder.com/400'}" alt="${product.name}" class="product-detail-img">
        <h2 class="product-detail-name">${product.name}</h2>
        <p class="product-detail-price">S/ ${product.price ? parseFloat(product.price).toFixed(2) : '0.00'}</p>
        <p class="product-detail-description">${product.descripcion || 'No hay descripción disponible.'}</p>
        <button id="add-to-cart-button" class="action-button">Agregar al Carrito</button>
        <button id="buy-now-button" class="action-button">Comprar Ahora</button>
    `;
    // Attach event listeners after the HTML is rendered
    const addToCartBtn = getEl('add-to-cart-button');
    const buyNowBtn = getEl('buy-now-button');

    if (addToCartBtn) {
        addToCartBtn.addEventListener('click', async () => {
            if (!currentProduct || !currentUser) {
                alert('Debe iniciar sesión para agregar productos al carrito.');
                return;
            }
            
            const cartRef = db.collection('carritos').doc(currentUser.uid);
            await db.runTransaction(async (transaction) => {
                const cartDoc = await transaction.get(cartRef);
                if (!cartDoc.exists) {
                    transaction.set(cartRef, { products: [{...currentProduct, quantity: 1}] });
                } else {
                    const products = cartDoc.data().products || [];
                    const existingProductIndex = products.findIndex(p => p.id === currentProduct.id);
                    if (existingProductIndex > -1) {
                        products[existingProductIndex].quantity += 1;
                    } else {
                        products.push({...currentProduct, quantity: 1});
                    }
                    transaction.update(cartRef, { products: products });
                }
            });
            alert('Producto agregado al carrito');
        });
    }

    if (buyNowBtn) {
        buyNowBtn.addEventListener('click', async () => {
            if (!currentProduct || !currentUser) {
                alert('Debe iniciar sesión para comprar productos.');
                return;
            }
            const cartRef = db.collection('carritos').doc(currentUser.uid);
            await cartRef.set({ products: [{...currentProduct, quantity: 1}] });
            window.location.href = 'cart.html';
        });
    }
}

// Renamed from fetchMoreProductsFromVendor. This now serves as a fallback if session data is missing.
async function fetchMoreProductsFromVendor(currentProductId, vendorId) {
    try {
        const snapshot = await db.collection('products')
                                         .where('vendorUID', '==', vendorId)
                                         .get();
        let moreProducts = snapshot.docs
                                            .map(doc => ({ id: doc.id, ...doc.data() }))
                                            .filter(p => p.id !== currentProductId);
        
        renderMoreProducts(moreProducts); // Call the unified render function
    } catch (error) {
        console.error("Error fetching more products from vendor:", error);
        moreProductsGrid.innerHTML = '<p class="empty-state">Error al cargar más productos de este local.</p>';
    }
}

// Renamed and adapted from renderMoreProductsFromVendor to renderMoreProducts
function renderMoreProducts(products) {
    moreProductsGrid.innerHTML = ''; // Clear previous content
    if (products.length === 0) {
        moreProductsGrid.innerHTML = '<p class="empty-state">No hay más productos de este local.</p>';
        return;
    }
    products.forEach(p => {
        moreProductsGrid.innerHTML += createProductCardForGrid(p);
    });
}

// Adapted from createProductCard in productos.html for use in the grid
function createProductCardForGrid(p) {
    const placeholderImg = 'https://via.placeholder.com/150'; // Default image if none
    return `
        <a href="ver-producto-local.html?id=${p.id}&vendorId=${currentVendorId}" class="product-card">
            <div class="img-container"><img src="${p.imageUrl || placeholderImg}" alt="${p.name}" onerror="this.onerror=null;this.src='${placeholderImg}';"></div>
            <div class="info">
                <p class="name">${p.name}</p>
                <p class="price">S/ ${p.price ? parseFloat(p.price).toFixed(2) : '0.00'}</p>
            </div>
        </a>`;
}
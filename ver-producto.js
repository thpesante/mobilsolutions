const firebaseConfig = { apiKey: "AIzaSyDHZzoPhzUPX-6BWaCx4J5xeXwSeOYmkMY", authDomain: "taxinet-929d8.firebaseapp.com", projectId: "taxinet-929d8", storageBucket: "taxinet-929d8.appspot.com", messagingSenderId: "52566606294", appId: "1:52566606294:web:6a2b4f1e7c964502c46477" };
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

const loader = document.getElementById('loader');
const productContent = document.getElementById('product-content');
const errorState = document.getElementById('error-state');

let currentProduct = null;
let currentUser = null;

auth.onAuthStateChanged(user => {
    if (user) {
        currentUser = user;
        loadProduct();
    } else {
        window.location.href = '/';
    }
});

async function loadProduct() {
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('id');

    if (!productId) {
        showError();
        return;
    }

    try {
        const productRef = db.collection('products').doc(productId);
        const doc = await productRef.get();

        if (doc.exists) {
            currentProduct = { id: doc.id, ...doc.data() };
            displayProduct(currentProduct);
            showContent();
            loadSimilarProducts(currentProduct.category, currentProduct.id);
        } else {
            showError();
        }
    } catch (error) {
        console.error("Error al cargar producto:", error);
        showError();
    }
}

function displayProduct(product) {
    document.getElementById('product-image').src = product.imageUrl || 'https://via.placeholder.com/300';
    document.getElementById('product-seller').textContent = `Vendido por: ${product.createdBy || 'Vendedor Anónimo'}`;
    document.getElementById('product-title').textContent = product.name;
    document.getElementById('product-description').textContent = product.descripcion;
    
    const priceSection = document.getElementById('price-section');
    if (product.isOffer && product.offerPrice) {
        priceSection.innerHTML = `
            <span class="price-final">S/ ${product.offerPrice.toFixed(2)}</span>
            <span class="price-original">S/ ${product.price.toFixed(2)}</span>
        `;
    } else {
        priceSection.innerHTML = `<span class="price-final">S/ ${product.price.toFixed(2)}</span>`;
    }
}

async function loadSimilarProducts(category, currentId) {
    if (!category) return;
    const section = document.getElementById('similar-products-section');
    const container = document.getElementById('similar-products-scroll');
    
    try {
        const snapshot = await db.collection("products")
            .where("category", "==", category)
            .limit(10)
            .get();

        const similarProducts = snapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .filter(p => p.id !== currentId);
        
        if (similarProducts.length > 0) {
            section.classList.remove('hidden');
            container.innerHTML = similarProducts.map(p => `
                <a href="ver-producto.html?id=${p.id}" class="product-card">
                    <img src="${p.imageUrl || 'https://via.placeholder.com/150'}" alt="${p.name}">
                    <div class="info">
                        <p class="name">${p.name}</p>
                        <p class="price">S/ ${p.price.toFixed(2)}</p>
                    </div>
                </a>
            `).join('');
        }
    } catch (error) {
        console.error("Error cargando productos similares:", error);
    }
}

// Action Buttons
document.getElementById('add-to-cart-btn').addEventListener('click', async () => {
    if (!currentProduct || !currentUser) return;
    
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

document.getElementById('buy-now-btn').addEventListener('click', async () => {
     if (!currentProduct || !currentUser) return;
     const cartRef = db.collection('carritos').doc(currentUser.uid);
     await cartRef.set({ products: [{...currentProduct, quantity: 1}] });
     window.location.href = 'cart.html';
});

function showContent() {
    loader.classList.add('hidden');
    productContent.classList.remove('hidden');
}

function showError() {
    loader.classList.add('hidden');
    errorState.classList.remove('hidden');
}

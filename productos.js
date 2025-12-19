
const firebaseConfig = { apiKey: "AIzaSyDHZzoPhzUPX-6BWaCx4J5xeXwSeOYmkMY", authDomain: "taxinet-929d8.firebaseapp.com", projectId: "taxinet-929d8", storageBucket: "taxinet-929d8.appspot.com", messagingSenderId: "52566606294", appId: "1:52566606294:web:6a2b4f1e7c964502c46477" };
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

let allProducts = [];
let currentUser = null;
let parsedProducts = [];

// DOM Elements
const productsGrid = document.getElementById('products-grid');
const searchInput = document.getElementById('search-input');
const productModal = document.getElementById('product-modal');
const productForm = document.getElementById('product-form');
const importModal = document.getElementById('import-modal');
const userPhoto = document.getElementById('user-photo');
const fullName = document.getElementById('full-name');

// --- AUTHENTICATION ---
auth.onAuthStateChanged(async user => {
    if (user) {
        currentUser = user;

        try {
            const userDoc = await db.collection('users').doc(user.uid).get();
            
            if (userDoc.exists) {
                const userData = userDoc.data();
                
                // Update profile picture
                if (userPhoto) {
                    userPhoto.src = userData.profilePicUrl || user.photoURL || 'https://via.placeholder.com/40';
                }
                
                // Update user name
                if (fullName) {
                    fullName.textContent = userData.fullName || user.displayName || user.email;
                }
            } else {
                // Fallback for when user document doesn't exist
                if (userPhoto) {
                    userPhoto.src = user.photoURL || 'https://via.placeholder.com/40';
                }
                if (fullName) {
                    fullName.textContent = user.displayName || user.email;
                }
            }
        } catch (error) {
            console.error("Error fetching user data:", error);
            // Fallback on error
            if (userPhoto) {
                userPhoto.src = user.photoURL || 'https://via.placeholder.com/40';
            }
            if (fullName) {
                fullName.textContent = user.displayName || user.email;
            }
        }
        
        fetchAndDisplayProducts();

    } else {
        window.location.href = 'index.html';
    }
});

// --- CRUD & DISPLAY ---
async function fetchAndDisplayProducts() {
    if (!currentUser) return;
    productsGrid.innerHTML = '<p>Cargando tus productos...</p>';
    try {
        const snapshot = await db.collection('products').where('uidVendedor', '==', currentUser.uid).get();
        allProducts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        displayProducts(allProducts);
    } catch (error) {
        console.error("Error fetching products:", error);
        productsGrid.innerHTML = `<p style="color:red;">Error al cargar productos.</p>`;
    }
}

function displayProducts(products) {
    productsGrid.innerHTML = '';
    if (products.length === 0) {
        productsGrid.innerHTML = '<p>No tienes productos. ¡Añade uno o importa un Excel!</p>';
        return;
    }
    products.forEach(product => {
        const card = document.createElement('div');
        card.className = 'product-card';
        const isAvailable = product.disponible !== false;
        if (!isAvailable) {
            card.classList.add('disabled');
        }

        const placeholderImg = 'https://via.placeholder.com/220x180.png?text=Sin+Imagen';
        card.innerHTML = `
            <div class="availability-toggle">
                <label class="switch">
                    <input type="checkbox" class="availability-checkbox" data-id="${product.id}" ${isAvailable ? 'checked' : ''}>
                    <span class="slider round"></span>
                </label>
            </div>
            <img src="${product.imageUrl || placeholderImg}" alt="${product.name}" onerror="this.onerror=null;this.src='${placeholderImg}';">
            <div class="product-card-info">
                <h3>${product.name}</h3>
                <p class="price">S/ ${parseFloat(product.price || 0).toFixed(2)}</p>
            </div>
            <div class="product-card-actions">
                <button class="edit-btn" data-id="${product.id}" title="Editar"><i class="fas fa-edit"></i></button>
                <button class="delete-btn" data-id="${product.id}" title="Eliminar"><i class="fas fa-trash-alt"></i></button>
            </div>`;
        productsGrid.appendChild(card);
    });
}

// --- SINGLE PRODUCT MODAL (ADD/EDIT) ---
function openProductModal(product = null) {
    productForm.reset();
    const modalTitle = document.getElementById('product-modal-title');
    const productIdInput = document.getElementById('product-id');
    if (product) {
        modalTitle.textContent = 'Editar Producto';
        productIdInput.value = product.id;
        document.getElementById('product-name').value = product.name || '';
        document.getElementById('product-price').value = product.price || '';
        document.getElementById('product-category').value = product.category || '';
        document.getElementById('product-description').value = product.descripcion || '';
        document.getElementById('product-image-url').value = product.imageUrl || '';
    } else {
        modalTitle.textContent = 'Añadir Producto';
        productIdInput.value = '';
    }
    productModal.style.display = 'flex';
}

function closeProductModal() {
    productModal.style.display = 'none';
}

async function saveProduct(e) {
    e.preventDefault();
    if (!currentUser) return alert('Autenticación requerida.');

    const saveButton = document.getElementById('save-product-btn');
    saveButton.disabled = true;
    saveButton.textContent = 'Guardando...';

    const productId = document.getElementById('product-id').value;
    const imageFile = document.getElementById('product-image-file').files[0];
    let imageUrl = document.getElementById('product-image-url').value;

    try {
        if (imageFile) {
            const resizedImageBlob = await resizeImage(imageFile, 800, 800, 0.8);
            const imageRef = storage.ref(`product_images/${currentUser.uid}/${Date.now()}_${imageFile.name}`);
            const uploadTask = await imageRef.put(resizedImageBlob);
            imageUrl = await uploadTask.ref.getDownloadURL();
        }

        const productData = {
            name: document.getElementById('product-name').value,
            price: parseFloat(document.getElementById('product-price').value),
            category: document.getElementById('product-category').value,
            descripcion: document.getElementById('product-description').value,
            imageUrl: imageUrl,
            uidVendedor: currentUser.uid,
        };

        if (productId) {
            await db.collection('products').doc(productId).update(productData);
            alert('¡Producto actualizado!');
        } else {
            productData.disponible = true; // Default to available
            await db.collection('products').add(productData);
            alert('¡Producto añadido!');
        }
        closeProductModal();
        fetchAndDisplayProducts();

    } catch (error) {
        console.error("Error saving product:", error);
        alert(`Error al guardar: ${error.message}`);
    } finally {
        saveButton.disabled = false;
        saveButton.textContent = 'Guardar';
    }
}

async function deleteProduct(productId) {
    if (!confirm('¿Seguro que quieres eliminar este producto?')) return;
    try {
        await db.collection('products').doc(productId).delete();
        alert('Producto eliminado.');
        fetchAndDisplayProducts();
    } catch (error) {
        console.error("Error deleting product:", error);
        alert(`Error al eliminar: ${error.message}`);
    }
}

async function toggleAvailability(productId, isAvailable, checkboxElement) {
    const productCard = checkboxElement.closest('.product-card');

    try {
        // 1. Update Firestore
        await db.collection('products').doc(productId).update({ disponible: isAvailable });

        // 2. Update local state
        const productIndex = allProducts.findIndex(p => p.id === productId);
        if (productIndex > -1) {
            allProducts[productIndex].disponible = isAvailable;
        }

        // 3. Update UI
        if (isAvailable) {
            productCard.classList.remove('disabled');
        } else {
            productCard.classList.add('disabled');
        }

        // 4. Visual Feedback
        productCard.style.transition = 'box-shadow 0.2s ease-in-out';
        productCard.style.boxShadow = '0 0 0 2px #28a745'; // Green glow
        setTimeout(() => {
            productCard.style.boxShadow = ''; // Reset shadow
        }, 400);

    } catch (error) {
        console.error("Error updating availability:", error);
        alert(`Error al actualizar la disponibilidad: ${error.message}`);

        // 5. Revert UI on error
        checkboxElement.checked = !isAvailable; // Revert the checkbox
        if (isAvailable) { 
            productCard.classList.add('disabled');
        } else { 
            productCard.classList.remove('disabled');
        }
    }
}

// --- IMAGE RESIZING UTILITY ---
function resizeImage(file, maxWidth, maxHeight, quality) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > maxWidth) { height *= maxWidth / width; width = maxWidth; }
                } else {
                    if (height > maxHeight) { width *= maxHeight / height; height = maxHeight; }
                }
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                canvas.toBlob(resolve, 'image/jpeg', quality);
            };
            img.src = e.target.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// --- BULK IMPORT MODAL ---
function showImportView(viewNumber) {
    importModal.style.display = 'flex';
    [1, 2, 3].forEach(n => document.getElementById(`import-view-${n}`).style.display = (n === viewNumber) ? 'block' : 'none');
}

function closeImportModal() {
    importModal.style.display = 'none';
    parsedProducts = [];
    document.getElementById('excel-file').value = '';
}

function handleExcelUpload() {
    const fileInput = document.getElementById('excel-file');
    if (fileInput.files.length === 0) return alert('Por favor, selecciona un archivo.');
    showImportView(2);

    const reader = new FileReader();
    reader.onload = (e) => {
        setTimeout(() => { 
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, {type: 'array'});
                const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                parsedProducts = XLSX.utils.sheet_to_json(firstSheet);
                if (parsedProducts.length === 0) throw new Error('El archivo Excel está vacío.');
                displayPreview();
            } catch (error) {
                alert(`Error: ${error.message}`);
                showImportView(1);
            }
        }, 1000);
    };
    reader.readAsArrayBuffer(fileInput.files[0]);
}

function displayPreview() {
    const tableHead = document.querySelector('#preview-table thead');
    const tableBody = document.querySelector('#preview-table tbody');
    tableHead.innerHTML = '<tr><th>NOMBRE</th><th>DESCRIPCION</th><th>CATEGORIA</th><th>PRECIO</th><th>URL IMAGEN</th><th>Acción</th></tr>';
    tableBody.innerHTML = '';
    parsedProducts.forEach((product, index) => {
        const row = document.createElement('tr');
        row.dataset.rowIndex = index;
        row.innerHTML = `
            <td contenteditable="true" data-field="NOMBRE PRODUCTO">${product['NOMBRE PRODUCTO'] || ''}</td>
            <td contenteditable="true" data-field="DESCRIPCION">${product['DESCRIPCION'] || ''}</td>
            <td contenteditable="true" data-field="CATEGORIA">${product['CATEGORIA'] || ''}</td>
            <td contenteditable="true" data-field="PRECIO">${product['PRECIO'] || 0}</td>
            <td contenteditable="true" data-field="URL DE LA IMAGEN">${product['URL DE LA IMAGEN'] || ''}</td>
            <td><i class="fas fa-trash-alt delete-row-btn" title="Eliminar fila"></i></td>`;
        tableBody.appendChild(row);
    });
    showImportView(3);
}

async function finalUpload() {
    if (!currentUser) return alert('Autenticación requerida.');
    const productsToUpload = Array.from(document.querySelectorAll('#preview-table tbody tr')).map(row => ({
        'NOMBRE PRODUCTO': row.cells[0].textContent,
        'DESCRIPCION': row.cells[1].textContent,
        'CATEGORIA': row.cells[2].textContent,
        'PRECIO': row.cells[3].textContent,
        'URL DE LA IMAGEN': row.cells[4].textContent,
    }));

    if (productsToUpload.length === 0) return alert('No hay productos para importar.');
    showImportView(2);
    document.getElementById('import-feedback').textContent = `Importando ${productsToUpload.length} productos...`;

    try {
        const BATCH_SIZE = 499;
        for (let i = 0; i < productsToUpload.length; i += BATCH_SIZE) {
            const batch = db.batch();
            const chunk = productsToUpload.slice(i, i + BATCH_SIZE);
            chunk.forEach(p => {
                const newProdRef = db.collection('products').doc();
                batch.set(newProdRef, {
                    name: String(p['NOMBRE PRODUCTO'] || ''),
                    price: parseFloat(p['PRECIO'] || 0),
                    category: String(p['CATEGORIA'] || ''),
                    descripcion: String(p['DESCRIPCION'] || ''),
                    imageUrl: String(p['URL DE LA IMAGEN'] || ''),
                    uidVendedor: currentUser.uid,
                    disponible: true // Default to available
                });
            });
            await batch.commit();
        }
        alert('¡Éxito! Todos los productos han sido importados.');
        closeImportModal();
        fetchAndDisplayProducts();
    } catch (error) {
        alert(`Error en la importación final: ${error.message}`);
        showImportView(3);
    }
}

// --- GLOBAL EVENT LISTENERS ---
document.getElementById('add-product-btn').addEventListener('click', () => openProductModal());
document.getElementById('close-product-modal').addEventListener('click', closeProductModal);
productForm.addEventListener('submit', saveProduct);
document.getElementById('logout-btn').addEventListener('click', () => auth.signOut());
searchInput.addEventListener('input', e => {
    const searchTerm = e.target.value.toLowerCase();
    displayProducts(allProducts.filter(p => p.name.toLowerCase().includes(searchTerm)));
});

productsGrid.addEventListener('click', (e) => {
    // Check for availability toggle
    if (e.target.classList.contains('availability-checkbox')) {
        const checkbox = e.target;
        const productId = checkbox.dataset.id;
        const isChecked = checkbox.checked;
        toggleAvailability(productId, isChecked, checkbox);
        return; // Stop further processing
    }

    // Check for edit button
    const editBtn = e.target.closest('.edit-btn');
    if (editBtn) {
        const product = allProducts.find(p => p.id === editBtn.dataset.id);
        if (product) openProductModal(product);
        return;
    }

    // Check for delete button
    const deleteBtn = e.target.closest('.delete-btn');
    if (deleteBtn) {
        deleteProduct(deleteBtn.dataset.id);
        return;
    }
});

document.getElementById('import-btn').addEventListener('click', () => showImportView(1));
document.getElementById('close-import-modal').addEventListener('click', closeImportModal);
document.getElementById('upload-excel-btn').addEventListener('click', handleExcelUpload);
document.getElementById('cancel-import-btn').addEventListener('click', closeImportModal);
document.getElementById('confirm-import-btn').addEventListener('click', finalUpload);

document.getElementById('preview-table').addEventListener('click', (e) => {
    if (e.target.classList.contains('delete-row-btn')) {
        e.target.closest('tr').remove();
    }
});

function navigateTo(path) { window.location.href = path; }

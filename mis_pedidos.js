// Configuración de Firebase (asegúrate de que sea la misma que en home.html)
const firebaseConfig = { apiKey: "AIzaSyDHZzoPhzUPX-6BWaCx4J5xeXwSeOYmkMY", authDomain: "taxinet-929d8.firebaseapp.com", projectId: "taxinet-929d8", storageBucket: "taxinet-929d8.appspot.com", messagingSenderId: "52566606294", appId: "1:52566606294:web:6a2b4f1e7c964502c46477" };
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

let allOrders = []; // Almacena todos los pedidos del usuario
let displayedOrders = []; // Pedidos que se muestran después de filtros/búsqueda

const getEl = (id) => document.getElementById(id);

const loadingSpinner = getEl('loading-spinner');
const ordersListContainer = getEl('orders-list');
const emptyOrdersState = getEl('empty-orders');
const continueShoppingButton = getEl('continueShoppingButton');
const searchOrdersInput = getEl('searchOrdersInput');
const filterImageView = getEl('filterImageView');

const orderDetailModal = getEl('order-detail-modal');
const closeButton = orderDetailModal.querySelector('.close-button');
const modalOrderDate = getEl('modal-order-date');
const modalDeliveryMethod = getEl('modal-delivery-method');
const modalOrderStatus = getEl('modal-order-status');
const modalProductsContainer = getEl('modal-products-container');
const modalOrderTotal = getEl('modal-order-total');
// const modalQrCode = getEl('modal-qr-code'); // Ya no es un <img> directo

const filterDialogOverlay = getEl('filter-dialog-overlay');
const filterNewestBtn = getEl('filter-newest');
const filterOldestBtn = getEl('filter-oldest');
const filterDateRangeBtn = getEl('filter-date-range');
const dateRangeInputs = filterDialogOverlay.querySelector('.date-range-inputs');
const startDateInput = getEl('start-date');
const endDateInput = getEl('end-date');
const applyDateFilterBtn = getEl('apply-date-filter');
const filterClearBtn = getEl('filter-clear');


// --- Autenticación ---
auth.onAuthStateChanged(user => {
    if (user) {
        fetchOrders(user.uid);
    } else {
        window.location.href = 'index.html'; // Redirigir si no está logueado
    }
});

// --- Fetch Orders ---
async function fetchOrders(uid) {
    loadingSpinner.style.display = 'flex';
    ordersListContainer.innerHTML = '';
    emptyOrdersState.style.display = 'none';
    allOrders = [];

    try {
        const ordersSnapshot = await db.collection("pedidos")
                                        .where("compradorUID", "==", uid)
                                        .orderBy("date", "desc") // Ordenar por fecha por defecto (más nuevo primero)
                                        .get();

        if (ordersSnapshot.empty) {
            loadingSpinner.style.display = 'none';
            emptyOrdersState.style.display = 'block';
            // console.log("No se encontraron pedidos para el usuario:", uid); // Debug
            return;
        }

        const ordersPromises = ordersSnapshot.docs.map(async doc => {
            const orderData = doc.data();
            orderData.id = doc.id; // Añadir ID del documento
            // Asegurarse de que `products` sea una lista vacía si no existe
            orderData.products = orderData.products || []; 

            const productsRef = doc.ref.collection("productos");
            const productsSnapshot = await productsRef.get();
            // Map product data, providing default values if fields are missing
            orderData.products = productsSnapshot.docs.map(prodDoc => ({
                id: prodDoc.id,
                name: prodDoc.data().name || 'Nombre desconocido',
                quantity: prodDoc.data().quantity || 1,
                price: prodDoc.data().price || 0.00
            }));
            return orderData;
        });

        allOrders = await Promise.all(ordersPromises);
        console.log("Pedidos cargados:", allOrders); // VERIFICA ESTO EN LA CONSOLA DEL NAVEGADOR
        displayedOrders = [...allOrders]; // Inicialmente, todos los pedidos se muestran
        renderOrders(displayedOrders);

    } catch (error) {
        console.error("Error al obtener los pedidos:", error);
        ordersListContainer.innerHTML = '<p class="empty-state">Error al cargar tus pedidos. Inténtalo de nuevo más tarde.</p>';
        emptyOrdersState.style.display = 'none';
    } finally {
        loadingSpinner.style.display = 'none';
        if (allOrders.length === 0 && ordersListContainer.innerHTML === '') { // Solo si no se renderizó nada
            emptyOrdersState.style.display = 'block';
        } else if (allOrders.length > 0) {
            emptyOrdersState.style.display = 'none';
        }
    }
}

// --- Render Orders ---
function renderOrders(orders) {
    ordersListContainer.innerHTML = '';
    if (orders.length === 0) {
        emptyOrdersState.style.display = 'block';
        return;
    }
    emptyOrdersState.style.display = 'none';

    orders.forEach((order, index) => {
        // Validación robusta para order.date
        const orderDate = order.date && typeof order.date.seconds === 'number'
                         ? new Date(order.date.seconds * 1000).toLocaleString('es-ES')
                         : 'Fecha desconocida';
        const orderCard = document.createElement('div');
        orderCard.classList.add('order-card');
        orderCard.dataset.orderId = order.id; // Para identificar el pedido al hacer clic

        let statusColor = '#666';
        switch (order.status) {
            case 'Pendiente': statusColor = '#FFC107'; break; // Amarillo
            case 'Enviado': statusColor = '#007BFF'; break; // Azul
            case 'Entregado': statusColor = '#28A745'; break; // Verde
            case 'Cancelado': statusColor = '#DC3545'; break; // Rojo
            default: statusColor = 'var(--text-medium)'; // Por si hay un estado desconocido
        }

        orderCard.innerHTML = `
            <div class="order-card-header">
                <h3>Pedido #${index + 1}</h3>
                <span style="color: ${statusColor};">${order.status || 'Estado desconocido'}</span>
            </div>
            <div class="order-card-details">
                <p><strong>Fecha:</strong> ${orderDate}</p>
                <p><strong>Entrega:</strong> ${order.deliveryMethod || 'N/A'}</p>
                <p class="total"><strong>Total:</strong> S/ ${(order.total || 0).toFixed(2)}</p>
            </div>
        `;
        ordersListContainer.appendChild(orderCard);
    });
}

// --- Search/Filter Logic ---
searchOrdersInput.addEventListener('input', () => {
    filterOrders();
});

function filterOrders(startDate = null, endDate = null) {
    const query = searchOrdersInput.value.toLowerCase().trim();
    
    let filtered = allOrders.filter(order => {
        const matchStatus = (order.status || '').toLowerCase().includes(query);
        const matchMethod = (order.deliveryMethod || '').toLowerCase().includes(query);
        // Asegurarse de que order.products sea un array antes de usar .some
        const matchProduct = (order.products || []).some(p => (p.name || '').toLowerCase().includes(query));
        return matchStatus || matchMethod || matchProduct;
    });

    if (startDate && endDate) {
        filtered = filtered.filter(order => {
            if (!order.date || typeof order.date.seconds !== 'number') return false;
            const orderTimestamp = new Date(order.date.seconds * 1000);
            // Ajustar para que las fechas de inicio y fin incluyan todo el día
            const startOfDay = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate(), 0, 0, 0);
            const endOfDay = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate(), 23, 59, 59);
            return orderTimestamp >= startOfDay && orderTimestamp <= endOfDay;
        });
    }

    displayedOrders = filtered;
    renderOrders(displayedOrders);
}

// --- Sorting ---
function sortOrders(criterion) {
    switch (criterion) {
        case 'newest':
            displayedOrders.sort((a, b) => (b.date?.seconds || 0) - (a.date?.seconds || 0));
            break;
        case 'oldest':
            displayedOrders.sort((a, b) => (a.date?.seconds || 0) - (b.date?.seconds || 0));
            break;
    }
    renderOrders(displayedOrders);
    // Cierra el dialog de filtro después de aplicar
    filterDialogOverlay.style.display = 'none';
}

// --- Filter Dialog ---
filterImageView.addEventListener('click', () => {
    filterDialogOverlay.style.display = 'flex';
});

filterDialogOverlay.addEventListener('click', (e) => {
    if (e.target === filterDialogOverlay) { // Cierra si se hace clic fuera del dialog
        filterDialogOverlay.style.display = 'none';
        dateRangeInputs.style.display = 'none'; // Asegura que los inputs de fecha se oculten
    }
});

filterNewestBtn.addEventListener('click', () => { sortOrders('newest'); });
filterOldestBtn.addEventListener('click', () => { sortOrders('oldest'); });
filterClearBtn.addEventListener('click', () => {
    displayedOrders = [...allOrders]; // Restaurar todos los pedidos
    searchOrdersInput.value = ''; // Limpiar búsqueda
    renderOrders(displayedOrders);
    filterDialogOverlay.style.display = 'none';
    dateRangeInputs.style.display = 'none';
    startDateInput.value = '';
    endDateInput.value = '';
});

filterDateRangeBtn.addEventListener('click', () => {
    const isVisible = dateRangeInputs.style.display === 'flex';
    dateRangeInputs.style.display = isVisible ? 'none' : 'flex';
});

applyDateFilterBtn.addEventListener('click', () => {
    const startDate = startDateInput.value ? new Date(startDateInput.value + 'T00:00:00') : null;
    const endDate = endDateInput.value ? new Date(endDateInput.value + 'T23:59:59') : null;

    if (startDate && endDate && startDate > endDate) {
        alert('La fecha de inicio no puede ser posterior a la fecha de fin.');
        return;
    }
    
    filterOrders(startDate, endDate); // Aplicar el filtro de fecha junto con la búsqueda actual
    filterDialogOverlay.style.display = 'none';
    dateRangeInputs.style.display = 'none';
});


// --- Order Detail Modal ---
ordersListContainer.addEventListener('click', (e) => {
    const orderCard = e.target.closest('.order-card');
    if (orderCard) {
        const orderId = orderCard.dataset.orderId;
        const selectedOrder = allOrders.find(order => order.id === orderId);
        if (selectedOrder) {
            showOrderDetailModal(selectedOrder);
        }
    }
});

closeButton.addEventListener('click', () => {
    orderDetailModal.style.display = 'none';
});

window.addEventListener('click', (e) => {
    if (e.target === orderDetailModal) {
        orderDetailModal.style.display = 'none';
    }
});

function showOrderDetailModal(order) {
    modalOrderDate.textContent = order.date && typeof order.date.seconds === 'number'
                                        ? new Date(order.date.seconds * 1000).toLocaleString('es-ES')
                                        : 'N/A';
    modalDeliveryMethod.textContent = order.deliveryMethod || 'N/A';
    modalOrderStatus.textContent = order.status || 'N/A';
    modalOrderStatus.style.color = (function() {
        switch (order.status) {
            case 'Pendiente': return '#FFC107';
            case 'Enviado': return '#007BFF';
            case 'Entregado': return '#28A745';
            case 'Cancelado': return '#DC3545';
            default: return 'var(--text-dark)'; // Corregido: usar comillas y variable CSS
        }
    })();

    modalProductsContainer.innerHTML = '';
    // Asegurarse de que order.products sea un array antes de iterar
    (order.products || []).forEach(product => {
        const productItem = document.createElement('div');
        productItem.classList.add('modal-product-item');
        productItem.innerHTML = `
            <span>${product.name || 'Producto desconocido'} (x${product.quantity || 1})</span>
            <span>S/ ${((product.price || 0) * (product.quantity || 1)).toFixed(2)}</span>
        `;
        modalProductsContainer.appendChild(productItem);
    });

    modalOrderTotal.textContent = (order.total || 0).toFixed(2);

    // Generar QR Code
    const qrContent = `Pedido ID: ${order.id}\nTotal: ${order.total || 0}\nEstado: ${order.status || 'N/A'}`;
    
    // Limpiar el contenedor del QR antes de generar uno nuevo
    const qrCodeContainerDiv = document.querySelector('.qr-code-container');
    qrCodeContainerDiv.innerHTML = ''; // Importante para limpiar el QR anterior

    new QRCode(qrCodeContainerDiv, {
        text: qrContent,
        width: 128,
        height: 128,
        colorDark : "#000000",
        colorLight : "#ffffff",
        correctLevel : QRCode.CorrectLevel.H
    });
    
    orderDetailModal.style.display = 'flex'; // Usar flex para centrar
}

// --- Continue Shopping Button ---
continueShoppingButton.addEventListener('click', () => {
    window.location.href = 'index.html';
});

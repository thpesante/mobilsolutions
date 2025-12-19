function navigateTo(path) { window.location.href = path; }

const firebaseConfig = { apiKey: "AIzaSyDHZzoPhzUPX-6BWaCx4J5xeXwSeOYmkMY", authDomain: "taxinet-929d8.firebaseapp.com", projectId: "taxinet-929d8", storageBucket: "taxinet-929d8.appspot.com", messagingSenderId: "52566606294", appId: "1:52566606294:web:6a2b4f1e7c964502c46477" };
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

const userNameSpan = document.getElementById('user-name');
const userProfilePic = document.getElementById('user-profile-pic');
const pedidosContainer = document.getElementById('pedidos-container');
const logoutBtn = document.getElementById('logout-btn');

let primeraCarga = true;
let lastIds = new Set();

const orderStates = [ 'Pendiente', 'Confirmado', 'En preparación', 'Listo para enviar', 'En camino', 'Cerca de destino', 'Entregado', 'Completado' ];

logoutBtn.addEventListener('click', () => auth.signOut().then(() => window.location.href = 'app.html'));

auth.onAuthStateChanged(async (user) => {
    if (user) {
        const userDoc = await db.collection("users").doc(user.uid).get();
        if (userDoc.exists) {
            const userData = userDoc.data();
            const vendedorNombre = userData.fullName;
            
            if (userNameSpan) {
                userNameSpan.textContent = vendedorNombre;
            }
            if (userProfilePic && userData.profilePicUrl) {
                userProfilePic.src = userData.profilePicUrl;
            }

            pedidosContainer.innerHTML = '<p>Cargando tus pedidos en tiempo real...</p>';
            escucharPedidosTiempoReal(vendedorNombre);
        } else {
            console.error("Error: No se encontró el perfil del vendedor logueado.");
            pedidosContainer.innerHTML = '<p style="color: red;">Error: No se pudo encontrar tu perfil de vendedor.</p>';
        }
    } else {
        window.location.href = 'app.html';
    }
});

function escucharPedidosTiempoReal(vendedorNombre) {
    if (!vendedorNombre) {
        pedidosContainer.innerHTML = '<p style="color: red;">No se pudo identificar al vendedor.</p>';
        return;
    }

    db.collection("pedidos")
      .where("vendedorNombre", "==", vendedorNombre)
      .orderBy("date", "desc")
      .onSnapshot(async (snapshot) => {
          const processingPromises = snapshot.docs.map(async (doc) => {
              const pedido = { id: doc.id, ...doc.data() };

              if (pedido.status === "Completado") {
                  return null;
              }

              if (pedido.compradorUID) {
                  const userDoc = await db.collection("users").doc(pedido.compradorUID).get();
                  pedido.compradorNombre = userDoc.exists ? userDoc.data().fullName : "Desconocido";
              } else {
                  pedido.compradorNombre = "Desconocido";
              }

              const productosSnap = await db.collection("pedidos").doc(doc.id).collection("productos").get();
              pedido.productos = productosSnap.docs.map(prodDoc => prodDoc.data());

              return pedido;
          });

          const pedidosConDatos = (await Promise.all(processingPromises)).filter(p => p !== null);
          
          const nuevosIds = new Set(pedidosConDatos.map(p => p.id));
          if (!primeraCarga) {
              const pedidosNuevos = [...nuevosIds].filter(id => !lastIds.has(id));
              if (pedidosNuevos.length > 0) {
                  showToast(`¡Tienes ${pedidosNuevos.length} pedido(s) nuevo(s)!`, 'success');
                  reproducirSonidoNuevoPedido();
              }
          }
          primeraCarga = false;
          lastIds = nuevosIds;

          displayPedidos(pedidosConDatos);

      }, (error) => {
          console.error("Error escuchando pedidos: ", error);
          pedidosContainer.innerHTML = `<p style="color: red;">Error al cargar los pedidos. Es posible que necesites crear un índice en Firestore. Revisa la consola (F12) para ver el enlace y crearlo.</p>`;
          showToast('Error al cargar pedidos. Revisa la consola.', 'error');
      });
}

function displayPedidos(pedidos) {
    if (!pedidos || pedidos.length === 0) {
        pedidosContainer.innerHTML = '<p>No tienes pedidos activos para mostrar.</p>';
        return;
    }
    pedidosContainer.innerHTML = '';
    pedidos.forEach(pedido => {
        const pedidoCard = document.createElement('div');
        pedidoCard.id = `pedido-${pedido.id}`;
        pedidoCard.className = 'pedido-card';
        const productosHtml = pedido.productos.map(p => `<p>${p.name} x${p.quantity} (S/ ${parseFloat(p.price || 0).toFixed(2)})</p>`).join('') || '<p>Sin productos.</p>';
        const statusOptions = orderStates.map(state => `<option value="${state}" ${pedido.status === state ? 'selected' : ''}>${state}</option>`).join('');
        const fecha = pedido.date ? new Date(pedido.date.seconds * 1000).toLocaleString('es-ES') : 'Fecha no disponible';
        
        pedidoCard.innerHTML = `
            <h3>Pedido de: ${pedido.compradorNombre}</h3>
            <p><strong>ID:</strong> ${pedido.id}</p>
            <p><strong>Fecha:</strong> ${fecha}</p>
            <p><strong>Entrega:</strong> ${pedido.deliveryMethod || 'No especificado'}</p>
            <div class="productos-list"><h4>Productos:</h4>${productosHtml}</div>
            <p class="total">Total: S/ ${parseFloat(pedido.total || 0).toFixed(2)}</p>
            <select class="status-selector" data-id="${pedido.id}">${statusOptions}</select>
        `;
        pedidosContainer.appendChild(pedidoCard);
    });
    document.querySelectorAll('.status-selector').forEach(selector => {
        selector.addEventListener('change', (e) => updateOrderStatus(e.target.dataset.id, e.target.value));
    });
}

async function updateOrderStatus(pedidoId, newStatus) {
    showToast(`Actualizando estado a "${newStatus}"...`, 'info');
    try {
        await db.collection('pedidos').doc(pedidoId).update({ status: newStatus });
        showToast(`Pedido actualizado a "${newStatus}".`, 'success');
    } catch (error) {
        console.error("Error al actualizar estado:", error);
        showToast(`Error al actualizar: ${error.message}`, 'error');
    }
}

function reproducirSonidoNuevoPedido() {
    try {
        const audio = new Audio('/templates/nuevo_pedido.mp3');
        audio.play();
    } catch (e) {
        console.warn("No se pudo reproducir el sonido de notificación: ", e);
    }
}

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.classList.add('show');
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => document.body.removeChild(toast), 300);
        }, 3000);
    }, 100);
}

const menuBtn = document.getElementById('menu-btn');
const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('sidebar-overlay');
menuBtn.addEventListener('click', () => {
    sidebar.classList.toggle('open');
    overlay.classList.toggle('open');
});
overlay.addEventListener('click', () => {
    sidebar.classList.remove('open');
    overlay.classList.remove('open');
});
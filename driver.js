document.addEventListener('DOMContentLoaded', () => {
    if ('Notification' in window && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
        Notification.requestPermission();
    }
});

const firebaseConfig = {
  apiKey: "AIzaSyDHZzoPhzUPX-6BWaCx4J5xeXwSeOYmkMY",
  authDomain: "taxinet-929d8.firebaseapp.com",
  projectId: "taxinet-929d8",
  storageBucket: "taxinet-929d8.firebasestorage.app",
  messagingSenderId: "52566606294",
  appId: "1:52566606294:web:18375fa72faf19b0c46477",
  measurementId: "G-0ZLWKZ09T5"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

let map, userMarker, directionsRenderer;
let storeMarker, customerMarker;
let currentSpeed = 0;
let currentTrip = null;
let unsubscribeRequests;
let directionsService;
let wakeLockSentinel = null; // Wake Lock Sentinel

// --- SCREEN WAKE LOCK FUNCTIONS ---
const acquireWakeLock = async () => {
    if ('wakeLock' in navigator) {
        try {
            wakeLockSentinel = await navigator.wakeLock.request('screen');
            console.log('Screen Wake Lock activado.');
        } catch (err) {
            console.error(`${err.name}, ${err.message}`);
        }
    }
};

const releaseWakeLock = async () => {
    if (wakeLockSentinel !== null) {
        await wakeLockSentinel.release();
        wakeLockSentinel = null;
        console.log('Screen Wake Lock liberado.');
    }
};


function speak(text) {
    if (!('speechSynthesis' in window) || !text) return;
    const cleanText = text.replace(/<[^>]*>/g, '');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'es-ES';
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
}

function initMap() {
    directionsService = new google.maps.DirectionsService();
    directionsRenderer = new google.maps.DirectionsRenderer({ suppressMarkers: true, preserveViewport: true });

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(position => {
            const userLocation = { lat: position.coords.latitude, lng: position.coords.longitude };
            map = new google.maps.Map(document.getElementById('map'), {
                center: userLocation,
                zoom: 18,
                disableDefaultUI: true
            });
            directionsRenderer.setMap(map);
            userMarker = new google.maps.Marker({
                position: userLocation, map: map, title: 'Tu ubicación',
                icon: { path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW, scale: 7, rotation: 0, fillColor: '#007bff', fillOpacity: 1, strokeWeight: 2, strokeColor: '#ffffff' }
            });
            trackLocation();
            auth.onAuthStateChanged(user => {
                if (user) {
                    resumeOngoingTrip(user.uid);
                    listenForRequests();
                } else {
                    window.location.href = 'index.html';
                }
            });
        }, () => alert('No se pudo obtener la ubicación.'));
    } else {
        alert('La geolocalización no es soportada por este navegador.');
    }
}

function getHaversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function showArrivalNotification() {
    if ('Notification' in window && Notification.permission === "granted") {
        new Notification("¡Estás llegando!", { body: "Estás a menos de 150 metros del destino.", icon: "https://maps.google.com/mapfiles/ms/icons/red-dot.png" });
    }
}

function trackLocation() {
    navigator.geolocation.watchPosition(position => {
        const newLocation = { lat: position.coords.latitude, lng: position.coords.longitude };
        if(userMarker) userMarker.setPosition(newLocation);
        
        const speedMps = position.coords.speed;
        document.getElementById('speed-text').textContent = speedMps !== null ? Math.round(speedMps * 3.6) : '0';

        if (position.coords.heading && userMarker) {
            userMarker.setIcon({ ...userMarker.getIcon(), rotation: position.coords.heading });
        }

        if (currentTrip) {
            map.setCenter(newLocation);
            if (currentTrip.directions) {
                const steps = currentTrip.directions.routes[0].legs[0].steps;
                if (currentTrip.currentStepIndex < steps.length) {
                    const nextStep = steps[currentTrip.currentStepIndex];
                    const distanceToNextStep = getHaversineDistance(newLocation.lat, newLocation.lng, nextStep.start_location.lat(), nextStep.start_location.lng());
                    if (distanceToNextStep < 0.03) {
                        speak(nextStep.instructions);
                        currentTrip.currentStepIndex++;
                    }
                }
            }
            if (currentTrip.clienteUbi && !currentTrip.arrivalAlertSent) {
                const distance = getHaversineDistance(newLocation.lat, newLocation.lng, currentTrip.clienteUbi.latitude, currentTrip.clienteUbi.longitude);
                if (distance <= 0.15) {
                    currentTrip.arrivalAlertSent = true; 
                    db.collection('pedidos').doc(currentTrip.id).update({ alertaLlegada: "true" });
                    showArrivalNotification();
                }
            }
        } else {
             if (map.getZoom() === 18) map.setCenter(newLocation);
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    const requestsBtn = document.getElementById('requests-btn');
    const statusBtn = document.getElementById('status-btn');
    const menuBtn = document.getElementById('menu-btn');
    const menuNav = document.getElementById('menu-nav');
    const modal = document.getElementById('requests-modal');
    const viewAssignedOrderBtn = document.getElementById('view-assigned-order-btn');
    const assignedOrderPanel = document.getElementById('assigned-order-panel');

    requestsBtn.addEventListener('click', () => modal.style.display = 'block');
    statusBtn.addEventListener('click', () => {
        statusBtn.classList.toggle('available');
        statusBtn.classList.toggle('unavailable');
        statusBtn.textContent = statusBtn.classList.contains('available') ? 'Disponible' : 'Ocupado';
    });
    menuBtn.addEventListener('click', () => menuNav.style.display = menuNav.style.display === 'block' ? 'none' : 'block');
    document.querySelector('#requests-modal .close-btn').addEventListener('click', () => modal.style.display = 'none');
    window.addEventListener('click', (event) => { if (event.target === modal) modal.style.display = 'none'; });
    document.getElementById('hide-details-btn').addEventListener('click', () => {
        assignedOrderPanel.classList.remove('show');
        viewAssignedOrderBtn.style.display = 'block';
    });
    viewAssignedOrderBtn.addEventListener('click', () => showAssignedOrderPanel());
    document.getElementById('complete-trip-btn').addEventListener('click', () => completeTrip());
    document.getElementById('logout-btn').addEventListener('click', () => {
        auth.signOut().then(() => window.location.href = 'index.html');
    });
    document.getElementById('requests-modal').addEventListener('click', (e) => {
        if (e.target.classList.contains('accept-btn')) acceptTrip(e.target.dataset.id);
    });
});

async function resumeOngoingTrip(driverUid) {
    const query = db.collection('pedidos').where('repartidor_uid', '==', driverUid).where('status', '==', 'En camino').limit(1);
    const snapshot = await query.get();
    if (!snapshot.empty) {
        await initializeTripState(snapshot.docs[0]);
    }
}

async function acceptTrip(tripId) {
    const user = auth.currentUser;
    if (!user) return alert("Inicia sesión para aceptar viajes.");

    const docRef = db.collection('pedidos').doc(tripId);

    try {
        await db.runTransaction(async (transaction) => {
            const tripDoc = await transaction.get(docRef);
            if (!tripDoc.exists) throw new Error("El viaje ya no existe.");
            if (tripDoc.data().repartidor_uid) throw new Error("Este pedido ya fue asignado");
            transaction.update(docRef, { status: 'En camino', repartidor_uid: user.uid });
        });
        
        document.getElementById('requests-modal').style.display = 'none';
        await initializeTripState(await docRef.get());

    } catch (error) {
        alert(error.message);
    }
}

async function initializeTripState(tripDoc) {
    if (unsubscribeRequests) { unsubscribeRequests(); unsubscribeRequests = null; }
    acquireWakeLock(); // Acquire screen lock
    currentTrip = { type: 'delivery', id: tripDoc.id, ...tripDoc.data(), arrivalAlertSent: tripDoc.data().alertaLlegada === "true" };
    const [userName, products] = await Promise.all([
        db.collection('users').doc(currentTrip.compradorUID).get().then(d => d.exists ? d.data().fullName : 'Usuario desconocido'),
        tripDoc.ref.collection('productos').get().then(snap => snap.docs.map(d => d.data()))
    ]);
    currentTrip.compradorName = userName;
    currentTrip.productos = products;
    showTripUI();
    setupTripOnMap();
}

function listenForRequests() {
    if (unsubscribeRequests || currentTrip) return;

    unsubscribeRequests = db.collection('pedidos').where('status', '==', 'Listo para enviar')
        .onSnapshot(handleDeliverySnapshot, console.error);
}

async function handleDeliverySnapshot(querySnapshot) {
    const list = document.getElementById('delivery-requests-list');
    if (!list) return;
    if (!querySnapshot.empty && !currentTrip) {
        const modal = document.getElementById('requests-modal');
        if (modal) modal.style.display = 'block';
    }

    list.innerHTML = '';
    for (const doc of querySnapshot.docs) {
        if (!doc.data().repartidor_uid) {
            const order = { id: doc.id, ...doc.data() };
            const userName = await db.collection('users').doc(order.compradorUID).get().then(d => d.exists ? d.data().fullName : 'Usuario desconocido');
            list.innerHTML += `<li><div><strong>Comprador:</strong> ${userName}<br><strong>Tienda:</strong> ${order.vendedorNombre || 'N/A'}<br><strong>Total:</strong> $${order.total.toFixed(2)}</div><button class="accept-btn" data-id="${order.id}">Aceptar</button></li>`;
        }
    }
}

function setupTripOnMap() {
    if (!currentTrip || !userMarker) return;
    const { vendedorUbi, clienteUbi, vendedorNombre, compradorName } = currentTrip;
    if (!vendedorUbi || !clienteUbi) return alert("El pedido no contiene la información de ubicación necesaria.");

    const storeLocation = new google.maps.LatLng(vendedorUbi.latitude, vendedorUbi.longitude);
    const customerLocation = new google.maps.LatLng(clienteUbi.latitude, clienteUbi.longitude);
    storeMarker = new google.maps.Marker({ position: storeLocation, map, title: `Recoger: ${vendedorNombre}`, icon: 'http://maps.google.com/mapfiles/ms/icons/green-dot.png' });
    customerMarker = new google.maps.Marker({ position: customerLocation, map, title: `Entregar: ${compradorName}`, icon: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png' });

    map.setCenter(userMarker.getPosition());
    map.setZoom(18);

    const request = { origin: userMarker.getPosition(), destination: customerLocation, waypoints: [{ location: storeLocation, stopover: true }], travelMode: 'DRIVING', optimizeWaypoints: true };
    directionsService.route(request, (result, status) => {
        if (status == 'OK') {
            directionsRenderer.setDirections(result);
            currentTrip.directions = result;
            currentTrip.currentStepIndex = 0;
            const firstStep = result.routes[0].legs[0].steps[0];
            if (firstStep) speak(firstStep.instructions);
        } else console.error('Directions request failed: ' + status);
    });
}

function showTripUI() {
    document.getElementById('main-buttons-container').style.display = 'none';
    document.getElementById('view-assigned-order-btn').style.display = 'block';
    document.getElementById('assigned-order-panel').classList.remove('show');
}

function hideTripUI() {
    releaseWakeLock(); // Release screen lock
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    document.getElementById('main-buttons-container').style.display = 'flex';
    document.getElementById('view-assigned-order-btn').style.display = 'none';
    if(directionsRenderer) directionsRenderer.setDirections({ routes: [] });
    if (storeMarker) storeMarker.setMap(null);
    if (customerMarker) customerMarker.setMap(null);
    currentTrip = null;
    listenForRequests();
}

function showAssignedOrderPanel() {
    if (!currentTrip) return;
    const referenceHtml = currentTrip.addressReference ? `<strong>Referencia:</strong> ${currentTrip.addressReference}<br>` : '';

    document.getElementById('assigned-order-details').innerHTML = `
        <strong>Cliente:</strong> ${currentTrip.compradorName}<br>
        <strong>Tienda:</strong> ${currentTrip.vendedorNombre}<br>
        <strong>Destino:</strong> ${currentTrip.deliveryAddress || 'Ver en mapa'}<br>
        ${referenceHtml}
        <strong style="font-size: 1.2em; color: var(--success-color);">VALOR A COBRAR: $${currentTrip.total.toFixed(2)}</strong>
        ${currentTrip.productos ? `<br><strong>Productos a retirar:</strong><ul style="margin-top: 5px; padding-left: 20px;">${currentTrip.productos.map(p => `<li>${p.name} x${p.quantity}</li>`).join('')}</ul>` : ''}`;
    
    document.getElementById('assigned-order-panel').classList.add('show');
    document.getElementById('view-assigned-order-btn').style.display = 'none';
}

async function completeTrip() {
    if (!currentTrip) return;
    await db.collection('pedidos').doc(currentTrip.id).update({ status: 'entregado' });
    hideTripUI();
}

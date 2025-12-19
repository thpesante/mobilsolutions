
// Configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDHZzoPhzUPX-6BWaCx4J5xeXwSeOYmkMY",
  authDomain: "taxinet-929d8.firebaseapp.com",
  projectId: "taxinet-929d8",
  storageBucket: "taxinet-929d8.appspot.com",
  messagingSenderId: "52566606294",
  appId: "1:52566606294:web:18375fa72faf19b0c46477",
  measurementId: "G-0ZLWKZ09T5"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

document.addEventListener('DOMContentLoaded', () => {
    const menuBtn = document.getElementById('menuBtn');
    const sideMenu = document.getElementById('sideMenu');
    const solicitarTaxiBtn = document.getElementById('solicitarTaxiBtn');
    const logoutBtn = document.getElementById('logoutBtn');

    // -- Lógica de Autenticación y datos de usuario --
    auth.onAuthStateChanged(user => {
        if (user) {
            // El usuario ha iniciado sesión. Cargar sus datos.
            loadUserData(user.uid);
        } else {
            // El usuario no ha iniciado sesión. Redirigir a la página de inicio.
            window.location.href = 'index.html';
        }
    });

    // Cargar datos del usuario desde Firestore
    function loadUserData(uid) {
        const userRef = db.collection("users").doc(uid);

        userRef.get().then(doc => {
            if (doc.exists) {
                const userData = doc.data();
                const fullName = userData.fullName || "Nombre no disponible";
                const profileImage = userData.profileImage;

                // Actualizar la UI
                document.getElementById('userName').textContent = fullName;
                if (profileImage) {
                    document.getElementById('userImage').src = profileImage;
                }
            } else {
                console.log("No se encontraron datos para el usuario.");
            }
        }).catch(error => {
            console.error("Error al cargar datos del usuario:", error);
        });
    }

    // -- Manejadores de eventos --

    // Abrir y cerrar el menú lateral
    menuBtn.addEventListener('click', () => {
        sideMenu.classList.toggle('open');
    });

    // Botón de cerrar sesión
    logoutBtn.addEventListener('click', (e) => {
        e.preventDefault(); // Evitar que el enlace navegue
        auth.signOut().then(() => {
            console.log("Usuario cerró sesión");
            // `onAuthStateChanged` se encargará de redirigir
        }).catch(error => {
            console.error("Error al cerrar sesión:", error);
        });
    });

    // Lógica para solicitar taxi (placeholder)
    solicitarTaxiBtn.addEventListener('click', () => {
        alert('Funcionalidad para solicitar taxi aún no implementada.');
    });
});


// -- Lógica del Mapa de Google --
let map;
let userMarker;

function initMap() {
    const mapOptions = {
        zoom: 5,
        center: { lat: -1.831239, lng: -78.183406 }, // Centro de Ecuador
        disableDefaultUI: true,
        zoomControl: true,
    };

    map = new google.maps.Map(document.getElementById('map'), mapOptions);

    if (navigator.geolocation) {
        navigator.geolocation.watchPosition(
            (position) => {
                const userLocation = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                };

                if (userMarker) {
                    userMarker.setPosition(userLocation);
                } else {
                    map.setCenter(userLocation);
                    map.setZoom(16);
                    userMarker = new google.maps.Marker({
                        position: userLocation,
                        map: map,
                        title: "Tu Ubicación",
                        /* icon: {
                            url: 'images/cliente_puntero.png',
                            scaledSize: new google.maps.Size(50, 50),
                        }, */
                    });
                }
            },
            () => {
                handleLocationError('El servicio de geolocalización falló.');
            }
        );
    } else {
        handleLocationError('Tu navegador no soporta geolocalización.');
    }
}

function handleLocationError(errorMessage) {
    console.error(errorMessage);
    alert(errorMessage);
}

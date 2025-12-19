const firebaseConfig = { 
    apiKey: "AIzaSyDHZzoPhzUPX-6BWaCx4J5xeXwSeOYmkMY", 
    authDomain: "taxinet-929d8.firebaseapp.com", 
    projectId: "taxinet-929d8", 
    storageBucket: "taxinet-929d8.appspot.com", 
    messagingSenderId: "52566606294", 
    appId: "1:52566606294:web:6a2b4f1e7c964502c46477" 
};
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

const loginBtnNav = document.getElementById('login-btn-nav');
const loginModal = document.getElementById('login-modal');
const closeBtn = document.getElementsByClassName('close-btn')[0];
const loginForm = document.getElementById('login-form');
const errorMessage = document.getElementById('error-message');

loginBtnNav.addEventListener('click', () => {
    loginModal.style.display = 'block';
});

closeBtn.addEventListener('click', () => {
    loginModal.style.display = 'none';
});

window.addEventListener('click', (event) => {
    if (event.target == loginModal) {
        loginModal.style.display = 'none';
    }
});

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorMessage.style.display = 'none';
    errorMessage.textContent = '';
    try {
        const email = document.getElementById('email').value;
        const pass = document.getElementById('password').value;
        await auth.signInWithEmailAndPassword(email, pass);
    } catch (error) {
        errorMessage.textContent = 'Usuario o contraseña incorrectos.';
        errorMessage.style.display = 'block';
    }
});

auth.onAuthStateChanged(async (user) => {
    if (user) {
        try {
            const doc = await db.collection("users").doc(user.uid).get();
            if (doc.exists) {
                const role = doc.data().role;
                if (role === 'Cliente') {
                    window.location.href = 'cliente.html';
                } else if (role === 'Driver') {
                    window.location.href = 'driver.html';
                } else {
                    alert('Rol de usuario no válido');
                    await auth.signOut();
                }
            } else {
                alert('No se encontró el perfil de usuario.');
                await auth.signOut();
            }
        } catch (error) {
            console.error("Error al obtener datos del usuario:", error);
            await auth.signOut();
        }
    } 
});

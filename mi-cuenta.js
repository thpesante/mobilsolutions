const firebaseConfig = { apiKey: "AIzaSyDHZzoPhzUPX-6BWaCx4J5xeXwSeOYmkMY", authDomain: "taxinet-929d8.firebaseapp.com", projectId: "taxinet-929d8", storageBucket: "taxinet-929d8.appspot.com", messagingSenderId: "52566606294", appId: "1:52566606294:web:6a2b4f1e7c964502c46477" };
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

let currentUser = null, imageFile = null, oldProfilePicUrl = null;

const loader = document.getElementById('loader');
const accountContent = document.getElementById('account-content');
const profileImage = document.getElementById('profile-image');
const profilePicInput = document.getElementById('profile-pic-input');
const fullNameInput = document.getElementById('full-name');
const phoneInput = document.getElementById('phone');
const addressInput = document.getElementById('address');
const saveProfileBtn = document.getElementById('save-profile-btn');
const logoutBtn = document.getElementById('logout-btn');

auth.onAuthStateChanged(user => {
    if (user) { currentUser = user; loadUserData(); } 
    else { window.location.href = 'app.html'; }
});

async function loadUserData() {
    loader.style.display = 'block';
    accountContent.style.display = 'none';
    try {
        const userDoc = await db.collection('users').doc(currentUser.uid).get();
        if (userDoc.exists) {
            const data = userDoc.data();
            fullNameInput.value = data.fullName || '';
            phoneInput.value = data.phone || '';
            addressInput.value = data.address || '';
            if (data.profilePicUrl) {
                profileImage.src = data.profilePicUrl;
                oldProfilePicUrl = data.profilePicUrl;
            }
        }
    } catch (error) {
        console.error("Error al cargar datos del usuario: ", error);
        alert("No se pudieron cargar tus datos.");
    } finally {
        loader.style.display = 'none';
        accountContent.style.display = 'block';
    }
}

profileImage.addEventListener('click', () => profilePicInput.click());
profilePicInput.addEventListener('change', e => {
    if (e.target.files && e.target.files[0]) {
        imageFile = e.target.files[0];
        const reader = new FileReader();
        reader.onload = event => profileImage.src = event.target.result;
        reader.readAsDataURL(imageFile);
    }
});

saveProfileBtn.addEventListener('click', async () => {
    saveProfileBtn.disabled = true;
    saveProfileBtn.textContent = 'Guardando...';
    try {
        let newProfilePicUrl = oldProfilePicUrl;
        if (imageFile) {
            if (oldProfilePicUrl) {
                try {
                    await storage.refFromURL(oldProfilePicUrl).delete();
                } catch (deleteError) {
                    console.warn("No se pudo eliminar la imagen anterior: ", deleteError);
                }
            }
            const newImageRef = storage.ref(`profile_pics/${currentUser.uid}/${imageFile.name}`);
            const uploadTask = await newImageRef.put(imageFile);
            newProfilePicUrl = await uploadTask.ref.getDownloadURL();
        }
        const userData = { fullName: fullNameInput.value, phone: phoneInput.value, address: addressInput.value, profilePicUrl: newProfilePicUrl };
        await db.collection('users').doc(currentUser.uid).update(userData);
        alert('¡Perfil actualizado con éxito!');
        oldProfilePicUrl = newProfilePicUrl;
        imageFile = null;
    } catch (error) {
        console.error("Error al guardar los cambios: ", error);
        alert(`Hubo un error al guardar: ${error.message}`);
    } finally {
        saveProfileBtn.disabled = false;
        saveProfileBtn.textContent = 'Guardar Cambios';
    }
});

logoutBtn.addEventListener('click', () => {
    auth.signOut().catch((error) => {
        console.error("Error al cerrar sesión: ", error);
        alert("Hubo un error al cerrar sesión.");
    });
});
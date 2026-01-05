function navigateTo(path) { window.location.href = path; }
const firebaseConfig = { apiKey: "AIzaSyDHZzoPhzUPX-6BWaCx4J5xeXwSeOYmkMY", authDomain: "taxinet-929d8.firebaseapp.com", projectId: "taxinet-929d8", storageBucket: "taxinet-929d8.appspot.com", messagingSenderId: "52566606294", appId: "1:52566606294:web:6a2b4f1e7c964502c46477" };
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();
let currentUser = null, imageFile = null;

// --- Elementos del DOM ---
const userEmailSpan = document.getElementById('user-email'),
    logoutBtn = document.getElementById('logout-btn'),
    loader = document.getElementById('loader'),
    accountContent = document.getElementById('account-content'),
    profileImage = document.getElementById('profile-image'),
    profilePicInput = document.getElementById('profile-pic-input'),
    fullNameInput = document.getElementById('full-name'),
    phoneInput = document.getElementById('phone'),
    addressInput = document.getElementById('address'),
    saveProfileBtn = document.getElementById('save-profile-btn');

const localAddressInput = document.getElementById('local-address');
const localDescriptionInput = document.getElementById('local-description');
const localServicesInput = document.getElementById('local-services');
const facebookUrlInput = document.getElementById('facebook-url');
const instagramUrlInput = document.getElementById('instagram-url');
const whatsappUrlInput = document.getElementById('whatsapp-url');
const tiktokUrlInput = document.getElementById('tiktok-url');
const saveLocalInfoBtn = document.getElementById('save-local-info-btn');

const passwordModal = document.getElementById('password-modal'),
    openPasswordModalBtn = document.getElementById('open-password-modal-btn'),
    closeModalBtn = document.getElementById('close-modal-btn'),
    cancelPasswordBtn = document.getElementById('cancel-password-btn'),
    savePasswordBtn = document.getElementById('save-password-btn'),
    currentPasswordInput = document.getElementById('current-password'),
    newPasswordInput = document.getElementById('new-password'),
    confirmPasswordInput = document.getElementById('confirm-password'),
    modalErrorMsg = document.getElementById('modal-error-msg');

const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const scheduleInputs = {};
daysOfWeek.forEach(day => {
    scheduleInputs[`${day}Open`] = document.getElementById(`${day}-open`);
    scheduleInputs[`${day}Close`] = document.getElementById(`${day}-close`);
});
const saveScheduleBtn = document.getElementById('save-schedule-btn');

const closedTodayToggle = document.getElementById('closed-today-toggle');
const closedReasonInput = document.getElementById('closed-reason');
const reasonGroup = document.getElementById('reason-group');
const saveStatusBtn = document.getElementById('save-status-btn');

auth.onAuthStateChanged(user => {
    if (user) {
        currentUser = user;
        userEmailSpan.textContent = user.email;
        loadAllUserData();
    } else {
        window.location.href = 'app.html';
    }
});

async function loadAllUserData() {
    loader.style.display = 'block';
    accountContent.style.display = 'none';
    try {
        const userDoc = await db.collection('users').doc(currentUser.uid).get();
        if (userDoc.exists) {
            const data = userDoc.data();
            fullNameInput.value = data.fullName || '';
            phoneInput.value = data.phone || '';
            addressInput.value = (data.province && data.canton) ? `${data.province}, ${data.canton}` : (data.province || data.canton || '');
            if (data.profilePicUrl) { profileImage.src = data.profilePicUrl; }

            localAddressInput.value = data.localAddress || '';
            localDescriptionInput.value = data.localDescription || '';
            localServicesInput.value = data.localServices || '';
            if (data.socialMedia) {
                facebookUrlInput.value = data.socialMedia.facebook || '';
                instagramUrlInput.value = data.socialMedia.instagram || '';
                whatsappUrlInput.value = data.socialMedia.whatsapp || '';
                tiktokUrlInput.value = data.socialMedia.tiktok || '';
            }
            if (data.schedule) {
                daysOfWeek.forEach(day => {
                    if (data.schedule[day]) {
                        scheduleInputs[`${day}Open`].value = data.schedule[day].open || '';
                        scheduleInputs[`${day}Close`].value = data.schedule[day].close || '';
                    }
                });
            }
            if (data.status) {
                closedTodayToggle.checked = data.status.closedToday || false;
                closedReasonInput.value = data.status.reason || '';
                reasonGroup.style.display = closedTodayToggle.checked ? 'block' : 'none';
            }
        }
    } catch (error) {
        console.error("Error al cargar datos:", error);
        alert("No se pudieron cargar tus datos.");
    } finally {
        loader.style.display = 'none';
        accountContent.style.display = 'block';
    }
}

profilePicInput.addEventListener('change', e => {
    if (e.target.files && e.target.files[0]) {
        imageFile = e.target.files[0];
        const reader = new FileReader();
        reader.onload = event => profileImage.src = event.target.result;
        reader.readAsDataURL(imageFile);
    }
});

saveProfileBtn.addEventListener('click', async () => {
    saveProfileBtn.disabled = true; saveProfileBtn.textContent = 'Guardando...';
    try {
        let profilePicUrl = profileImage.src;
        if (imageFile) {
            const uploadTask = await storage.ref(`profile_pics/${currentUser.uid}`).put(imageFile);
            profilePicUrl = await uploadTask.ref.getDownloadURL();
        }
        const addressParts = addressInput.value.split(',').map(s => s.trim());
        await db.collection('users').doc(currentUser.uid).set({ 
            fullName: fullNameInput.value, 
            phone: phoneInput.value, 
            province: addressParts[0] || '', 
            canton: addressParts[1] || '', 
            profilePicUrl: profilePicUrl 
        }, { merge: true });
        alert('¡Perfil actualizado!');
    } catch (error) {
        alert(`Error: ${error.message}`);
    } finally {
        saveProfileBtn.disabled = false; saveProfileBtn.textContent = 'Guardar Cambios'; imageFile = null;
    }
});

// --- CÓDIGO ACTUALIZADO PARA GUARDAR INFORMACIÓN DEL LOCAL ---
saveLocalInfoBtn.addEventListener('click', async () => {
    console.log("Botón 'Guardar Información Adicional' presionado.");

    if (!currentUser) {
        console.error('Error de autenticación: No se encontró un usuario actual.');
        alert('Error de usuario. Por favor, recarga la página e intenta de nuevo.');
        return;
    }
    
    console.log('Usuario autenticado:', currentUser.uid);

    saveLocalInfoBtn.disabled = true;
    saveLocalInfoBtn.textContent = 'Guardando...';

    const localData = {
        localAddress: localAddressInput.value,
        localDescription: localDescriptionInput.value,
        localServices: localServicesInput.value,
        socialMedia: {
            facebook: facebookUrlInput.value,
            instagram: instagramUrlInput.value,
            whatsapp: whatsappUrlInput.value,
            tiktok: tiktokUrlInput.value
        }
    };
    
    console.log('Datos a guardar:', JSON.stringify(localData, null, 2));

    try {
        await db.collection('users').doc(currentUser.uid).set(localData, { merge: true });

        console.log('Datos guardados exitosamente en Firestore.');
        alert('¡Información del local guardada con éxito!');
        
    } catch (error) {
        console.error("Error detallado al guardar información del local:", error);
        alert(`Ocurrió un error al guardar. Revisa la consola del navegador para más detalles (Presiona F12 o clic derecho > Inspeccionar > Consola).`);
        
    } finally {
        saveLocalInfoBtn.disabled = false;
        saveLocalInfoBtn.textContent = 'Guardar Información Adicional';
    }
});


saveScheduleBtn.addEventListener('click', async () => {
    saveScheduleBtn.disabled = true; saveScheduleBtn.textContent = 'Guardando...';
    try {
        const scheduleData = {};
        daysOfWeek.forEach(day => {
            const openTime = scheduleInputs[`${day}Open`].value;
            const closeTime = scheduleInputs[`${day}Close`].value;
            scheduleData[day] = { open: openTime, close: closeTime };
        });
        await db.collection('users').doc(currentUser.uid).set({ schedule: scheduleData }, { merge: true });
        alert('¡Horario actualizado!');
    } catch (error) {
        console.error("Error al guardar horario:", error);
        alert(`Error: ${error.message}`);
    } finally {
        saveScheduleBtn.disabled = false; saveScheduleBtn.textContent = 'Guardar Horario';
    }
});

closedTodayToggle.addEventListener('change', () => {
    reasonGroup.style.display = closedTodayToggle.checked ? 'block' : 'none';
    if (!closedTodayToggle.checked) { closedReasonInput.value = ''; }
});

saveStatusBtn.addEventListener('click', async () => {
    saveStatusBtn.disabled = true; saveStatusBtn.textContent = 'Actualizando...';
    try {
        await db.collection('users').doc(currentUser.uid).set({ 
            status: {
                closedToday: closedTodayToggle.checked,
                reason: closedReasonInput.value.trim()
            }
        }, { merge: true });
        alert('¡Estado del local actualizado!');
    } catch (error) {
        console.error("Error al guardar estado:", error);
        alert(`Error: ${error.message}`);
    } finally {
        saveStatusBtn.disabled = false; saveStatusBtn.textContent = 'Actualizar Estado';
    }
});

const showModal = () => passwordModal.style.display = 'flex';
const hideModal = () => {
    passwordModal.style.display = 'none';
    currentPasswordInput.value = newPasswordInput.value = confirmPasswordInput.value = '';
    modalErrorMsg.style.display = 'none';
};

openPasswordModalBtn.addEventListener('click', showModal);
closeModalBtn.addEventListener('click', hideModal);
cancelPasswordBtn.addEventListener('click', hideModal);
window.addEventListener('click', e => { if (e.target == passwordModal) hideModal(); });

savePasswordBtn.addEventListener('click', async () => {
    const currentPassword = currentPasswordInput.value, newPassword = newPasswordInput.value, confirmPassword = confirmPasswordInput.value;
    if (!currentPassword || !newPassword || !confirmPassword) { modalErrorMsg.textContent = 'Todos los campos son obligatorios.'; modalErrorMsg.style.display = 'block'; return; }
    if (newPassword.length < 6) { modalErrorMsg.textContent = 'La nueva contraseña debe tener al menos 6 caracteres.'; modalErrorMsg.style.display = 'block'; return; }
    if (newPassword !== confirmPassword) { modalErrorMsg.textContent = 'Las nuevas contraseñas no coinciden.'; modalErrorMsg.style.display = 'block'; return; }
    savePasswordBtn.disabled = true; savePasswordBtn.textContent = 'Guardando...';
    try {
        const credential = firebase.auth.EmailAuthProvider.credential(currentUser.email, currentPassword);
        await currentUser.reauthenticateWithCredential(credential);
        await currentUser.updatePassword(newPassword);
        alert('¡Contraseña actualizada!');
        hideModal();
    } catch (error) {
        modalErrorMsg.textContent = (error.code == 'auth/wrong-password') ? 'La contraseña actual es incorrecta.' : `Error: ${error.message}`;
        modalErrorMsg.style.display = 'block';
    } finally {
        savePasswordBtn.disabled = false; savePasswordBtn.textContent = 'Guardar';
    }
});

logoutBtn.addEventListener('click', () => { auth.signOut().then(() => { window.location.href = 'app.html'; }); });

const menuBtn = document.getElementById('menu-btn');
const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('sidebar-overlay');
menuBtn.addEventListener('click', () => { sidebar.classList.toggle('open'); overlay.classList.toggle('open'); });
overlay.addEventListener('click', () => { sidebar.classList.remove('open'); overlay.classList.remove('open'); });

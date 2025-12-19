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
        const storage = firebase.storage(); // Initialize Firebase Storage

        const loginBtn = document.getElementById('login-btn');
        const registerBtn = document.getElementById('register-btn'); // New
        const heroLoginBtn = document.getElementById('hero-login-btn');
        const heroRegisterBtn = document.getElementById('hero-register-btn'); // New

        const loginFormContainer = document.getElementById('login-form-container');
        const registerFormContainer = document.getElementById('register-form-container'); // New

        const loginForm = document.getElementById('login-form');
        const registerForm = document.getElementById('register-form'); // New

        const userView = document.getElementById('user-view');
        const logoutBtn = document.getElementById('logout-btn');
        const userEmailSpan = document.getElementById('user-email');
        const errorMessage = document.getElementById('error-message');
        const registerErrorMessage = document.getElementById('register-error-message'); // New

        // Register form specific elements
        const registerFullName = document.getElementById('register-fullName');
        const registerEmail = document.getElementById('register-email');
        const registerPassword = document.getElementById('register-password');
        const registerPhone = document.getElementById('register-phone');
        const registerTransactionType = document.getElementById('register-transactionType');
        const registerProvince = document.getElementById('register-province');
        const registerCanton = document.getElementById('register-canton');

        const provincesAndCantons = {
            "Azuay": ["Cuenca", "Girón", "Paute"],
            "Pichincha": ["Quito", "Rumiñahui", "Mejía"],
            "Guayas": ["Guayaquil", "Durán", "Milagro"],
            "Manabí": ["Portoviejo", "Manta", "Chone"],
            "El Oro": ["Machala", "Pasaje", "Santa Rosa"],
            "Los Ríos": ["Babahoyo", "Quevedo", "Ventanas"],
            "Esmeraldas": ["Esmeraldas", "Atacames", "Quinindé"],
            "Loja": ["Loja", "Saraguro", "Catamayo"],
            "Chimborazo": ["Riobamba", "Alausí", "Guano"],
            "Tungurahua": ["Ambato", "Baños", "Pelileo"],
            "Cotopaxi": ["Latacunga", "Pujilí", "Salcedo"],
            "Imbabura": ["Ibarra", "Otavalo", "Cotacachi"],
            "Carchi": ["Tulcán", "Montúfar", "Espejo"],
            "Sucumbíos": ["Nueva Loja", "Lago Agrio", "Gonzalo Pizarro"],
            "Orellana": ["Coca", "Francisco de Orellana", "Aguarico"],
            "Napo": ["Tena", "Archidona", "El Chaco"],
            "Pastaza": ["Puyo", "Mera", "Santa Clara"],
            "Morona Santiago": ["Macas", "Gualaquiza", "Limón Indanza"],
            "Zamora Chinchipe": ["Zamora", "Yacuambi", "Yantzaza"],
            "Bolívar": ["Guaranda", "Chillanes", "San Miguel"],
            "Cañar": ["Azogues", "Cañar", "La Troncal"],
            "Santa Elena": ["Santa Elena", "La Libertad", "Salinas"],
            "Santo Domingo de los Tsáchilas": ["Santo Domingo"],
            "Galápagos": ["San Cristóbal", "Isabela", "Santa Cruz"]
        };


        function showLoginForm() {
            loginFormContainer.classList.add('show');
            registerFormContainer.classList.remove('show'); // Hide register form if login is shown
        }

        function showRegisterForm() {
            registerFormContainer.classList.add('show');
            loginFormContainer.classList.remove('show'); // Hide login form if register is shown
            populateProvinces(); // Populate provinces when register form is shown
        }

        loginBtn.addEventListener('click', e => { 
            e.stopPropagation(); 
            loginFormContainer.classList.toggle('show');
            if (loginFormContainer.classList.contains('show')) {
                registerFormContainer.classList.remove('show');
            }
        });

        registerBtn.addEventListener('click', e => { // New event listener for register button
            e.stopPropagation(); 
            registerFormContainer.classList.toggle('show');
            if (registerFormContainer.classList.contains('show')) {
                loginFormContainer.classList.remove('show');
                populateProvinces(); // Populate provinces when register form is shown
            }
        });

        heroLoginBtn.addEventListener('click', e => { 
            e.stopPropagation(); 
            showLoginForm(); 
            window.scrollTo(0, 0);
        });

        heroRegisterBtn.addEventListener('click', e => { // New event listener for hero register button
            e.stopPropagation(); 
            showRegisterForm(); 
            window.scrollTo(0, 0);
        });

        window.addEventListener('click', e => {
            if (!loginFormContainer.contains(e.target) && e.target !== loginBtn &&
                !registerFormContainer.contains(e.target) && e.target !== registerBtn) {
                loginFormContainer.classList.remove('show');
                registerFormContainer.classList.remove('show');
            }
        });

        loginForm.addEventListener('submit', async e => {
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

        // New event listener for registration form submission
        registerForm.addEventListener('submit', async e => {
            e.preventDefault();
            registerErrorMessage.style.display = 'none';
            registerErrorMessage.textContent = '';

            const fullName = registerFullName.value.trim();
            const email = registerEmail.value.trim();
            const password = registerPassword.value;
            const phone = registerPhone.value.trim();
            const transactionType = registerTransactionType.value;
            const province = registerProvince.value;
            const canton = registerCanton.value;

            if (!fullName || !email || !password || !phone || !transactionType || !province || !canton) {
                registerErrorMessage.textContent = 'Por favor, completa todos los campos.';
                registerErrorMessage.style.display = 'block';
                return;
            }

            if (password.length < 6) {
                registerErrorMessage.textContent = 'La contraseña debe tener al menos 6 caracteres.';
                registerErrorMessage.style.display = 'block';
                return;
            }

            try {
                const userCredential = await auth.createUserWithEmailAndPassword(email, password);
                const userId = userCredential.user.uid;

                const role = transactionType === "Vendedor" ? "vendedor" : "comprador";

                const userData = {
                    fullName: fullName,
                    email: email,
                    phone: phone,
                    role: role,
                    province: province,
                    canton: canton
                    // profilePicUrl: 'URL_POR_DEFECTO' // Optionally add a default profile pic
                };

                await db.collection("users").doc(userId).set(userData);
                alert('Registro exitoso!');
                // Redirection will be handled by auth.onAuthStateChanged
            } catch (error) {
                console.error("Error during registration:", error);
                let displayMessage = 'Error al registrar usuario.';
                if (error.code === 'auth/email-already-in-use') {
                    displayMessage = 'El correo electrónico ya está en uso.';
                } else if (error.code === 'auth/invalid-email') {
                    displayMessage = 'El formato del correo electrónico es inválido.';
                } else if (error.code === 'auth/weak-password') {
                    displayMessage = 'La contraseña es demasiado débil.';
                }
                registerErrorMessage.textContent = displayMessage;
                registerErrorMessage.style.display = 'block';
            }
        });

        logoutBtn.addEventListener('click', async () => { await auth.signOut(); });

        auth.onAuthStateChanged(async user => {
            if (user) {
                loginBtn.style.display = 'none';
                registerBtn.style.display = 'none'; // Hide register button
                heroLoginBtn.style.display = 'none';
                heroRegisterBtn.style.display = 'none'; // Hide hero register button
                loginFormContainer.classList.remove('show');
                registerFormContainer.classList.remove('show'); // Hide register form
                userView.style.display = 'flex';
                userEmailSpan.textContent = user.email;

                try {
                    const doc = await db.collection("users").doc(user.uid).get();
                    if (doc.exists) {
                        const role = doc.data().role ? doc.data().role.trim().toLowerCase() : null;
                        if (role === 'vendedor') {
                            window.location.href = 'pedidos.html';
                        } else if (role === 'comprador') {
                            window.location.href = 'home.html';
                        } else {
                            alert('Rol de usuario no válido');
                            await auth.signOut();
                        }
                    } else {
                        // This case might happen if a user registers but their data isn't immediately in Firestore
                        // Or if a user logs in but their data was somehow deleted.
                        // For now, let's assume they are a 'comprador' or force sign out.
                        // Given the registration flow, this else block should ideally not be hit after registration.
                        alert('No se encontró el perfil de usuario. Por favor, contacte soporte.');
                        await auth.signOut();
                    }
                } catch (error) {
                    console.error("Error al obtener datos del usuario:", error);
                    await auth.signOut();
                }

            } else {
                loginBtn.style.display = 'flex'; // Use flex for consistency with other buttons
                registerBtn.style.display = 'flex'; // Show register button
                heroLoginBtn.style.display = 'inline-block'; // Use inline-block for consistency with other buttons in a line
                heroRegisterBtn.style.display = 'inline-block'; // Show hero register button
                userView.style.display = 'none';
                userEmailSpan.textContent = '';
                // Ensure forms are hidden when user logs out
                loginFormContainer.classList.remove('show');
                registerFormContainer.classList.remove('show');
            }
        });

        // Functions for Province and Canton dropdowns
        function populateProvinces() {
            registerProvince.innerHTML = '<option value="">Selecciona tu Provincia</option>';
            for (const province in provincesAndCantons) {
                const option = document.createElement('option');
                option.value = province;
                option.textContent = province;
                registerProvince.appendChild(option);
            }
            registerCanton.innerHTML = '<option value="">Selecciona tu Cantón</option>';
            registerCanton.disabled = true;
        }

        registerProvince.addEventListener('change', () => {
            const selectedProvince = registerProvince.value;
            registerCanton.innerHTML = '<option value="">Selecciona tu Cantón</option>'; // Reset cantons
            registerCanton.disabled = true; // Disable until a province is selected

            if (selectedProvince) {
                const cantons = provincesAndCantons[selectedProvince];
                if (cantons && cantons.length > 0) {
                    cantons.forEach(canton => {
                        const option = document.createElement('option');
                        option.value = canton;
                        option.textContent = canton;
                        registerCanton.appendChild(option);
                    });
                    registerCanton.disabled = false;
                }
            }
        });

        // Initial population of provinces when the script loads (or when form is shown)
        populateProvinces();

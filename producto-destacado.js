function navigateTo(path) { window.location.href = path; }

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

const rankingScroller = document.getElementById('product-ranking-scroller');
const chatMessages = document.getElementById('chat-messages');
const chatForm = document.getElementById('chat-form');
const chatInput = document.getElementById('chat-input');
const userProfilePic = document.getElementById('user-profile-pic');
const userFullName = document.getElementById('user-fullname');

let productData = [];
let userInitial = 'Tú';
let fullUserName = 'Vendedor';

// --- AUTENTICACIÓN Y CARGA DE DATOS ---
auth.onAuthStateChanged(async (user) => {
    if (user) {
        const userDoc = await db.collection("users").doc(user.uid).get();
        if (userDoc.exists) {
            const userData = userDoc.data();
            fullUserName = userData.fullName || 'Vendedor';
            userInitial = fullUserName.charAt(0).toUpperCase();

            userFullName.textContent = fullUserName;
            if (userData.profilePicUrl) {
                userProfilePic.src = userData.profilePicUrl;
                userProfilePic.style.display = 'block';
            }

            runAnalysis(fullUserName);
            startAiConversation();
        } else {
            window.location.href = 'app.html';
        }
    } else {
        window.location.href = 'app.html';
    }
});

document.getElementById('logout-btn').addEventListener('click', () => auth.signOut());

// --- LÓGICA DEL RANKING DE PRODUCTOS ---
async function runAnalysis(vendedorNombre) {
    try {
        const snapshot = await db.collection('pedidos').where('vendedorNombre', '==', vendedorNombre).where('status', '==', 'Completado').get();
        const sales = {};
        const promises = snapshot.docs.map(async doc => {
            const prodsSnapshot = await doc.ref.collection('productos').get();
            prodsSnapshot.forEach(prodDoc => {
                const item = prodDoc.data();
                if (!item.name) return;
                if (sales[item.name]) {
                    sales[item.name].total_quantity += (item.quantity || 0);
                } else {
                    sales[item.name] = { 
                        name: item.name, 
                        category: item.category || 'General', 
                        total_quantity: (item.quantity || 0), 
                        imageUrl: item.imageUrl || null 
                    };
                }
            });
        });
        await Promise.all(promises);
        productData = Object.values(sales).sort((a, b) => b.total_quantity - a.total_quantity);
        displayProductRanking(productData);
    } catch (error) { 
        console.error("Error en análisis de datos:", error);
        rankingScroller.innerHTML = '<p style="color:red;">Error al cargar datos del ranking.</p>';
    }
}

function displayProductRanking(products) {
    if (products.length === 0) {
        rankingScroller.innerHTML = '<p>Aún no tienes ventas para generar un ranking.</p>';
        return;
    }
    let html = products.map((p, i) => 
        `<div class="product-card">
            <div class="image-container">${p.imageUrl ? `<img src="${p.imageUrl}" alt="${p.name}">` : '<i class="fas fa-image" style="font-size: 48px; color: #ccc;"></i>'}</div>
            <div class="info">
                <div class="rank">#${i + 1}</div>
                <div class="name">${p.name}</div>
                <div class="sales">Total: <span>${p.total_quantity} uds.</span></div>
            </div>
        </div>`
    ).join('');
    
    if (products.length > 4) { html += html; }
    rankingScroller.innerHTML = `<div class="scroller-content">${html}</div>`;
}

/* ======================================================= */
/* ================== INTEGRACIÓN IA ======================= */
/* ======================================================= */

const FIREBASE_PROJECT_ID = "taxinet-929d8"; // ¡Confirmado!
const CLOUD_FUNCTION_URL = `https://us-central1-${FIREBASE_PROJECT_ID}.cloudfunctions.net/askHuggingFace`;

function startAiConversation() {
    let welcomeMessage = `¡Hola, ${fullUserName}! Soy tu asistente de ventas. He cargado tu ranking. ¿En qué te puedo ayudar?`;
    appendAiMessage({ text: welcomeMessage });
}

function appendUserMessage(text) {
    const div = document.createElement("div");
    div.className = "chat-message user";
    div.innerHTML = `
        <div class="avatar">${userInitial}</div>
        <div class="text-content"><p>${text}</p></div>
    `;
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function appendAiMessage(obj) {
    const div = document.createElement("div");
    div.className = "chat-message";
    if(obj.processing) {
        div.classList.add("processing");
        div.id = "processing-message";
    }
    div.innerHTML = `
        <div class="avatar">IA</div>
        <div class="text-content">${obj.text}</div>
    `;
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// NUEVA FUNCIÓN SEGURA: Llama a nuestra Cloud Function
async function askHuggingFaceIA(message) {
    try {
        const res = await fetch(CLOUD_FUNCTION_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ message: message })
        });

        if (!res.ok) {
            // Si el servidor responde con un error (4xx, 5xx)
            const errorData = await res.json();
            return `⚠️ Error del servidor: ${errorData.error || res.statusText}`;
        }

        const data = await res.json();
        return data.reply || "No pude generar una respuesta.";

    } catch (e) {
        console.error("Error al llamar a la Cloud Function:", e);
        return "⚠️ Error de conexión. No se pudo contactar al asistente de IA.";
    }
}

chatForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const text = chatInput.value.trim();
    if (!text) return;

    appendUserMessage(text);
    chatInput.value = "";

    appendAiMessage({ text: "⏳ Procesando...", processing: true });

    const reply = await askHuggingFaceIA(text);
    
    const processingMessage = document.getElementById("processing-message");
    if (processingMessage) {
        processingMessage.querySelector(".text-content").innerText = reply;
        processingMessage.classList.remove("processing");
        processingMessage.id = "";
    } else {
        appendAiMessage({ text: reply });
    }
});
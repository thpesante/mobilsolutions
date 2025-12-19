function navigateTo(path) { window.location.href = path; }
const firebaseConfig = { apiKey: "AIzaSyDHZzoPhzUPX-6BWaCx4J5xeXwSeOYmkMY", authDomain: "taxinet-929d8.firebaseapp.com", projectId: "taxinet-929d8", storageBucket: "taxinet-929d8.appspot.com", messagingSenderId: "52566606294", appId: "1:52566606294:web:6a2b4f1e7c964502c46477" };
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

const userNameSpan = document.getElementById('user-name');
const userProfilePic = document.getElementById('user-profile-pic');
const logoutBtn = document.getElementById('logout-btn');
const generateBtn = document.getElementById('generate-report-btn');
const resultsContainer = document.getElementById('report-results-container');
const mostPurchasedContainer = document.getElementById('most-purchased-container');
const startDateInput = document.getElementById('start-date');
const endDateInput = document.getElementById('end-date');
const exportDateBtn = document.getElementById('export-date-report-btn');
const exportRankingBtn = document.getElementById('export-ranking-report-btn');

let currentVendedorNombre = null;
let currentReportData = null; // Guardar datos del reporte de fecha
let currentRankingData = null; // Guardar datos del ranking

auth.onAuthStateChanged(async (user) => {
    if (user) {
        const userDoc = await db.collection("users").doc(user.uid).get();
        if (userDoc.exists) {
            const userData = userDoc.data();
            currentVendedorNombre = userData.fullName;
            userNameSpan.textContent = userData.fullName;
            if (userData.profilePicUrl) {
                userProfilePic.src = userData.profilePicUrl;
                userProfilePic.style.display = 'block';
            }
            setDefaultDates();
            generateMostPurchasedReport(currentVendedorNombre);
        } else {
            [resultsContainer, mostPurchasedContainer].forEach(c => c.innerHTML = '<p style="color: red;">Error: No se pudo encontrar tu perfil.</p>');
        }
    } else { 
        window.location.href = 'app.html'; 
    }
});

function setDefaultDates() {
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    endDateInput.value = today.toISOString().split('T')[0];
    startDateInput.value = firstDayOfMonth.toISOString().split('T')[0];
}

generateBtn.addEventListener('click', async () => {
    if (!currentVendedorNombre) return alert('No se ha podido identificar al vendedor.');
    const startDateStr = startDateInput.value, endDateStr = endDateInput.value;
    if (!startDateStr || !endDateStr) return alert('Por favor, selecciona fechas de inicio y fin.');
    const startDate = new Date(startDateStr); startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(endDateStr); endDate.setHours(23, 59, 59, 999);
    if (startDate > endDate) return alert('La fecha de inicio no puede ser posterior a la de fin.');
    
    resultsContainer.innerHTML = '<p>Generando reporte por fecha...</p>';
    exportDateBtn.style.display = 'none';
    try {
        const query = db.collection('pedidos').where('vendedorNombre', '==', currentVendedorNombre).where('status', '==', 'Completado').where('date', '>=', startDate).where('date', '<=', endDate);
        const pedidosSnapshot = await query.get();
        
        if (pedidosSnapshot.empty) {
            resultsContainer.innerHTML = '<p>No se encontraron ventas completadas para las fechas seleccionadas.</p>';
            currentReportData = null;
            return;
        }

        let totalRevenue = 0, totalItemsSold = 0;
        const productBreakdown = {};
        const pedidosDataPromises = pedidosSnapshot.docs.map(async (doc) => {
            totalRevenue += doc.data().total || 0;
            const productosSnapshot = await db.collection('pedidos').doc(doc.id).collection('productos').get();
            productosSnapshot.forEach(prodDoc => {
                const item = prodDoc.data();
                const quantity = item.quantity || 0, price = item.price || 0, revenue = quantity * price, productName = item.name || 'Producto Desconocido';
                totalItemsSold += quantity;
                if (productBreakdown[productName]) {
                    productBreakdown[productName].items_sold += quantity; productBreakdown[productName].revenue += revenue;
                } else {
                    productBreakdown[productName] = { name: productName, items_sold: quantity, revenue: revenue };
                }
            });
        });
        await Promise.all(pedidosDataPromises);

        currentReportData = {
            summary: { total_revenue: totalRevenue, total_items_sold: totalItemsSold },
            breakdown: Object.values(productBreakdown).sort((a, b) => b.revenue - a.revenue)
        };
        displayDateReport(currentReportData);

    } catch (error) {
        console.error("Error al generar el reporte por fecha:", error);
        resultsContainer.innerHTML = `<p style="color: red;">Error al generar el reporte. Es posible que necesites crear un índice en Firestore. Revisa la consola (F12) para ver el enlace.</p>`;
    }
});

function displayDateReport(data) {
    const summaryHTML = `<div class="report-summary"><div class="summary-card"><h3>Ingresos Totales</h3><p>S/ ${data.summary.total_revenue.toFixed(2)}</p></div><div class="summary-card"><h3>Artículos Vendidos</h3><p>${data.summary.total_items_sold}</p></div></div>`;
    let breakdownHTML = '<h2>Desglose por Producto</h2>';
    if (data.breakdown.length === 0) {
        breakdownHTML += '<p>No se encontraron productos en las ventas para este período.</p>';
    } else {
        breakdownHTML += `<table class="results-table"><thead><tr><th>Producto</th><th>Cantidad Vendida</th><th>Ingresos Generados</th></tr></thead><tbody>${data.breakdown.map(item => `<tr><td>${item.name}</td><td>${item.items_sold}</td><td>S/ ${item.revenue.toFixed(2)}</td></tr>`).join('')}</tbody></table>`;
    }
    resultsContainer.innerHTML = summaryHTML + breakdownHTML;
    exportDateBtn.style.display = 'inline-block'; // Mostrar botón
}

async function generateMostPurchasedReport(vendedorNombre) {
    mostPurchasedContainer.innerHTML = '<p>Calculando ranking histórico de productos...</p>';
    exportRankingBtn.style.display = 'none';
    try {
        const query = db.collection('pedidos').where('vendedorNombre', '==', vendedorNombre).where('status', '==', 'Completado');
        const pedidosSnapshot = await query.get();
        const productSales = {};
        const productPromises = pedidosSnapshot.docs.map(async (doc) => {
            const productosSnapshot = await db.collection('pedidos').doc(doc.id).collection('productos').get();
            productosSnapshot.forEach(prodDoc => {
                const item = prodDoc.data();
                const quantity = item.quantity || 0, productName = item.name || 'Producto Desconocido';
                if (productSales[productName]) { productSales[productName].total_quantity += quantity; } 
                else { productSales[productName] = { name: productName, total_quantity: quantity }; }
            });
        });
        await Promise.all(productPromises);
        
        currentRankingData = Object.values(productSales).sort((a, b) => b.total_quantity - a.total_quantity);
        displayMostPurchasedReport(currentRankingData);
    } catch (error) {
        console.error("Error generando ranking:", error);
        mostPurchasedContainer.innerHTML = `<p style="color: red;">Error al generar el ranking. Es posible que necesites crear un índice en Firestore. Revisa la consola (F12).</p>`;
    }
}

function displayMostPurchasedReport(products) {
    if (products.length === 0) {
        mostPurchasedContainer.innerHTML = '<p>Aún no tienes ventas completadas para generar un ranking.</p>';
        currentRankingData = [];
        return;
    }
    let tableHTML = `<table class="results-table"><thead><tr><th>Posición</th><th>Producto</th><th>Total Vendido (Unidades)</th></tr></thead><tbody>`;
    products.forEach((product, index) => { tableHTML += `<tr><td>${index + 1}</td><td>${product.name}</td><td>${product.total_quantity}</td></tr>`; });
    tableHTML += `</tbody></table>`;
    mostPurchasedContainer.innerHTML = tableHTML;
    exportRankingBtn.style.display = 'inline-block'; // Mostrar botón
}

function exportDateReportToExcel() {
    if (!currentReportData) { return alert("Primero genera un reporte para poder exportarlo."); }
    const summaryData = [ ["Ingresos Totales", `S/ ${currentReportData.summary.total_revenue.toFixed(2)}`], ["Artículos Vendidos", currentReportData.summary.total_items_sold] ];
    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
    const breakdownData = currentReportData.breakdown.map(item => ({ "Producto": item.name, "Cantidad Vendida": item.items_sold, "Ingresos Generados (S/)": parseFloat(item.revenue.toFixed(2)) }));
    const wsBreakdown = XLSX.utils.json_to_sheet(breakdownData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, wsSummary, "Resumen del Reporte");
    XLSX.utils.book_append_sheet(wb, wsBreakdown, "Desglose por Producto");
    const startDate = document.getElementById('start-date').value, endDate = document.getElementById('end-date').value;
    XLSX.writeFile(wb, `Reporte_Ventas_${startDate}_a_${endDate}.xlsx`);
}

function exportRankingToExcel() {
    if (!currentRankingData || currentRankingData.length === 0) { return alert("No hay datos en el ranking para exportar."); }
    const rankingData = currentRankingData.map((product, index) => ({ "Posición": index + 1, "Producto": product.name, "Total Vendido (Unidades)": product.total_quantity }));
    const ws = XLSX.utils.json_to_sheet(rankingData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Ranking de Productos");
    XLSX.writeFile(wb, "Ranking_Productos_Mas_Vendidos.xlsx");
}

exportDateBtn.addEventListener('click', exportDateReportToExcel);
exportRankingBtn.addEventListener('click', exportRankingToExcel);
logoutBtn.addEventListener('click', () => auth.signOut().then(() => { window.location.href = 'app.html'; }));
const menuBtn = document.getElementById('menu-btn'), sidebar = document.getElementById('sidebar'), overlay = document.getElementById('sidebar-overlay');
menuBtn.addEventListener('click', () => { sidebar.classList.toggle('open'); overlay.classList.toggle('open'); });
overlay.addEventListener('click', () => { sidebar.classList.remove('open'); overlay.classList.remove('open'); });

document.addEventListener('DOMContentLoaded', () => {

    if (typeof firebase === 'undefined') { return; }

    console.log("UI script cargado y listo para notificaciones.");

    const db = firebase.firestore();

    function createNotificationElement() {
        const notification = document.createElement('div');
        notification.id = 'custom-notification';
        notification.classList.add('custom-notification');
        notification.innerHTML = `
            <i class="fas fa-bell"></i>
            <div class="notification-content">
                <h4>¡Tu pedido está cerca!</h4>
                <p>El repartidor está llegando a tu ubicación. ¡Prepárate para recibirlo!</p>
            </div>
        `;
        document.body.appendChild(notification);
        return notification;
    }

    function showNotification() {
        console.log("¡CONDICIÓN CUMPLIDA! Mostrando la notificación...");
        let notification = document.getElementById('custom-notification');
        if (!notification) {
            notification = createNotificationElement();
        }
        notification.classList.add('show');
        const audio = new Audio('/notification.mp3');
        audio.play().catch(error => console.error("Error al reproducir audio:", error));
        setTimeout(() => { notification.classList.remove('show'); }, 5000);
    }

    function setupArrivalListener(uid) {
        console.log(`Configurando listener para pedidos 'Cerca de destino' del cliente UID: ${uid}`);
        
        const nearDestinationQuery = db.collection('pedidos')
            .where('clienteId', '==', uid)
            .where('status', '==', 'Cerca de destino');

        nearDestinationQuery.onSnapshot(snapshot => {
            console.log("--- Listener de Firestore activado ---");

            if (snapshot.docChanges().length === 0) {
                console.log("El listener se activó, pero no hay cambios específicos en los documentos.");
            }

            snapshot.docChanges().forEach(change => {
                const orderData = change.doc.data();
                const orderId = change.doc.id;

                // NUEVO LOG: Muestra el tipo de cambio y los datos SIEMPRE
                console.log(`CAMBIO DETECTADO: Tipo=${change.type}, Pedido ID=${orderId}, Datos=`, orderData);

                // Mantenemos la lógica para activar la notificación
                if (orderData.alertaLlegada === "true") {
                    showNotification();
                    change.doc.ref.update({ alertaLlegada: "false" }).then(() => {
                        console.log(`Alerta para el pedido ${orderId} reseteada.`);
                    });
                }
            });
             console.log("--- Fin de la iteración de cambios ---");
        }, error => {
            console.error("Error crítico en el listener de pedidos:", error);
        });
    }

    firebase.auth().onAuthStateChanged(user => {
        if (user) {
            console.log(`Usuario autenticado: ${user.uid}. Activando listener de llegada.`);
            setupArrivalListener(user.uid);
        } else {
            console.log("Usuario no autenticado. El listener de llegada no se activará.");
        }
    });
});

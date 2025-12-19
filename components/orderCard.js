export function createOrderCard(order, index) {
    const orderDate = order.date && typeof order.date.seconds === 'number'
        ? new Date(order.date.seconds * 1000).toLocaleString('es-ES')
        : 'Fecha desconocida';

    const orderCard = document.createElement('div');
    orderCard.classList.add('order-card');
    orderCard.dataset.orderId = order.id;

    let statusColor = '#666';
    switch (order.status) {
        case 'Pendiente': statusColor = '#FFC107'; break;
        case 'Enviado': statusColor = '#007BFF'; break;
        case 'Entregado': statusColor = '#28A745'; break;
        case 'Cancelado': statusColor = '#DC3545'; break;
        default: statusColor = 'var(--text-medium)';
    }

    orderCard.innerHTML = `
        <div class="order-card-header">
            <h3>Pedido #${index + 1}</h3>
            <span style="color: ${statusColor};">${order.status || 'Estado desconocido'}</span>
        </div>
        <div class="order-card-details">
            <p><strong>Fecha:</strong> ${orderDate}</p>
            <p><strong>Entrega:</strong> ${order.deliveryMethod || 'N/A'}</p>
            <p class="total"><strong>Total:</strong> S/ ${(order.total || 0).toFixed(2)}</p>
        </div>
    `;

    return orderCard;
}

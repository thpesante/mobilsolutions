
# Blueprint: MobiSolutions

## Visión General

MobiSolutions es una aplicación web diseñada para ofrecer una variedad de servicios a través de una interfaz unificada. La aplicación permite a los usuarios acceder a servicios de taxi, pedir comida, comprar en farmacias y más. La plataforma está diseñada para ser rápida, segura y fácil de usar, conectando a los usuarios con los servicios que necesitan en su vida diaria.

## Estructura del Proyecto

El proyecto sigue una estructura de múltiples páginas, donde cada funcionalidad principal tiene su propio archivo HTML, CSS y JavaScript. Esto permite una separación clara de las preocupaciones y facilita el mantenimiento.

- **Páginas Principales:** `index.html`, `home.html`, `cuenta.html`, `productos.html`, `cart.html`, etc.
- **Estilos:** Cada página tiene su propio archivo CSS (`app.css`, `home.css`, etc.), con estilos globales en `style.css`.
- **Lógica:** La lógica de la aplicación se encuentra en archivos JavaScript (`app.js`, `home.js`, etc.), con funcionalidades de UI reutilizables en `ui.js`.
- **Componentes:** Se utilizan componentes de JavaScript para elementos reutilizables como las tarjetas de pedido (`components/orderCard.js`).
- **Activos:** Las imágenes se almacenan en la carpeta `images/`.

## Plan de Corrección de Rutas

### Problema

Las rutas de navegación fallan en GitHub Pages porque están configuradas como relativas. Al navegar, se pierde la parte `/mobilsolutions/` de la URL, lo que resulta inaccecible.

### Solución

1. **Agregar una etiqueta `<base>`:** Se añadirá `<base href="https://thpesante.github.io/mobilsolutions/">` en el `<head>` de todos los archivos HTML. Esto asegurará que todas las rutas relativas se resuelvan a partir de la URL base del proyecto.

2. **Actualizar las rutas de navegación:** Se revisarán todos los enlaces de navegación en los archivos HTML para asegurar que funcionen correctamente con la nueva etiqueta `<base>`.

3. **Verificar la consistencia:** Se revisarán todos los archivos HTML para garantizar que la estructura de la página, los enlaces a CSS y los scripts de JavaScript sean consistentes y correctos.

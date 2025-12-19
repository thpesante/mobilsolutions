
# Blueprint: Yalopido

## Overview

Yalopido is a versatile mobile application designed to provide users with a comprehensive solution for তাদের daily needs. This application acts as a central platform connecting users with a wide range of local services, including taxis, food delivery, and other essential products. By leveraging innovative technology, Yalopido aims to offer a fast, secure, and convenient experience, effectively bridging the gap between user needs and the digital world.

## Implemented Features

### Core Functionality
- **User Authentication:** Secure login and registration for buyers and sellers.
- **Geolocation:** Integration with geolocation services to identify user and seller locations, facilitating localized service delivery.
- **Real-time Database:** Utilization of Firebase Firestore for instant data synchronization and updates.

### User Interface & Design
- **Intuitive Navigation:** A clear and user-friendly interface with a bottom navigation bar for easy access to different sections.
- **Modern Aesthetics:** A visually appealing design featuring a vibrant purple color scheme, clean typography, and well-structured layouts.
- **Responsive Layout:** The application is fully responsive, ensuring a seamless experience on both mobile and web platforms.

### Key Sections
- **Home:** Displays featured products, exclusive offers, and product categories.
- **Orders:** Allows users to track their current and past orders.
- **Cart:** A fully functional shopping cart for managing selected items.
- **Account:** Provides users with access to their profile information and settings.

## Current Implementation Plan

### Phase 1: Localized and Real-Time Product Availability

**Objective:** To enhance the user experience by showing only relevant products from local, open vendors and clearly indicating product availability.

**Key Steps:**

1.  **Location-Based Filtering:**
    *   On application start, retrieve the logged-in user's `province` and `canton` from their profile.
    *   Fetch all vendors and products from the database.
    *   Implement a filter to display only vendors and their products that are located in the same `province` and `canton` as the user.

2.  **Vendor Schedule and Status:**
    *   Create a function to check if a vendor is currently open based on their `schedule` (days and hours of operation).
    *   Check the vendor's `status` map. If `status.closedToday` is `true`, the vendor will be considered closed, regardless of their schedule.
    *   Display the reason for closure (`status.reason`) if available.

3.  **Product Availability and Display:**
    *   Check the `disponible` field for each product.
    *   If `disponible` is `false`, the product card will be styled differently:
        *   The card will be displayed in grayscale.
        *   A prominent "Agotado" (Out of Stock) watermark will be overlaid on the product image.
        *   The product will be unclickable.
    *   Products from vendors that are currently closed will also be rendered as inactive and unclickable, with a "Local Cerrado" (Store Closed) message.

4.  **UI/CSS Updates:**
    *   Introduce new CSS classes to handle the visual states for "unavailable" and "vendor-closed" products.
    *   Add styles for watermarks and grayscale effects.
    *   Update vendor cards to visually indicate if a store is closed.

5.  **Code Refactoring:**
    *   Organize the JavaScript code in `home.js` to accommodate the new logic in a clean and maintainable way.
    *   Ensure all database queries are efficient.

This implementation will make the application smarter, more efficient, and provide a significantly improved user experience by ensuring that users only see relevant, available products from local businesses that are ready to serve them.

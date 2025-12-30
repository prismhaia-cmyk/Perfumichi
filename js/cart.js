// Cart Logic
function getCart() {
    try {
        return JSON.parse(localStorage.getItem('cart') || '[]');
    } catch (e) {
        console.error('Error parsing cart:', e);
        localStorage.removeItem('cart'); // Reset if corrupted
        return [];
    }
}

function updateCartCount() {
    const cart = getCart();
    // Count total items including quantities
    const count = cart.reduce((total, item) => total + (item.quantity || 1), 0);
    const badge = document.querySelector('.cart-count');
    if (badge) {
        badge.textContent = count;
        if (count > 0) {
            badge.classList.add('visible');
        } else {
            badge.classList.remove('visible');
        }
    }
}

function renderCart() {
    const cartItemsContainer = document.querySelector('.cart-items');
    const cartTotalElement = document.querySelector('.cart-total span:last-child');

    // If elements don't exist (e.g. on pages without cart drawer), skip
    if (!cartItemsContainer || !cartTotalElement) return;

    let cart = getCart();

    cartItemsContainer.innerHTML = '';
    let total = 0;

    if (cart.length === 0) {
        cartItemsContainer.innerHTML = '<p class="empty-cart-msg">Tu cesta está vacía.</p>';
    } else {
        cart.forEach((item, index) => {
            const quantity = item.quantity || 1;
            const itemTotal = item.price * quantity;
            total += itemTotal;
            const itemElement = document.createElement('div');
            itemElement.classList.add('cart-item');
            itemElement.innerHTML = `
                <div class="cart-item-img">${item.image}</div>
                <div class="cart-item-details">
                    <div class="cart-item-title">${item.title}</div>
                    <div class="cart-item-variant">Tamaño: ${item.size}</div>
                    <div class="cart-item-price">${item.price.toFixed(2)}€</div>
                    <div class="cart-item-quantity">
                        <button class="qty-btn qty-minus" data-index="${index}">−</button>
                        <span class="qty-value">${quantity}</span>
                        <button class="qty-btn qty-plus" data-index="${index}">+</button>
                    </div>
                </div>
                <div class="cart-item-remove" data-index="${index}">&times;</div>
            `;
            cartItemsContainer.appendChild(itemElement);
        });
    }

    cartTotalElement.textContent = total.toFixed(2) + '€';

    // Attach event listeners for remove buttons
    document.querySelectorAll('.cart-item-remove').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const index = parseInt(e.target.dataset.index);
            removeFromCart(index);
        });
    });

    // Attach event listeners for quantity buttons
    document.querySelectorAll('.qty-minus').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const index = parseInt(e.target.dataset.index);
            decreaseQuantity(index);
        });
    });

    document.querySelectorAll('.qty-plus').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const index = parseInt(e.target.dataset.index);
            increaseQuantity(index);
        });
    });
}

function increaseQuantity(index) {
    let cart = getCart();
    if (cart[index]) {
        cart[index].quantity = (cart[index].quantity || 1) + 1;
        localStorage.setItem('cart', JSON.stringify(cart));
        updateCartCount();
        renderCart();
    }
}

function decreaseQuantity(index) {
    let cart = getCart();
    if (cart[index]) {
        const currentQty = cart[index].quantity || 1;
        if (currentQty > 1) {
            cart[index].quantity = currentQty - 1;
            localStorage.setItem('cart', JSON.stringify(cart));
        } else {
            // If quantity would be 0, remove item
            cart.splice(index, 1);
            localStorage.setItem('cart', JSON.stringify(cart));
        }
        updateCartCount();
        renderCart();
    }
}

function removeFromCart(index) {
    let cart = getCart();
    cart.splice(index, 1);
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartCount();
    renderCart();
}

// Toggle Cart Drawer
window.toggleCart = () => {
    const sidebar = document.getElementById('cartSidebar');
    const overlay = document.getElementById('cartOverlay');

    if (sidebar && overlay) {
        sidebar.classList.toggle('active');
        overlay.classList.toggle('active');

        if (sidebar.classList.contains('active')) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
    }
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    updateCartCount();
    renderCart();
});

// Listen for storage changes (sync across tabs)
window.addEventListener('storage', () => {
    updateCartCount();
    renderCart();
});

// Export for use in other modules if needed
export { getCart, updateCartCount, renderCart, removeFromCart, increaseQuantity, decreaseQuantity };

// Checkout function - sends cart to Stripe
async function checkout() {
    const cart = getCart();

    if (cart.length === 0) {
        alert('Tu cesta está vacía');
        return;
    }

    // Expand cart items based on quantity for Stripe
    const expandedItems = [];
    cart.forEach(item => {
        const qty = item.quantity || 1;
        for (let i = 0; i < qty; i++) {
            expandedItems.push({
                ...item,
                quantity: 1 // Each line item has quantity 1
            });
        }
    });

    // Show loading state
    const checkoutBtn = document.querySelector('.checkout-btn');
    const originalText = checkoutBtn ? checkoutBtn.textContent : '';
    if (checkoutBtn) {
        checkoutBtn.textContent = 'Procesando...';
        checkoutBtn.disabled = true;
    }

    // Save pending order for success page handling
    localStorage.setItem('pending_order', JSON.stringify({
        items: cart,
        date: new Date().toISOString(),
        total: cart.reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0)
    }));

    try {
        const response = await fetch('/api/create-checkout', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ items: expandedItems }),
        });

        const data = await response.json();

        if (data.url) {
            // Redirect to Stripe Checkout
            window.location.href = data.url;
        } else {
            throw new Error(data.error || 'Error al crear el pago');
        }
    } catch (error) {
        console.error('Checkout error:', error);
        alert('Error al procesar el pago. Por favor, inténtalo de nuevo.');

        // Restore button state
        if (checkoutBtn) {
            checkoutBtn.textContent = originalText;
            checkoutBtn.disabled = false;
        }
    }
}

// Expose to window for HTML onclick handlers and inline scripts
window.getCart = getCart;
window.updateCartCount = updateCartCount;
window.renderCart = renderCart;
window.removeFromCart = removeFromCart;
window.increaseQuantity = increaseQuantity;
window.decreaseQuantity = decreaseQuantity;
window.checkout = checkout;

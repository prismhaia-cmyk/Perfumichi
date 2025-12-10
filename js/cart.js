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
    const count = cart.length;
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
            total += item.price;
            const itemElement = document.createElement('div');
            itemElement.classList.add('cart-item');
            // Ensure image is rendered correctly (it might be an HTML string or URL)
            // Assuming item.image is the HTML string for the placeholder as seen in catalogo.html
            itemElement.innerHTML = `
                <div class="cart-item-img">${item.image}</div>
                <div class="cart-item-details">
                    <div class="cart-item-title">${item.title}</div>
                    <div class="cart-item-variant">Tamaño: ${item.size}</div>
                    <div class="cart-item-price">${item.price.toFixed(2)}€</div>
                </div>
                <div class="cart-item-remove" data-index="${index}">&times;</div>
            `;
            cartItemsContainer.appendChild(itemElement);
        });
    }

    cartTotalElement.textContent = total.toFixed(2) + '€';

    // Re-attach event listeners for remove buttons
    document.querySelectorAll('.cart-item-remove').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const index = parseInt(e.target.dataset.index);
            removeFromCart(index);
        });
    });
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
export { getCart, updateCartCount, renderCart, removeFromCart };

// Expose to window for HTML onclick handlers and inline scripts
window.getCart = getCart;
window.updateCartCount = updateCartCount;
window.renderCart = renderCart;
window.removeFromCart = removeFromCart;

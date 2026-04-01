// Login check
if (localStorage.getItem('isLoggedIn') !== 'true') {
    window.location.href = 'login.html';
}

// Scroll Reveal Animation
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('fade-in-up');
            observer.unobserve(entry.target);
        }
    });
}, observerOptions);

document.querySelectorAll('.reveal').forEach(el => {
    observer.observe(el);
});

// Subtle parallax for hero
let ticking = false;
function updateParallax() {
    const scrolled = window.pageYOffset;
    const hero = document.querySelector('.hero-banner');
    if (hero) {
        const rate = scrolled * -0.5;
        hero.style.transform = `translateY(${rate}px)`;
    }
    ticking = false;
}

function requestTick() {
    if (!ticking) {
        requestAnimationFrame(updateParallax);
        ticking = true;
    }
}

window.addEventListener('scroll', requestTick, { passive: true });

// Center item scale effect for all scroll containers
document.querySelectorAll('.products-scroll').forEach(productsScroll => {
    const updateCenterItem = () => {
        const cards = productsScroll.querySelectorAll('.product-card');
        const containerRect = productsScroll.getBoundingClientRect();
        const centerX = containerRect.left + containerRect.width / 2;

        cards.forEach(card => {
            const cardRect = card.getBoundingClientRect();
            const cardCenterX = cardRect.left + cardRect.width / 2;
            const distance = Math.abs(centerX - cardCenterX);
            const maxDistance = containerRect.width / 2;
            const scale = 1 + (0.05 * (1 - Math.min(distance / maxDistance, 1)));
            card.style.transform = `scale(${scale})`;
        });
    };

    productsScroll.addEventListener('scroll', updateCenterItem, { passive: true });
    updateCenterItem();
});

// Search Functionality
const searchBar = document.querySelector('.search-bar');
const productCategories = document.querySelectorAll('.products-category');

searchBar.addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase().trim();
    
    productCategories.forEach(category => {
        const cards = category.querySelectorAll('.product-card');
        let hasVisibleCards = false;
        
        cards.forEach(card => {
            const productName = card.querySelector('h3').textContent.toLowerCase();
            const productPrice = card.querySelector('.product-price').textContent.toLowerCase();
            
            if (productName.includes(searchTerm) || productPrice.includes(searchTerm)) {
                card.style.display = 'flex';
                hasVisibleCards = true;
            } else {
                card.style.display = 'none';
            }
        });
        
        // Show/hide entire category based on whether it has visible cards
        if (hasVisibleCards || searchTerm === '') {
            category.style.display = 'block';
        } else {
            category.style.display = 'none';
        }
    });
});


// Reset filter when clicking outside or clearing search
searchBar.addEventListener('keyup', (e) => {
    if (e.key === 'Escape' || searchBar.value === '') {
        searchBar.value = '';
        productCategories.forEach(category => {
            category.style.display = 'block';
            category.querySelectorAll('.product-card').forEach(card => {
                card.style.display = 'flex';
            });
        });
    }
});

// =========================================
// CART FUNCTIONALITY
// =========================================

// Products data
let products = [];

// Cart from localStorage
function getCart() {
    return JSON.parse(localStorage.getItem('cart') || '[]');
}

function saveCart(cart) {
    localStorage.setItem('cart', JSON.stringify(cart));
}

// Add/update item in cart
function addToCart(productId, quantity = 1) {
    const cart = getCart();
    const product = products.find(p => p.id == productId);
    if (!product) return;

    const existing = cart.find(item => item.id == productId);
    if (existing) {
        existing.qty += quantity;
    } else {
        cart.push({ id: productId, name: product.name, price: product.price, qty: quantity });
    }
    saveCart(cart);
    updateBadge();
}

// Update quantity
function updateQty(productId, delta) {
    const cart = getCart();
    const item = cart.find(item => item.id == productId);
    if (item) {
        item.qty = Math.max(1, item.qty + delta);
        if (item.qty === 0) {
            cart.splice(cart.indexOf(item), 1);
        }
        saveCart(cart);
        updateBadge();
        renderCart(); // For cart page
    }
}

// Remove item
function removeFromCart(productId) {
    let cart = getCart();
    cart = cart.filter(item => item.id != productId);
    saveCart(cart);
    updateBadge();
    renderCart();
}

// Get totals
function getCartTotal() {
    const cart = getCart();
    return cart.reduce((total, item) => total + (item.price * item.qty), 0);
}

function updateBadge() {
    const cart = getCart();
    const badge = document.querySelector('.badge');
    if (badge) {
        const count = cart.reduce((sum, item) => sum + item.qty, 0);
        badge.textContent = count || '0';
        badge.classList.toggle('badge-pop', count > 0);
    }
}

// Extract products from DOM
function extractProducts() {
    products = Array.from(document.querySelectorAll('.product-card')).map((card, index) => {
        const nameEl = card.querySelector('h3');
        const priceEl = card.querySelector('.product-price');
        return {
            id: index,
            name: nameEl ? nameEl.textContent.trim() : 'Unknown',
            price: priceEl ? parseFloat(priceEl.textContent.replace('₹', '').trim()) : 0
        };
    });
}

// Product state tracking
let productQtys = new Map(); // id -> qty

function loadProductQtys() {
    const cart = getCart();
    productQtys.clear();
    cart.forEach(item => productQtys.set(item.id, item.qty));
}

function saveProductQty(id, qty) {
    let cart = getCart();
    const index = cart.findIndex(item => item.id == id);
    if (qty > 0) {
        if (index > -1) {
            cart[index].qty = qty;
        } else {
            const product = products.find(p => p.id == id);
            if (product) cart.push({id, name: product.name, price: product.price, qty});
        }
    } else if (index > -1) {
        cart.splice(index, 1);
    }
    saveCart(cart);
    productQtys.set(id, qty);
    updateBadge();
    if (document.querySelector('.cart-container')) renderCart(); // Live sync
}

function renderProductFooter(card) {
    const productId = parseInt(card.dataset.product);
    const addBtn = card.querySelector('.add-btn');
    addBtn.classList.add('transforming'); // Trigger animation

    const qtyControls = card.querySelector('.quantity-controls') || createQtyControls();
    const qty = productQtys.get(productId) || 0;

    if (qty > 0) {
        addBtn.innerHTML = '';
        addBtn.appendChild(qtyControls);
        addBtn.classList.add('in-cart');
        addBtn.querySelector('.qty').textContent = qty;
    } else {
        addBtn.innerHTML = 'ADD';
        addBtn.classList.remove('in-cart');
    }

    setTimeout(() => addBtn.classList.remove('transforming'), 300);
}

function createQtyControls() {
    const div = document.createElement('div');
    div.className = 'quantity-controls';
    div.innerHTML = '<button class="qty-btn decrement" type="button">-</button><span class="qty">1</span><button class="qty-btn increment" type="button">+</button>';
    return div;
}

// Product card interactions
function initProducts() {
    extractProducts();
    loadProductQtys();

    document.querySelectorAll('.product-card').forEach(card => renderProductFooter(card));

    document.addEventListener('click', (e) => {
        const card = e.target.closest('.product-card');
        if (!card) return;

        const productId = parseInt(card.dataset.product);
        const addBtn = card.querySelector('.add-btn');
        const decBtn = e.target.closest('.qty-btn.decrement');
        const incBtn = e.target.closest('.qty-btn.increment');

        if (addBtn && addBtn.textContent.trim() === 'ADD') {
            // Initial add
            saveProductQty(productId, 1);
            renderProductFooter(card);
            card.classList.add('cart-shake');
            setTimeout(() => card.classList.remove('cart-shake'), 400);
        } else if (incBtn) {
            const currentQty = productQtys.get(productId) || 1;
            saveProductQty(productId, currentQty + 1);
            renderProductFooter(card);
        } else if (decBtn) {
            const currentQty = productQtys.get(productId) || 1;
            const newQty = currentQty - 1;
            saveProductQty(productId, newQty);
            renderProductFooter(card);
        }
    });
}

// Render cart for cart.html
function renderCart() {
    const cartContainer = document.querySelector('.cart-container');
    if (!cartContainer) return;

    const cart = getCart();
    const subtotal = getCartTotal();

    if (cart.length === 0) {
        cartContainer.innerHTML = `
            <div class="empty-cart">
                <div class="empty-icon">🛒</div>
                <h2>Your cart is empty</h2>
                <p>Add some fresh dairy products to get started!</p>
                <a href="index.html"><button class="continue-btn">Continue Shopping</button></a>
            </div>
        `;
        updateTotals(0);
        return;
    }

    let itemsHtml = cart.map(item => `
        <tr>
            <td>${item.name}</td>
            <td>${item.qty}</td>
            <td>₹${item.price.toFixed(0)}</td>
            <td>₹${(item.price * item.qty).toFixed(0)}</td>
            <td><button class="remove-btn" data-id="${item.id}">×</button></td>
        </tr>
    `).join('');

    cartContainer.innerHTML = `
        <table class="cart-table">
            <thead>
                <tr>
                    <th>Item</th>
                    <th>NOs</th>
                    <th>Price</th>
                    <th>Total</th>
                    <th></th>
                </tr>
            </thead>
            <tbody>
                ${itemsHtml}
            </tbody>
        </table>
        <button class="clear-cart-btn">Clear Cart</button>
    `;

    // Event listeners for cart page
    document.querySelectorAll('.remove-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            removeFromCart(parseInt(btn.dataset.id));
        });
    });

    document.querySelector('.clear-cart-btn')?.addEventListener('click', () => {
        localStorage.removeItem('cart');
        renderCart();
        updateBadge();
    });

    updateTotals(subtotal);
}

function updateTotals(subtotal) {
    const delivery = 10;
    const platform = 10;
    const grandTotal = subtotal + delivery + platform;

    const totalsEl = document.querySelector('.cart-totals');
    if (totalsEl) {
        totalsEl.innerHTML = `
            <div class="total-row">
                <span>Subtotal</span>
                <span>₹${subtotal.toFixed(0)}</span>
            </div>
            <div class="total-row">
                <span>Delivery</span>
                <span>₹${delivery}</span>
            </div>
            <div class="total-row">
                <span>Platform Fee</span>
                <span>₹${platform}</span>
            </div>
            <hr>
            <div class="grand-total">
                <span>Total</span>
                <span>₹${grandTotal.toFixed(0)}</span>
            </div>
        `;
    }
}

// Init on DOM load
document.addEventListener('DOMContentLoaded', () => {
    updateBadge();
    
    if (document.querySelector('.products-category')) {
        // index.html - init products
        initProducts();
    } else if (document.querySelector('.cart-container')) {
        // cart.html - render cart
        renderCart();
    }
});


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
    const cartBadge = document.querySelector('.badge-yellow');
    if (cartBadge) {
        const count = cart.reduce((sum, item) => sum + item.qty, 0);
        cartBadge.textContent = count || '0';
        cartBadge.classList.toggle('badge-pop', count > 0);
    }
    updateFloatingCart();
}


function updateFloatingCart() {
    const cart = getCart();
    const totalItems = cart.reduce((sum, item) => sum + item.qty, 0);
    const totalPrice = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    
    const cartElement = document.getElementById('floatingCart');
    if (!cartElement) return;
    
    const countDisplay = document.getElementById('itemCountDisplay');
    const priceDisplay = document.getElementById('totalPriceDisplay');
    
    if (countDisplay) countDisplay.innerText = totalItems;
    if (priceDisplay) priceDisplay.innerText = Math.round(totalPrice);
    
    if (totalItems > 0) {
        cartElement.classList.add('active');
    } else {
        cartElement.classList.remove('active');
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
    const itemsContainer = document.getElementById('cartItemsContainer');
    const itemCountEl = document.getElementById('cartItemCount');
    const subtotalEl = document.getElementById('cartSubtotal');
    const grandTotalEl = document.getElementById('grandTotal');
    const subtotalAmountEl = document.getElementById('subtotalAmount');
    const checkoutBtn = document.getElementById('checkoutBtn');
    const clearBtn = document.getElementById('clearCartBtn');
    
    if (!itemsContainer) return;

    const cart = getCart();
    const subtotal = getCartTotal();
    const itemCount = cart.reduce((sum, item) => sum + item.qty, 0);
    const delivery = 10;
    const platform = 10;
    const grandTotal = subtotal + delivery + platform;

    // Update stats
    itemCountEl.textContent = `${itemCount} items`;
    subtotalEl.textContent = `₹${subtotal.toFixed(0)}`;
    grandTotalEl.textContent = `₹${grandTotal.toFixed(0)}`;
    subtotalAmountEl.textContent = `₹${subtotal.toFixed(0)}`;

    if (cart.length === 0) {
        itemsContainer.innerHTML = `
            <div class="empty-cart">
                <img src="empty cart.jpeg" alt="Empty Cart" class="empty-cart-image">
                <h2>Your cart is empty</h2>
                <p>Add some fresh dairy products to get started!</p>
                <a href="index.html" class="continue-btn">Continue Shopping</a>
            </div>
        `;
        checkoutBtn.style.display = 'none';
        clearBtn.style.display = 'none';
        return;
    }

    // Show buttons
    checkoutBtn.style.display = 'block';
    clearBtn.style.display = 'inline-flex';

    // Render items as cards
    const itemsHtml = cart.map(item => {
        const itemTotal = item.price * item.qty;
        return `
            <div class="cart-item-card" data-id="${item.id}">
                <img src="https://via.placeholder.com/120x120/EEF2F7/6B7280?text=${encodeURIComponent(item.name.split(' ')[0])}" 
                     alt="${item.name}" class="cart-item-image">
                <div class="cart-item-details">
                    <h3>${item.name}</h3>
                    <div class="cart-item-price">₹${item.price.toFixed(0)}</div>
                </div>
                <div class="cart-item-controls">
                    <div class="quantity-controls">
                        <button class="qty-btn decrement" data-id="${item.id}">-</button>
                        <span class="qty">${item.qty}</span>
                        <button class="qty-btn increment" data-id="${item.id}">+</button>
                    </div>
                    <div>₹${itemTotal.toFixed(0)}</div>
                    <button class="remove-btn" data-id="${item.id}">×</button>
                </div>
            </div>
        `;
    }).join('');

    itemsContainer.innerHTML = itemsHtml;

    // Event listeners
    itemsContainer.querySelectorAll('.remove-btn').forEach(btn => {
        btn.addEventListener('click', () => removeFromCart(parseInt(btn.dataset.id)));
    });

    itemsContainer.querySelectorAll('.qty-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = parseInt(btn.dataset.id);
            const delta = btn.classList.contains('increment') ? 1 : -1;
            updateQty(id, delta);
        });
    });

    clearBtn.addEventListener('click', () => {
        localStorage.removeItem('cart');
        renderCart();
        updateBadge();
    });

    checkoutBtn.addEventListener('click', () => {
        alert('Checkout coming soon! Total: ₹' + grandTotal.toFixed(0));
    });
}

function updateTotals(subtotal) {
    const delivery = 10;
    const platform = 10;
    const grandTotal = subtotal + delivery + platform;

    const totalsEl = document.querySelector('.cart-totals-below');
    if (totalsEl) {
        // Show cart-totals when there are items
        if (subtotal > 0) {
            totalsEl.style.display = 'block';
        }
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
    updateFloatingCart();

    
    if (document.querySelector('.products-category')) {
        // index.html - init products
        initProducts();
    } else if (document.querySelector('.cart-container')) {
        // cart.html - render cart
        renderCart();
    }
});


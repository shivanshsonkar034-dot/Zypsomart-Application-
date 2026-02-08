import { db, auth } from './firebase.js';
import { 
    collection, 
    onSnapshot, 
    addDoc, 
    serverTimestamp, 
    query, 
    orderBy 
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";
import { 
    signInWithEmailAndPassword, 
    onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";

// State
let cart = [];
let allProducts = [];
let currentUser = null;
let selectedVillageCharge = 0;
let selectedVillageName = "";

// Elements
const productDisplay = document.getElementById('product-display');
const cartCount = document.getElementById('cart-count');
const cartSidebar = document.getElementById('cart-sidebar');
const cartItemsContainer = document.getElementById('cart-items');
const subtotalEl = document.getElementById('subtotal');
const deliveryEl = document.getElementById('delivery-charge');
const totalEl = document.getElementById('total-amount');
const villageSelect = document.getElementById('cust-village');
const searchInput = document.getElementById('search-input');

// Initialize App
onAuthStateChanged(auth, (user) => {
    currentUser = user;
    const authBtn = document.getElementById('auth-btn');
    if (user) {
        authBtn.innerHTML = `<i class="fas fa-user-check"></i>`;
        if (user.email === 'admin@zypso.com') {
            // Option to go to admin if admin logs in
            authBtn.onclick = () => window.location.href = 'admin.html';
        }
    } else {
        authBtn.innerHTML = `<i class="fas fa-user"></i>`;
        authBtn.onclick = () => document.getElementById('auth-modal').style.display = 'flex';
    }
});

// Load Villages
onSnapshot(query(collection(db, "villages"), orderBy("name", "asc")), (snapshot) => {
    villageSelect.innerHTML = '<option value="" data-charge="0">Select Village</option>';
    snapshot.forEach(doc => {
        const v = doc.data();
        const option = document.createElement('option');
        option.value = v.name;
        option.dataset.charge = v.deliveryCharge;
        option.textContent = `${v.name} (₹${v.deliveryCharge})`;
        villageSelect.appendChild(option);
    });
});

// Village Change Handler
villageSelect.addEventListener('change', (e) => {
    const selectedOption = e.target.options[e.target.selectedIndex];
    selectedVillageCharge = parseFloat(selectedOption.dataset.charge) || 0;
    selectedVillageName = e.target.value;
    updateCartUI();
});

// Load Products
onSnapshot(query(collection(db, "products"), orderBy("createdAt", "desc")), (snapshot) => {
    allProducts = [];
    snapshot.forEach(doc => allProducts.push({ id: doc.id, ...doc.data() }));
    renderProducts(allProducts);
});

function renderProducts(products) {
    productDisplay.innerHTML = '';
    products.forEach(p => {
        const card = document.createElement('div');
        card.className = 'product-card animate-in';
        card.innerHTML = `
            <div class="img-container">
                <img src="${p.image}" alt="${p.name}">
            </div>
            <div class="p-info">
                <h3>${p.name}</h3>
                <p class="unit">${p.unit}</p>
                <div class="price-row">
                    <span class="price">₹${p.price}</span>
                    <button onclick="addToCart('${p.id}')" class="add-btn"><i class="fas fa-plus"></i></button>
                </div>
            </div>
        `;
        productDisplay.appendChild(card);
    });
}

// Search Logic
searchInput.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    const filtered = allProducts.filter(p => p.name.toLowerCase().includes(term));
    renderProducts(filtered);
});

// Category Logic
document.querySelectorAll('.cat-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelector('.cat-btn.active').classList.remove('active');
        btn.classList.add('active');
        const cat = btn.dataset.category;
        const filtered = cat === 'All' ? allProducts : allProducts.filter(p => p.category === cat);
        renderProducts(filtered);
    });
});

// Cart Logic
window.addToCart = (id) => {
    const prod = allProducts.find(p => p.id === id);
    const existing = cart.find(item => item.id === id);
    if (existing) {
        existing.quantity += 1;
    } else {
        cart.push({ ...prod, quantity: 1 });
    }
    updateCartUI();
};

window.removeFromCart = (id) => {
    cart = cart.filter(item => item.id !== id);
    updateCartUI();
};

function updateCartUI() {
    cartCount.innerText = cart.reduce((acc, item) => acc + item.quantity, 0);
    cartItemsContainer.innerHTML = '';
    
    let subtotal = 0;
    cart.forEach(item => {
        subtotal += item.price * item.quantity;
        const div = document.createElement('div');
        div.className = 'cart-item';
        div.innerHTML = `
            <span>${item.name} (x${item.quantity})</span>
            <span>₹${item.price * item.quantity}</span>
            <button onclick="removeFromCart('${item.id}')"><i class="fas fa-trash"></i></button>
        `;
        cartItemsContainer.appendChild(div);
    });

    subtotalEl.innerText = `₹${subtotal}`;
    deliveryEl.innerText = `₹${selectedVillageCharge}`;
    totalEl.innerText = `₹${subtotal + selectedVillageCharge}`;
}

// Checkout Logic
document.getElementById('checkout-btn').addEventListener('click', async () => {
    if (!currentUser) {
        alert("Please login to place order");
        document.getElementById('auth-modal').style.display = 'flex';
        return;
    }
    if (cart.length === 0) return alert("Cart is empty");
    if (!selectedVillageName) return alert("Please select a village for delivery");
    
    const address = document.getElementById('cust-address').value;
    if (!address) return alert("Please enter delivery address");

    const orderData = {
        userId: currentUser.uid,
        customerName: currentUser.email.split('@')[0],
        items: cart,
        subtotal: cart.reduce((acc, i) => acc + (i.price * i.quantity), 0),
        deliveryCharge: selectedVillageCharge,
        village: selectedVillageName,
        totalAmount: cart.reduce((acc, i) => acc + (i.price * i.quantity), 0) + selectedVillageCharge,
        address: address,
        status: 'pending',
        createdAt: serverTimestamp()
    };

    try {
        await addDoc(collection(db, "orders"), orderData);
        alert("Order placed successfully!");
        cart = [];
        updateCartUI();
        cartSidebar.classList.remove('open');
    } catch (e) {
        alert("Checkout error: " + e.message);
    }
});

// UI Interactions
document.getElementById('cart-toggle').onclick = () => cartSidebar.classList.add('open');
document.getElementById('close-cart').onclick = () => cartSidebar.classList.remove('open');

// Login Logic
document.getElementById('login-submit').onclick = async () => {
    const e = document.getElementById('login-email').value;
    const p = document.getElementById('login-pass').value;
    try {
        await signInWithEmailAndPassword(auth, e, p);
        document.getElementById('auth-modal').style.display = 'none';
    } catch (err) {
        alert("Auth failed: " + err.message);
    }
};

window.onclick = (event) => {
    if (event.target == document.getElementById('auth-modal')) {
        document.getElementById('auth-modal').style.display = "none";
    }
};
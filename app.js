import { auth, db } from './firebase.js';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import { collection, onSnapshot, query, where, orderBy, addDoc, doc, serverTimestamp, updateDoc } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

let currentUser = null;
let cart = [];
let allProducts = [];
let currentCategory = 'all';
let globalDeliveryCharge = 0;
let villages = [];
let searchTerm = '';
let supportNumber = "8090315246"; // Default number

// --- AUTHENTICATION LOGIC ---
const authModal = document.getElementById('auth-modal');
const authBtn = document.getElementById('auth-btn');
const authActionBtn = document.getElementById('auth-action-btn');
const authSwitch = document.getElementById('auth-switch');
let isLoginMode = true;

onAuthStateChanged(auth, (user) => {
    currentUser = user;
    const myOrdersBtn = document.getElementById('my-orders-btn');
    if (user) {
        authBtn.innerHTML = "🚪"; // Logout Icon
        myOrdersBtn.style.display = "flex";
    } else {
        authBtn.innerHTML = "👤"; // Login Icon
        myOrdersBtn.style.display = "none";
    }
});

// Login Button Click Handler
authBtn.onclick = () => {
    if (currentUser) {
        if (confirm("Do you want to logout?")) signOut(auth);
    } else {
        authModal.classList.add('active');
    }
};

// Switch between Login and Signup
if(authSwitch) {
    authSwitch.onclick = () => {
        isLoginMode = !isLoginMode;
        document.getElementById('auth-title').innerText = isLoginMode ? "Login to Zypsomart" : "Create Account";
        authActionBtn.innerText = isLoginMode ? "Login Now" : "Register Now";
        authSwitch.innerText = isLoginMode ? "New User? Create an Account" : "Already have an account? Login";
    };
}

// Login/Signup Process
if(authActionBtn) {
    authActionBtn.onclick = async () => {
        const email = document.getElementById('auth-email').value;
        const pass = document.getElementById('auth-pass').value;

        if(!email || !pass) return alert("Please enter email and password");

        try {
            if (isLoginMode) {
                await signInWithEmailAndPassword(auth, email, pass);
                alert("Login Successful!");
            } else {
                await createUserWithEmailAndPassword(auth, email, pass);
                alert("Account Created Successfully!");
            }
            authModal.classList.remove('active');
        } catch (error) {
            alert("Error: " + error.message);
        }
    };
}

// --- REAL-TIME DATA LISTENERS ---

// 1. Shop Status & Support Contact
onSnapshot(doc(db, "shopControl", "status"), (docSnap) => {
    if(docSnap.exists()) {
        const d = docSnap.data();
        globalDeliveryCharge = d.deliveryCharge || 0;
        supportNumber = d.supportNumber || "8090315246";
        
        // Shop Status Overlay
        const overlay = document.getElementById('shop-closed-overlay');
        overlay.style.display = d.isClosed ? 'flex' : 'none';
        
        // Contact Button Logic
        const contactBtn = document.getElementById('contact-btn');
        if(contactBtn) {
            contactBtn.onclick = () => window.open(`tel:${supportNumber}`);
        }
    }
});

// 2. Banner Listener
onSnapshot(doc(db, "shopControl", "banner"), (docSnap) => {
    const bannerContainer = document.getElementById('banner-container');
    const promoBanner = document.getElementById('promo-banner');
    if(docSnap.exists()){
        const b = docSnap.data();
        if(b.active && b.url) {
            promoBanner.src = b.url;
            bannerContainer.style.display = 'block';
        } else {
            bannerContainer.style.display = 'none';
        }
    }
});

// 3. Villages Listener (For Delivery)
onSnapshot(collection(db, "villages"), (snap) => {
    villages = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const select = document.getElementById('cust-village');
    select.innerHTML = `<option value="">Choose Village</option>`;
    villages.forEach(v => {
        select.innerHTML += `<option value="${v.id}">${v.name} (Charge: ₹${v.charge})</option>`;
    });
});

// 4. Products & Categories
onSnapshot(collection(db, "categories"), (snap) => {
    const list = document.getElementById('category-list');
    list.innerHTML = `<div class="category-item ${currentCategory === 'all' ? 'active' : ''}" onclick="window.filterCat('all')">All</div>`;
    snap.forEach(doc => {
        const cat = doc.data();
        list.innerHTML += `<div class="category-item ${currentCategory === cat.name ? 'active' : ''}" onclick="window.filterCat('${cat.name}')">${cat.name}</div>`;
    });
});

onSnapshot(query(collection(db, "products"), orderBy("createdAt", "desc")), (snap) => {
    allProducts = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    renderProducts();
});

// --- CORE FUNCTIONS ---

window.filterCat = (cat) => {
    currentCategory = cat;
    renderProducts();
    // Update active class in UI
    document.querySelectorAll('.category-item').forEach(el => {
        el.classList.toggle('active', el.innerText.toLowerCase() === cat.toLowerCase() || (cat === 'all' && el.innerText === 'All'));
    });
};

document.getElementById('product-search').oninput = (e) => {
    searchTerm = e.target.value.toLowerCase();
    renderProducts();
};

function renderProducts() {
    const grid = document.getElementById('product-grid');
    grid.innerHTML = '';
    
    const filtered = allProducts.filter(p => {
        const matchesCat = currentCategory === 'all' || p.category === currentCategory;
        const matchesSearch = p.name.toLowerCase().includes(searchTerm);
        return matchesCat && matchesSearch;
    });

    filtered.forEach(p => {
        const isInCart = cart.find(item => item.id === p.id);
        const card = document.createElement('div');
        card.className = 'product-card';
        card.innerHTML = `
            <img src="${p.imageUrl || 'https://via.placeholder.com/150'}" class="product-img">
            <div class="product-info">
                <h3 class="product-name">${p.name}</h3>
                <p class="product-price">₹${p.price} <small>/ ${p.unit}</small></p>
                ${p.status === 'Available' 
                    ? `<button onclick="window.addToCart('${p.id}')" class="btn-primary" style="width:100%">${isInCart ? 'Added ✅' : 'Add to Cart'}</button>`
                    : `<button class="btn-secondary" style="width:100%" disabled>Out of Stock</button>`}
            </div>
        `;
        grid.appendChild(card);
    });
}

// --- CART LOGIC ---

window.addToCart = (id) => {
    const product = allProducts.find(p => p.id === id);
    const existing = cart.find(item => item.id === id);
    if(existing) {
        existing.qty++;
    } else {
        cart.push({ ...product, qty: 1 });
    }
    updateCartUI();
    renderProducts();
};

window.updateQty = (id, delta) => {
    const item = cart.find(i => i.id === id);
    item.qty += delta;
    if(item.qty < 1) cart = cart.filter(i => i.id !== id);
    updateCartUI();
    renderProducts();
};

window.updateCartUI = () => {
    const container = document.getElementById('cart-items');
    const countEl = document.getElementById('cart-count');
    const totalEl = document.getElementById('cart-total');
    
    container.innerHTML = '';
    let subtotal = 0;
    
    cart.forEach(item => {
        subtotal += (item.price * item.qty);
        container.innerHTML += `
            <div class="cart-item">
                <div>
                    <div style="font-weight:600">${item.name}</div>
                    <div style="font-size:12px; color:#666">₹${item.price} x ${item.qty}</div>
                </div>
                <div class="qty-control">
                    <button onclick="window.updateQty('${item.id}', -1)">-</button>
                    <span>${item.qty}</span>
                    <button onclick="window.updateQty('${item.id}', 1)">+</button>
                </div>
            </div>
        `;
    });

    const villageId = document.getElementById('cust-village').value;
    const village = villages.find(v => v.id === villageId);
    const delivery = village ? village.charge : 0;
    
    countEl.innerText = cart.length;
    totalEl.innerText = `₹${subtotal + delivery}`;
};

window.toggleCart = () => {
    document.getElementById('cart-sidebar').classList.toggle('active');
};

// --- CHECKOUT / ORDER LOGIC ---

document.getElementById('checkout-btn').onclick = async () => {
    if(!currentUser) {
        authModal.classList.add('active');
        return alert("Please login to place an order");
    }
    if(cart.length === 0) return alert("Your cart is empty");
    
    const name = document.getElementById('cust-name').value;
    const phone = document.getElementById('cust-phone').value;
    const villageId = document.getElementById('cust-village').value;
    const address = document.getElementById('cust-address').value;

    if(!name || !phone || !villageId || !address) return alert("Please fill delivery details");

    const village = villages.find(v => v.id === villageId);
    let subtotal = 0;
    cart.forEach(i => subtotal += (i.price * i.qty));
    const total = subtotal + village.charge;

    const orderData = {
        userId: currentUser.uid,
        customerName: name,
        customerPhone: phone,
        customerAddress: `${address}, Village: ${village.name}`,
        items: cart,
        total: total,
        status: 'pending',
        createdAt: serverTimestamp()
    };

    try {
        await addDoc(collection(db, "orders"), orderData);
        
        // WhatsApp Message Format
        const itemDetails = cart.map(i => `${i.name} (${i.qty} ${i.unit}) - ₹${i.price * i.qty}`).join('%0A');
        const msg = `*New Order from ZYPSOMART*%0A%0A*Name:* ${name}%0A*Phone:* ${phone}%0A*Village:* ${village.name}%0A*Address:* ${address}%0A%0A*Items:*%0A${itemDetails}%0A%0A*Delivery:* ₹${village.charge}%0A*Total Amount: ₹${total}*%0A%0A_Please confirm my order!_`;
        
        window.open(`https://wa.me/91${supportNumber}?text=${msg}`);
        
        cart = [];
        updateCartUI();
        toggleCart();
        alert("Order Placed Successfully!");
    } catch (e) {
        alert("Error: " + e.message);
    }
};

// Initialize
window.filterCat('all');
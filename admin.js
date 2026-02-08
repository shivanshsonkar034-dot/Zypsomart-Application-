import { db, auth } from './firebase.js';
import { 
    collection, 
    addDoc, 
    onSnapshot, 
    deleteDoc, 
    doc, 
    query, 
    orderBy, 
    serverTimestamp 
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";

// Check Auth
onAuthStateChanged(auth, (user) => {
    if (!user) {
        window.location.href = 'index.html';
    }
});

// Logout
document.getElementById('logout-btn').addEventListener('click', () => {
    signOut(auth);
});

// Elements
const productForm = document.getElementById('product-form');
const villageForm = document.getElementById('village-form');
const productList = document.getElementById('admin-product-list');
const villageList = document.getElementById('village-list');
const ordersList = document.getElementById('admin-orders-list');
const totalOrdersLabel = document.getElementById('total-orders');
const totalProductsLabel = document.getElementById('total-products');

// --- Product Logic ---
productForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const product = {
        name: document.getElementById('prod-name').value,
        price: parseFloat(document.getElementById('prod-price').value),
        unit: document.getElementById('prod-unit').value,
        image: document.getElementById('prod-img').value,
        category: document.getElementById('prod-category').value,
        createdAt: serverTimestamp()
    };

    try {
        await addDoc(collection(db, "products"), product);
        productForm.reset();
        alert("Product added successfully!");
    } catch (error) {
        console.error("Error adding product: ", error);
    }
});

// Real-time Products
onSnapshot(query(collection(db, "products"), orderBy("createdAt", "desc")), (snapshot) => {
    productList.innerHTML = '';
    totalProductsLabel.innerText = snapshot.size;
    snapshot.forEach((docSnap) => {
        const p = docSnap.data();
        const div = document.createElement('div');
        div.className = 'admin-item-card';
        div.innerHTML = `
            <img src="${p.image}" alt="${p.name}">
            <div class="info">
                <h4>${p.name}</h4>
                <p>₹${p.price} / ${p.unit}</p>
            </div>
            <button onclick="deleteProduct('${docSnap.id}')" class="btn-delete"><i class="fas fa-trash"></i></button>
        `;
        productList.appendChild(div);
    });
});

window.deleteProduct = async (id) => {
    if(confirm("Delete this product?")) {
        await deleteDoc(doc(db, "products", id));
    }
};

// --- Village Logic ---
villageForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const village = {
        name: document.getElementById('vill-name').value,
        distance: parseFloat(document.getElementById('vill-dist').value),
        deliveryCharge: parseFloat(document.getElementById('vill-charge').value),
        createdAt: serverTimestamp()
    };

    try {
        await addDoc(collection(db, "villages"), village);
        villageForm.reset();
        alert("Village added!");
    } catch (error) {
        console.error("Error adding village: ", error);
    }
});

onSnapshot(query(collection(db, "villages"), orderBy("name", "asc")), (snapshot) => {
    villageList.innerHTML = '';
    snapshot.forEach((docSnap) => {
        const v = docSnap.data();
        const div = document.createElement('div');
        div.className = 'admin-item-card village-item';
        div.innerHTML = `
            <div class="info">
                <h4>${v.name}</h4>
                <p>${v.distance} km - Delivery Charge: ₹${v.deliveryCharge}</p>
            </div>
            <button onclick="deleteVillage('${docSnap.id}')" class="btn-delete"><i class="fas fa-trash"></i></button>
        `;
        villageList.appendChild(div);
    });
});

window.deleteVillage = async (id) => {
    if(confirm("Delete this village?")) {
        await deleteDoc(doc(db, "villages", id));
    }
};

// --- Orders Logic ---
onSnapshot(query(collection(db, "orders"), orderBy("createdAt", "desc")), (snapshot) => {
    ordersList.innerHTML = '';
    totalOrdersLabel.innerText = snapshot.size;
    snapshot.forEach((docSnap) => {
        const o = docSnap.data();
        const date = o.createdAt ? o.createdAt.toDate().toLocaleString() : 'Just now';
        const div = document.createElement('div');
        div.className = 'order-card';
        div.innerHTML = `
            <div class="order-header">
                <strong>ID: ${docSnap.id.slice(-6).toUpperCase()}</strong>
                <span>${date}</span>
            </div>
            <div class="order-details">
                <p><strong>Customer:</strong> ${o.customerName}</p>
                <p><strong>Village:</strong> ${o.village || 'Not Selected'}</p>
                <p><strong>Address:</strong> ${o.address}</p>
                <p><strong>Total:</strong> ₹${o.totalAmount} (Delivery: ₹${o.deliveryCharge})</p>
            </div>
            <div class="order-items">
                ${o.items.map(item => `<span>${item.name} x ${item.quantity}</span>`).join(', ')}
            </div>
            <button onclick="deleteOrder('${docSnap.id}')" class="btn-delete-order">Complete / Delete</button>
        `;
        ordersList.appendChild(div);
    });
});

window.deleteOrder = async (id) => {
    if(confirm("Mark as completed and remove?")) {
        await deleteDoc(doc(db, "orders", id));
    }
};
import { auth, db } from './firebase.js';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import { collection, onSnapshot, query, orderBy, getDocs } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

let currentUser = null;

document.addEventListener('DOMContentLoaded', () => {
    // 1. ELEMENTS SELECTING
    const authBtn = document.getElementById('auth-btn');
    const authModal = document.getElementById('auth-modal');
    const closeAuth = document.getElementById('close-auth');
    const authForm = document.getElementById('auth-form');
    const productGrid = document.getElementById('product-grid');
    const myOrdersBtn = document.getElementById('my-orders-btn');
    const contactBtn = document.getElementById('contact-btn');

    // 2. LOAD PRODUCTS FROM FIRESTORE
    function loadProducts() {
        const q = query(collection(db, "products"), orderBy("createdAt", "desc"));
        
        onSnapshot(q, (snapshot) => {
            if (snapshot.empty) {
                productGrid.innerHTML = "<p style='grid-column:1/-1; text-align:center;'>No products found. Please add from Admin.</p>";
                return;
            }

            productGrid.innerHTML = snapshot.docs.map(doc => {
                const p = doc.data();
                return `
                    <div class="product-card">
                        <img src="${p.imageUrl || 'https://via.placeholder.com/150'}" alt="${p.name}">
                        <div class="product-info">
                            <h4 style="margin:5px 0;">${p.name}</h4>
                            <p style="color:var(--primary); font-weight:bold;">₹${p.price} / ${p.unit}</p>
                            <button class="btn-primary" style="width:100%; font-size:12px; padding:8px;" onclick="alert('Add to Cart feature coming soon!')">Add to Cart</button>
                        </div>
                    </div>
                `;
            }).join('');
        });
    }

    // 3. AUTHENTICATION LOGIC
    onAuthStateChanged(auth, (user) => {
        currentUser = user;
        if (user) {
            authBtn.innerHTML = "Logout"; 
            authBtn.style.fontSize = "12px";
            myOrdersBtn.style.display = "flex";
        } else {
            authBtn.innerHTML = "👤"; 
            myOrdersBtn.style.display = "none";
        }
    });

    authBtn.addEventListener('click', () => {
        if (currentUser) {
            if (confirm("Logout karna chahte hain?")) signOut(auth);
        } else {
            authModal.classList.add('active');
        }
    });

    closeAuth.onclick = () => authModal.classList.remove('active');

    // 4. LOGIN / REGISTER FORM
    authForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('auth-email').value;
        const pass = document.getElementById('auth-password').value;
        const isLogin = document.getElementById('modal-title').innerText === "Login";

        try {
            if (isLogin) {
                await signInWithEmailAndPassword(auth, email, pass);
                alert("Welcome back!");
            } else {
                await createUserWithEmailAndPassword(auth, email, pass);
                alert("Account Created!");
            }
            authModal.classList.remove('active');
        } catch (err) {
            alert("Error: " + err.message);
        }
    });

    // Switch between Login and Register
    document.getElementById('switch-mode').onclick = () => {
        const title = document.getElementById('modal-title');
        const submitBtn = document.getElementById('auth-submit');
        const switchTxt = document.getElementById('switch-mode');
        
        if (title.innerText === "Login") {
            title.innerText = "Register";
            submitBtn.innerText = "Register";
            switchTxt.innerText = "Have an account? Login";
        } else {
            title.innerText = "Login";
            submitBtn.innerText = "Submit";
            switchTxt.innerText = "New? Register";
        }
    };

    // 5. CONTACT LOGIC
    contactBtn.addEventListener('click', () => {
        window.open('https://wa.me/918090315246', '_blank');
    });

    // 6. INITIALIZE
    loadProducts();
});
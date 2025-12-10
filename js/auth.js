import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

console.log("Auth script loading...");

const firebaseConfig = {
    apiKey: "AIzaSyAVF0VNF_A3CQV_JXcB-fx7LtJ99GgKUhw",
    authDomain: "inicio-perfumichi.firebaseapp.com",
    projectId: "inicio-perfumichi",
    storageBucket: "inicio-perfumichi.firebasestorage.app",
    messagingSenderId: "766706966554",
    appId: "1:766706966554:web:7e6df65dcd7f9e782cf1a3",
    measurementId: "G-NEJNNXGBT9"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

// Export auth and db for use in other files
export { auth, db };

// EmailJS is now initialized in the HTML file before this script loads

// EmailJS Configuration
const EMAILJS_CONFIG = {
    serviceId: 'service_ggdmrop',
    adminTemplateId: 'template_4z854ye',
    userTemplateId: 'template_gd8iqai',
    adminEmail: 'avsenseinformativo@gmail.com'
};

/**
 * Send email notifications to both admin and user
 * @param {Object} params - Email parameters
 * @param {string} params.userName - Name of the user
 * @param {string} params.userEmail - Email of the user
 * @param {string} params.actionType - Type of action (registro, login)
 * @param {string} params.authMethod - Authentication method (Email/Password, Google)
 */
async function sendEmailNotification({ userName, userEmail, actionType, authMethod }) {
    const timestamp = new Date().toLocaleString('es-ES', {
        dateStyle: 'full',
        timeStyle: 'short'
    });

    // Parameters for both emails
    const emailParams = {
        user_name: userName,
        user_email: userEmail,
        action_type: actionType,
        auth_method: authMethod,
        timestamp: timestamp,
        to_email: userEmail // For user email
    };

    // Parameters for admin email
    const adminParams = {
        ...emailParams,
        to_email: EMAILJS_CONFIG.adminEmail
    };

    try {
        // Send email to admin
        const adminResponse = await emailjs.send(
            EMAILJS_CONFIG.serviceId,
            EMAILJS_CONFIG.adminTemplateId,
            adminParams
        );
        console.log('✅ Email sent to admin:', adminResponse.status);

        // Send email to user
        const userResponse = await emailjs.send(
            EMAILJS_CONFIG.serviceId,
            EMAILJS_CONFIG.userTemplateId,
            emailParams
        );
        console.log('✅ Email sent to user:', userResponse.status);

        return { success: true, adminResponse, userResponse };
    } catch (error) {
        console.error('❌ Error sending emails:', error);
        // Don't throw error - we don't want to block registration/login if email fails
        return { success: false, error };
    }
}

// UI Elements (will be selected when DOM is loaded)
let bubble, accountBtn;

document.addEventListener('DOMContentLoaded', () => {
    bubble = document.getElementById('login-bubble');
    accountBtn = document.querySelector('.account-link');

    // Close bubble when clicking outside
    document.addEventListener('click', (e) => {
        if (bubble && accountBtn && !bubble.contains(e.target) && !accountBtn.contains(e.target)) {
            bubble.classList.add('hidden');
        }
    });
});

// Toast Notification Function
function showToast(message, type = 'success') {
    // Create toast element if it doesn't exist
    let toast = document.getElementById('toast-notification');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast-notification';
        toast.className = 'toast-notification';
        document.body.appendChild(toast);
    }

    // Set content and type
    toast.textContent = message;
    toast.className = `toast-notification ${type}`;

    // Show toast
    setTimeout(() => toast.classList.add('show'), 10);

    // Hide after 3 seconds
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Toggle Bubble
window.toggleLoginBubble = (e) => {
    if (e) e.preventDefault();
    if (bubble) bubble.classList.toggle('hidden');
};

// Toggle Form (Login <-> Register)
window.toggleBubbleForm = () => {
    const loginForm = document.getElementById('bubble-login-form');
    const regForm = document.getElementById('bubble-register-form');
    const title = document.getElementById('bubble-title');
    const msg = document.getElementById('bubble-switch-msg');
    const action = document.getElementById('bubble-switch-action');

    if (loginForm.classList.contains('hidden')) {
        // Show Login
        loginForm.classList.remove('hidden');
        regForm.classList.add('hidden');
        title.textContent = "Iniciar Sesión";
        msg.textContent = "¿No tienes cuenta?";
        action.textContent = "Regístrate";
    } else {
        // Show Register
        loginForm.classList.add('hidden');
        regForm.classList.remove('hidden');
        title.textContent = "Crear Cuenta";
        msg.textContent = "¿Ya tienes cuenta?";
        action.textContent = "Inicia Sesión";
    }
};

// Handle Login
window.handleBubbleLogin = async (e) => {
    e.preventDefault();

    // Try to get values from Bubble OR Modal
    const email = document.getElementById('bubble-email')?.value || document.getElementById('modal-email')?.value;
    const password = document.getElementById('bubble-password')?.value || document.getElementById('modal-password')?.value;

    if (!email || !password) {
        showToast("Error: No se ha introducido email o contraseña", "error");
        return;
    }

    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        showToast("¡Sesión iniciada correctamente!", "success");

        // Fetch user data (optional, but good for verifying existence)
        const docRef = doc(db, "users", user.uid);
        await getDoc(docRef);

    } catch (error) {
        console.error("Login Error:", error);
        showToast("Error: " + error.message, "error");
    }
};

// Handle Register
window.handleBubbleRegister = async (e) => {
    e.preventDefault();

    // Try to get values from Bubble OR Modal
    const name = document.getElementById('bubble-reg-name')?.value || document.getElementById('modal-reg-name')?.value;
    const email = document.getElementById('bubble-reg-email')?.value || document.getElementById('modal-reg-email')?.value;
    const password = document.getElementById('bubble-reg-password')?.value || document.getElementById('modal-reg-password')?.value;

    if (!name || !email || !password) {
        showToast("Error: Faltan datos de registro", "error");
        return;
    }

    try {
        // 1. Create Firebase User
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        showToast("¡Cuenta creada exitosamente!", "success");

        // 2. Send Email Notifications FIRST (most important)
        console.log("📧 Enviando correo de bienvenida...");
        try {
            const emailResult = await sendEmailNotification({
                userName: name,
                userEmail: email,
                actionType: 'registro',
                authMethod: 'Email/Password'
            });

            if (emailResult.success) {
                console.log('✅ Emails de registro enviados correctamente');
                showToast("📧 Correo de bienvenida enviado", "success");
            } else {
                console.error('❌ Error enviando email:', emailResult.error);
                showToast("⚠️ Error enviando correo", "error");
            }
        } catch (emailError) {
            console.error('❌ Exception enviando email:', emailError);
            showToast("⚠️ Error enviando correo", "error");
        }

        // 3. Save User to Firestore (secondary, best effort)
        try {
            await setDoc(doc(db, "users", user.uid), {
                name: name,
                email: email,
                role: "user",
                createdAt: new Date(),
                membershipLevel: "MEMBER",
                points: 10
            });
            console.log("✅ Usuario guardado en Firestore");
        } catch (firestoreError) {
            console.error("❌ Firestore Error:", firestoreError);
            // Not critical - user is already authenticated
        }

    } catch (error) {
        console.error("Registration Error:", error);
        showToast("Error al registrar: " + error.message, "error");
    }
};

// Handle Google
window.handleBubbleGoogleLogin = async () => {
    try {
        const result = await signInWithPopup(auth, provider);
        const user = result.user;

        showToast("¡Sesión iniciada con Google!", "success");

        // Check localStorage to see if we've already sent welcome email for this user
        const emailSentKey = `welcomeEmailSent_${user.uid}`;
        const alreadySentEmail = localStorage.getItem(emailSentKey);

        let isNewUser = false;

        // Try to check if user exists in Firestore
        try {
            const docRef = doc(db, "users", user.uid);
            const docSnap = await getDoc(docRef);
            isNewUser = !docSnap.exists();

            if (isNewUser) {
                console.log("New Google user detected. Creating profile...");
                await setDoc(doc(db, "users", user.uid), {
                    name: user.displayName,
                    email: user.email,
                    role: "user",
                    createdAt: new Date(),
                    membershipLevel: "MEMBER",
                    points: 10
                });
            } else {
                console.log("Existing Google user in Firestore.");
            }
        } catch (firestoreError) {
            console.error("Firestore Error:", firestoreError);
            // If Firestore fails, assume new user if we haven't sent email before
            isNewUser = !alreadySentEmail;
            console.log("Firestore failed. Assuming new user:", isNewUser);
        }

        // Send welcome email if this is a new user (or we haven't sent one before)
        if (isNewUser && !alreadySentEmail) {
            console.log("Sending welcome email for Google user...");
            try {
                const emailResult = await sendEmailNotification({
                    userName: user.displayName || 'Usuario de Google',
                    userEmail: user.email,
                    actionType: 'registro',
                    authMethod: 'Google'
                });

                if (emailResult.success) {
                    console.log('📧 Emails de registro (Google) enviados correctamente');
                    showToast("📧 Correo de bienvenida enviado", "success");
                    // Mark that we've sent the email
                    localStorage.setItem(emailSentKey, 'true');
                } else {
                    console.error('❌ Error enviando email (Google):', emailResult.error);
                    showToast("⚠️ Error enviando correo", "error");
                }
            } catch (emailError) {
                console.error('❌ Exception sending email:', emailError);
                showToast("⚠️ Error enviando correo", "error");
            }
        } else {
            console.log("Skipping welcome email (already sent or existing user).");
        }

    } catch (error) {
        console.error("Google Login Error:", error);
        showToast("Error: " + error.message, "error");
    }
};

// Auth State Listener
onAuthStateChanged(auth, (user) => {
    // Re-select elements in case they weren't ready
    if (!accountBtn) accountBtn = document.querySelector('.account-link');
    if (!bubble) bubble = document.getElementById('login-bubble');

    if (user) {
        // User is logged in
        if (accountBtn) {
            accountBtn.textContent = "MI CUENTA";
            accountBtn.href = "account.html"; // Go to dashboard on click
            accountBtn.onclick = null; // Remove toggle behavior
        }
        if (bubble) bubble.classList.add('hidden'); // Hide bubble
    } else {
        // User is logged out
        if (accountBtn) {
            accountBtn.textContent = "CUENTA";
            accountBtn.href = "#";
            accountBtn.onclick = window.toggleLoginBubble;
        }
    }
});

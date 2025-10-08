import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js';
import { 
    getAuth, 
    signOut as firebaseSignOut,
    onAuthStateChanged 
} from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js';
import { 
    getDatabase, 
    ref, 
    set,
    get
} from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-database.js';

// Configuración de Firebase
const firebaseConfig = {
    apiKey: "AIzaSyDl4P29mQwYzTyKc7NznSRgp3McN12e5D4",
    authDomain: "aura-3206b.firebaseapp.com",
    projectId: "aura-3206b",
    storageBucket: "aura-3206b.firebasestorage.app",
    messagingSenderId: "740465935339",
    appId: "1:740465935339:web:961560706b1d74faca8fae",
    measurementId: "G-DDBC4SEYF7",
    databaseURL: "https://aura-3206b-default-rtdb.firebaseio.com"
};

// ⚙️ CONFIGURACIÓN DE OAUTH - REEMPLAZA CON TUS VALORES
const OAUTH_CONFIG = {
    clientId: '740465935339-5t6lbcbl297rqo19obmiojuel4a8vk87.apps.googleusercontent.com', // De Google Cloud Console
    redirectUri: window.location.origin + '/callback.html',
    scopes: [
        'email',
        'profile',
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/gmail.send',
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/calendar.events',
        'https://www.googleapis.com/auth/drive.file',
        'https://www.googleapis.com/auth/drive',
        'https://www.googleapis.com/auth/spreadsheets'
    ],
    // URL de tu Cloud Function
    exchangeCodeUrl: 'https://REGION-PROJECT.cloudfunctions.net/exchangeCode'
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const database = getDatabase(app);

// Referencias a elementos del DOM
const loginSection = document.getElementById('loginSection');
const userInfo = document.getElementById('userInfo');
const loading = document.getElementById('loading');
const errorMessage = document.getElementById('errorMessage');
const userAvatar = document.getElementById('userAvatar');
const userName = document.getElementById('userName');
const userEmail = document.getElementById('userEmail');

function showLoading(message = 'Cargando...') {
    loading.textContent = message;
    loading.style.display = 'block';
    errorMessage.style.display = 'none';
}

function hideLoading() {
    loading.style.display = 'none';
}

function showError(message) {
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
    hideLoading();
}

function showLogin() {
    loginSection.style.display = 'block';
    userInfo.style.display = 'none';
}

// ⭐ FUNCIÓN PRINCIPAL: Iniciar OAuth Flow
window.signInWithGoogle = function() {
    console.log('🚀 Iniciando flujo OAuth con Google...');
    
    // Generar state para seguridad
    const state = Math.random().toString(36).substring(2, 15);
    sessionStorage.setItem('oauth_state', state);
    
    // Construir URL de autorización de Google
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.append('client_id', OAUTH_CONFIG.clientId);
    authUrl.searchParams.append('redirect_uri', OAUTH_CONFIG.redirectUri);
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('scope', OAUTH_CONFIG.scopes.join(' '));
    authUrl.searchParams.append('access_type', 'offline'); // ⭐ CLAVE
    authUrl.searchParams.append('prompt', 'consent');
    authUrl.searchParams.append('state', state);
    
    // Redirigir a Google
    window.location.href = authUrl.toString();
};

window.signOut = async function() {
    try {
        await firebaseSignOut(auth);
        showLogin();
        console.log('✅ Sesión cerrada');
    } catch (error) {
        console.error('❌ Error al cerrar sesión:', error);
        showError('Error al cerrar sesión');
    }
};

onAuthStateChanged(auth, async (user) => {
    if (user) {
        console.log('👤 Usuario autenticado:', user.email);
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1000);
    } else {
        console.log('🔓 Usuario no autenticado');
        showLogin();
    }
    hideLoading();
});

showLoading('Verificando sesión...');
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

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const database = getDatabase(app);

// Referencias del DOM
const userAvatar = document.getElementById('userAvatar');
const userName = document.getElementById('userName');
const userEmail = document.getElementById('userEmail');
const logoutBtn = document.getElementById('logoutBtn');
const loading = document.getElementById('loading');
const successMessage = document.getElementById('successMessage');
const errorMessage = document.getElementById('errorMessage');
const configForm = document.getElementById('configForm');
const saveBtn = document.getElementById('saveBtn');

// Funcionalidad de secciones desplegables
document.querySelectorAll('.section-header').forEach(header => {
    header.addEventListener('click', () => {
        const sectionId = header.getAttribute('data-section');
        const content = document.getElementById(sectionId);
        
        // Toggle active class
        header.classList.toggle('active');
        content.classList.toggle('active');
    });
});

// Sistema de Tags
const tagsContainer = document.getElementById('tagsContainer');
const tagsInput = document.getElementById('tagsInput');
let tags = [];

function createTag(text) {
    const tag = document.createElement('div');
    tag.className = 'tag';
    tag.innerHTML = `
        <span>${text}</span>
        <span class="tag-remove">×</span>
    `;
    
    tag.querySelector('.tag-remove').addEventListener('click', () => {
        const index = tags.indexOf(text);
        if (index > -1) {
            tags.splice(index, 1);
        }
        tag.remove();
    });
    
    return tag;
}

function addTag(text) {
    text = text.trim();
    if (text && !tags.includes(text)) {
        tags.push(text);
        const tagElement = createTag(text);
        tagsContainer.insertBefore(tagElement, tagsInput);
    }
    tagsInput.value = '';
}

tagsInput.addEventListener('keydown', (e) => {
    if (e.key === ',' || e.key === 'Enter') {
        e.preventDefault();
        addTag(tagsInput.value);
    } else if (e.key === 'Backspace' && !tagsInput.value && tags.length > 0) {
        const lastTag = tags[tags.length - 1];
        tags.pop();
        tagsContainer.querySelector('.tag:last-of-type').remove();
    }
});

tagsInput.addEventListener('blur', () => {
    if (tagsInput.value.trim()) {
        addTag(tagsInput.value);
    }
});

tagsContainer.addEventListener('click', () => {
    tagsInput.focus();
});

// Funciones de UI
function showLoading() {
    loading.classList.add('show');
}

function hideLoading() {
    loading.classList.remove('show');
}

function showSuccess() {
    successMessage.classList.add('show');
    setTimeout(() => {
        successMessage.classList.remove('show');
    }, 3000);
}

function showError() {
    errorMessage.classList.add('show');
    setTimeout(() => {
        errorMessage.classList.remove('show');
    }, 3000);
}

function displayUserInfo(user) {
    // Usar un proxy de imagen o imagen por defecto
    let avatarUrl = 'https://via.placeholder.com/60';
    
    if (user.photoURL) {
        // Intenta usar la imagen de Google, pero con manejo de errores
        avatarUrl = user.photoURL;
        
        // Agregar evento de error para fallback
        userAvatar.onerror = () => {
            userAvatar.src = 'https://ui-avatars.com/api/?name=' + 
                encodeURIComponent(user.displayName || 'Usuario') + 
                '&background=667eea&color=fff&size=50';
        };
    }
    
    userAvatar.src = avatarUrl;
    userName.textContent = user.displayName || 'Usuario';
    userEmail.textContent = user.email;
}

// Cargar configuración existente
async function loadConfig(userId) {
    try {
        showLoading();
        const configRef = ref(database, `users/${userId}/config`);
        const snapshot = await get(configRef);
        
        if (snapshot.exists()) {
            const data = snapshot.val();
            document.getElementById('nameAgent').value = data.name_agent || '';
            document.getElementById('nameBussi').value = data.name_bussi || '';
            document.getElementById('phoneNumber').value = data.phone_number || '';
            document.getElementById('infoBussi').value = data.info_bussi || '';
            document.getElementById('servisProduct').value = data.servis_product || '';
            document.getElementById('schedule').value = data.schedule || '';
            document.getElementById('add').value = data.add || '';
            
            // Cargar tags
            if (data.data_requests) {
                tags = [];
                tagsContainer.querySelectorAll('.tag').forEach(tag => tag.remove());
                data.data_requests.forEach(tagText => {
                    tags.push(tagText);
                    const tagElement = createTag(tagText);
                    tagsContainer.insertBefore(tagElement, tagsInput);
                });
            }
        }
        hideLoading();
    } catch (error) {
        console.error('Error al cargar configuración:', error);
        hideLoading();
    }
}

// Guardar configuración
configForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const user = auth.currentUser;
    if (!user) {
        alert('Debes iniciar sesión');
        return;
    }

    try {
        showLoading();
        saveBtn.disabled = true;

        const configData = {
            name_agent: document.getElementById('nameAgent').value,
            name_bussi: document.getElementById('nameBussi').value,
            phone_number: document.getElementById('phoneNumber').value,
            info_bussi: document.getElementById('infoBussi').value,
            servis_product: document.getElementById('servisProduct').value,
            schedule: document.getElementById('schedule').value,
            add: document.getElementById('add').value,
            data_requests: tags,
            updated_at: new Date().toISOString()
        };

        // Guardar configuración en Firebase
        const configRef = ref(database, `users/${user.uid}/config`);
        await set(configRef, configData);

        console.log('✅ Configuración guardada exitosamente');
        
        hideLoading();
        showSuccess();
        saveBtn.disabled = false;
    } catch (error) {
        console.error('Error al guardar:', error);
        hideLoading();
        showError();
        saveBtn.disabled = false;
    }
});

// Cerrar sesión
async function signOut() {
    try {
        showLoading();
        await firebaseSignOut(auth);
        window.location.href = 'login.html';
    } catch (error) {
        console.error('Error al cerrar sesión:', error);
        alert('Error al cerrar sesión');
        hideLoading();
    }
}

logoutBtn.addEventListener('click', signOut);

// Verificar autenticación
showLoading();
onAuthStateChanged(auth, async (user) => {
    if (user) {
        console.log('Usuario autenticado:', user);
        displayUserInfo(user);
        await loadConfig(user.uid);
        hideLoading();
    } else {
        console.log('Usuario no autenticado');
        window.location.href = 'login.html';
    }
});
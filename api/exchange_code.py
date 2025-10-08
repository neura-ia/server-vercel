from flask import Flask, request, jsonify
import requests
import json
import os

# ⚠️ REEMPLAZA ESTOS VALORES (o usa variables de entorno)
GOOGLE_CLIENT_ID = os.environ.get('GOOGLE_CLIENT_ID', '740465935339-5t6lbcbl297rqo19obmiojuel4a8vk87.apps.googleusercontent.com')
GOOGLE_CLIENT_SECRET = os.environ.get('GOOGLE_CLIENT_SECRET', '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')
FIREBASE_SERVICE_ACCOUNT = os.environ.get('FIREBASE_SERVICE_ACCOUNT', '{}')  # JSON como string

GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo'

# Inicializar Firebase Admin (solo una vez)
import firebase_admin
from firebase_admin import credentials, auth

if not firebase_admin._apps:
    try:
        # Cargar service account desde variable de entorno
        service_account_info = json.loads(FIREBASE_SERVICE_ACCOUNT)
        cred = credentials.Certificate("api/aura-3206b-firebase-adminsdk-fbsvc-04ae7505b4.json")
        firebase_admin.initialize_app(cred)
    except Exception as e:
        print(f"Error inicializando Firebase: {e}")

app = Flask(__name__)

@app.route('/api/exchange_code', methods=['POST', 'OPTIONS'])
def exchange_code():
    """Intercambiar authorization code por tokens"""
    
    # CORS headers
    headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json'
    }
    
    # Manejar preflight
    if request.method == 'OPTIONS':
        return ('', 204, headers)
    
    try:
        # Obtener datos del request
        data = request.get_json()
        code = data.get('code')
        redirect_uri = data.get('redirectUri')
        
        if not code or not redirect_uri:
            return (jsonify({'error': 'Faltan parámetros requeridos'}), 400, headers)
        
        print(f'📨 Intercambiando code por tokens...')
        
        # 1. Intercambiar code por tokens
        token_response = requests.post(GOOGLE_TOKEN_URL, data={
            'code': code,
            'client_id': GOOGLE_CLIENT_ID,
            'client_secret': GOOGLE_CLIENT_SECRET,
            'redirect_uri': redirect_uri,
            'grant_type': 'authorization_code'
        })
        
        if token_response.status_code != 200:
            print(f'❌ Error al intercambiar code: {token_response.text}')
            return (jsonify({
                'error': 'Error al obtener tokens',
                'details': token_response.text
            }), 400, headers)
        
        tokens = token_response.json()
        print(f'✅ Tokens obtenidos')
        
        # Verificar que se obtuvo refresh_token
        if 'refresh_token' not in tokens:
            print('⚠️ No se obtuvo refresh_token')
        
        # 2. Obtener información del usuario
        userinfo_response = requests.get(
            GOOGLE_USERINFO_URL,
            headers={'Authorization': f'Bearer {tokens["access_token"]}'}
        )
        
        if userinfo_response.status_code != 200:
            return (jsonify({
                'error': 'Error al obtener información del usuario'
            }), 400, headers)
        
        user_info = userinfo_response.json()
        print(f'✅ Info de usuario obtenida: {user_info.get("email")}')
        
        # 3. Crear o actualizar usuario en Firebase Auth
        try:
            firebase_user = auth.get_user_by_email(user_info['email'])
            print(f'👤 Usuario existente: {firebase_user.uid}')
        except auth.UserNotFoundError:
            firebase_user = auth.create_user(
                email=user_info['email'],
                display_name=user_info.get('name'),
                photo_url=user_info.get('picture'),
                email_verified=user_info.get('email_verified', False)
            )
            print(f'✨ Nuevo usuario creado: {firebase_user.uid}')
        except Exception as e:
            print(f'❌ Error con Firebase Auth: {e}')
            return (jsonify({'error': f'Error Firebase: {str(e)}'}), 500, headers)
        
        # 4. Crear token personalizado de Firebase
        firebase_token = auth.create_custom_token(firebase_user.uid)
        print(f'🔑 Token de Firebase creado')
        
        # 5. Retornar todos los datos
        response_data = {
            'tokens': {
                'access_token': tokens['access_token'],
                'refresh_token': tokens.get('refresh_token'),  # ⭐ Refresh Token!
                'expires_in': tokens['expires_in'],
                'token_type': tokens['token_type']
            },
            'userInfo': {
                'email': user_info['email'],
                'name': user_info.get('name'),
                'picture': user_info.get('picture'),
                'sub': user_info['sub'],
                'email_verified': user_info.get('email_verified')
            },
            'firebaseToken': firebase_token.decode('utf-8'),
            'userId': firebase_user.uid
        }
        
        print(f'✅ Proceso completado exitosamente')
        return (jsonify(response_data), 200, headers)
        
    except Exception as e:
        print(f'❌ Error en exchange_code: {str(e)}')
        import traceback
        traceback.print_exc()
        return (jsonify({
            'error': 'Error interno del servidor',
            'details': str(e)
        }), 500, headers)

# Para Vercel
def handler(request):
    with app.test_request_context(request.get_data(), method=request.method, headers=dict(request.headers)):

        return app.full_dispatch_request()

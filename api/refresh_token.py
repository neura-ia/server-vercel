from flask import Flask, request, jsonify
import requests
import os

GOOGLE_CLIENT_ID = os.environ.get('GOOGLE_CLIENT_ID', '740465935339-5t6lbcbl297rqo19obmiojuel4a8vk87.apps.googleusercontent.com')
GOOGLE_CLIENT_SECRET = os.environ.get('GOOGLE_CLIENT_SECRET', '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')
GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'

app = Flask(__name__)

@app.route('/api/refresh_token', methods=['POST', 'OPTIONS'])
def refresh_token():
    """Renovar access token usando refresh token"""
    
    headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json'
    }
    
    if request.method == 'OPTIONS':
        return ('', 204, headers)
    
    try:
        data = request.get_json()
        refresh_token_value = data.get('refreshToken')
        
        if not refresh_token_value:
            return (jsonify({'error': 'Falta el refresh token'}), 400, headers)
        
        print(f'🔄 Renovando access token...')
        
        # Intercambiar refresh token por nuevo access token
        token_response = requests.post(GOOGLE_TOKEN_URL, data={
            'refresh_token': refresh_token_value,
            'client_id': GOOGLE_CLIENT_ID,
            'client_secret': GOOGLE_CLIENT_SECRET,
            'grant_type': 'refresh_token'
        })
        
        if token_response.status_code != 200:
            print(f'❌ Error al renovar token: {token_response.text}')
            return (jsonify({
                'error': 'Error al renovar token',
                'details': token_response.text
            }), 400, headers)
        
        new_tokens = token_response.json()
        print(f'✅ Token renovado exitosamente')
        
        return (jsonify({
            'access_token': new_tokens['access_token'],
            'expires_in': new_tokens['expires_in'],
            'token_type': new_tokens['token_type']
        }), 200, headers)
        
    except Exception as e:
        print(f'❌ Error en refresh_token: {str(e)}')
        return (jsonify({
            'error': 'Error interno del servidor',
            'details': str(e)
        }), 500, headers)

# Para Vercel
def handler(request):
    with app.test_request_context(request.get_data(), method=request.method, headers=dict(request.headers)):
        return app.full_dispatch_request()
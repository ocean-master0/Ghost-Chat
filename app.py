from flask import Flask, render_template, request, jsonify, session, send_file
from flask_socketio import SocketIO, emit, join_room, leave_room
import uuid
import secrets
import threading
import time
import os
import base64
from datetime import datetime, timedelta
from werkzeug.utils import secure_filename
from utils.chat_manager import ChatManager

app = Flask(__name__)
app.config['SECRET_KEY'] = secrets.token_hex(16)
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024  # 50MB max file size
app.config['UPLOAD_FOLDER'] = 'static/uploads/temp'

# Create upload directory if it doesn't exist
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

socketio = SocketIO(app, cors_allowed_origins="*", max_http_buffer_size=50 * 1024 * 1024)

# Initialize chat manager
chat_manager = ChatManager()

# Allowed file extensions
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp', 'svg'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/group-chat')
def group_chat():
    return render_template('group_chat.html')

@app.route('/private-chat')
def private_chat():
    return render_template('private_chat.html')

# API Routes
@app.route('/api/create-group', methods=['POST'])
def create_group():
    try:
        data = request.json
        admin_name = data.get('admin_name', 'Unknown')
        group_name = data.get('group_name', 'Untitled Group')
        
        group_id = chat_manager.create_group(admin_name, group_name)
        return jsonify({
            'success': True,
            'group_id': group_id,
            'invite_code': chat_manager.get_group_invite_code(group_id)
        })
    except Exception as e:
        print(f"Create group error: {e}")
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/join-group', methods=['POST'])
def join_group():
    try:
        data = request.json
        invite_code = data.get('invite_code')
        user_name = data.get('user_name', 'Unknown')
        
        group_id = chat_manager.join_group_by_invite(invite_code, user_name)
        if group_id:
            return jsonify({'success': True, 'group_id': group_id})
        return jsonify({'success': False, 'message': 'Invalid invite code'})
    except Exception as e:
        print(f"Join group error: {e}")
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/create-private-room', methods=['POST'])
def create_private_room():
    try:
        data = request.json
        creator_name = data.get('creator_name', 'Unknown')
        
        room_id = chat_manager.create_private_room(creator_name)
        return jsonify({
            'success': True,
            'room_id': room_id,
            'invite_code': chat_manager.get_private_room_invite_code(room_id)
        })
    except Exception as e:
        print(f"Create private room error: {e}")
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/join-private-room', methods=['POST'])
def join_private_room():
    try:
        data = request.json
        invite_code = data.get('invite_code')
        user_name = data.get('user_name', 'Unknown')
        
        room_id = chat_manager.join_private_room(invite_code, user_name)
        if room_id:
            return jsonify({'success': True, 'room_id': room_id})
        return jsonify({'success': False, 'message': 'Invalid invite code or room full'})
    except Exception as e:
        print(f"Join private room error: {e}")
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/upload-image', methods=['POST'])
def upload_image():
    try:
        if 'image' not in request.files:
            return jsonify({'success': False, 'message': 'No image file'})
        
        file = request.files['image']
        if file.filename == '':
            return jsonify({'success': False, 'message': 'No file selected'})
        
        if file and allowed_file(file.filename):
            # Check file size (50MB limit)
            file_content = file.read()
            if len(file_content) > 50 * 1024 * 1024:
                return jsonify({'success': False, 'message': 'File too large (max 50MB)'})
            
            # Generate unique filename
            filename = str(uuid.uuid4()) + '.' + file.filename.rsplit('.', 1)[1].lower()
            filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            
            # Write file
            with open(filepath, 'wb') as f:
                f.write(file_content)
            
            # Schedule file deletion after 1 minute
            def delete_file():
                time.sleep(60)
                try:
                    os.remove(filepath)
                except:
                    pass
            
            threading.Thread(target=delete_file, daemon=True).start()
            
            return jsonify({
                'success': True,
                'image_url': f'/static/uploads/temp/{filename}',
                'filename': filename
            })
        
        return jsonify({'success': False, 'message': 'Invalid file type'})
    except Exception as e:
        print(f"Upload image error: {e}")
        return jsonify({'success': False, 'message': str(e)})

# Socket Events
@socketio.on('connect')
def handle_connect(*args, **kwargs):
    try:
        print(f"Client {request.sid} connected")
    except Exception as e:
        print(f"Connect error: {e}")

@socketio.on('join_group_room')
def handle_join_group_room(data, *args, **kwargs):
    try:
        group_id = data.get('group_id')
        user_name = data.get('user_name', 'Unknown')
        user_id = str(uuid.uuid4())
        
        session['user_id'] = user_id
        session['user_name'] = user_name
        session['room_type'] = 'group'
        session['room_id'] = group_id
        
        join_room(group_id)
        
        emit('user_joined', {
            'user_name': user_name,
            'message': f'{user_name} joined the group',
            'user_id': user_id
        }, room=group_id)
        
        emit('join_success', {'status': 'success'})
        print(f"User {user_name} joined group {group_id} successfully")
    except Exception as e:
        print(f"Join group room error: {e}")
        emit('join_error', {'message': str(e)})

@socketio.on('join_private_room')
def handle_join_private_room(data, *args, **kwargs):
    try:
        room_id = data.get('room_id')
        user_name = data.get('user_name', 'Unknown')
        user_id = str(uuid.uuid4())
        
        session['user_id'] = user_id
        session['user_name'] = user_name
        session['room_type'] = 'private'
        session['room_id'] = room_id
        
        join_room(room_id)
        
        emit('user_joined', {
            'user_name': user_name,
            'message': f'{user_name} joined the private room',
            'user_id': user_id
        }, room=room_id)
        
        emit('join_success', {'status': 'success'})
        print(f"User {user_name} joined private room {room_id} successfully")
    except Exception as e:
        print(f"Join private room error: {e}")
        emit('join_error', {'message': str(e)})

@socketio.on('send_message')
def handle_send_message(data, *args, **kwargs):
    try:
        user_id = session.get('user_id')
        user_name = session.get('user_name', 'Unknown')
        room_type = session.get('room_type')
        room_id = session.get('room_id')
        
        message = data.get('message', '')
        message_type = data.get('type', 'text')
        image_url = data.get('image_url', '')
        
        # Validate session data
        if not user_id or not user_name or not room_type:
            emit('message_error', {'message': 'Invalid session. Please rejoin the room.'})
            return
        
        target_room = room_id
        if not target_room:
            emit('message_error', {'message': 'Invalid room ID'})
            return
        
        # Create message data with ISO timestamp
        current_time = datetime.now()
        message_data = {
            'user_id': str(user_id),
            'user_name': str(user_name),
            'message': str(message),
            'type': str(message_type),
            'image_url': str(image_url),
            'timestamp': current_time.isoformat(),
            'message_id': str(uuid.uuid4())
        }
        
        # Store message with auto-delete timer
        message_copy = message_data.copy()
        chat_manager.add_message(target_room, message_copy)
        
        # Emit message to room
        emit('new_message', message_data, room=target_room)
        print(f"Message sent by {user_name} in {room_type} room: {message[:50]}...")
        
    except Exception as e:
        print(f"Send message error: {e}")
        import traceback
        traceback.print_exc()
        emit('message_error', {'message': 'Failed to send message. Please try again.'})

@socketio.on('user_typing')
def handle_user_typing(data, *args, **kwargs):
    try:
        user_name = session.get('user_name', 'Unknown')
        room_type = session.get('room_type')
        room_id = session.get('room_id')
        
        target_room = room_id
        
        if target_room:
            emit('user_typing', {
                'user_name': user_name,
                'typing': data.get('typing', False)
            }, room=target_room, include_self=False)
    except Exception as e:
        print(f"User typing error: {e}")

# Fixed disconnect handler - now accepts optional arguments
@socketio.on('disconnect')
def handle_disconnect(*args, **kwargs):
    try:
        user_id = session.get('user_id')
        user_name = session.get('user_name', 'Unknown')
        room_type = session.get('room_type')
        room_id = session.get('room_id')
        
        if room_type in ['group', 'private'] and room_id:
            leave_room(room_id)
            emit('user_left', {
                'user_name': user_name,
                'message': f'{user_name} left the room',
                'user_id': user_id
            }, room=room_id)
            
        print(f"User {user_name} disconnected from {room_type} room")
    except Exception as e:
        print(f"Disconnect error: {e}")

@socketio.on_error_default
def default_error_handler(e, *args, **kwargs):
    print(f"SocketIO error: {e}")
    import traceback
    traceback.print_exc()
    emit('error', {'message': 'A server error occurred'})

# Error handlers for HTTP routes
@app.errorhandler(404)
def not_found_error(error):
    return jsonify({'error': 'Page not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    print(f"Internal server error: {error}")
    return jsonify({'error': 'Internal server error'}), 500

# Handle favicon requests
@app.route('/favicon.ico')
def favicon():
    return '', 204

if __name__ == '__main__':
    socketio.run(app, debug=True, port=5000, allow_unsafe_werkzeug=True)

    try:
        socketio.run(app, debug=True, host='0.0.0.0', port=5000, allow_unsafe_werkzeug=True)
    except Exception as e:
        print(f"Failed to start server: {e}")

import threading
import time
import uuid
from datetime import datetime, timedelta
from collections import defaultdict

class ChatManager:
    def __init__(self):
        self.groups = {}
        self.private_rooms = {}
        self.messages = defaultdict(list)
        self.invite_codes = {}
        self.lock = threading.Lock()
        
        # Start cleanup thread
        self.cleanup_thread = threading.Thread(target=self._cleanup_messages, daemon=True)
        self.cleanup_thread.start()
    
    def create_group(self, admin_name, group_name):
        group_id = str(uuid.uuid4())
        invite_code = str(uuid.uuid4())[:8]
        
        with self.lock:
            self.groups[group_id] = {
                'name': group_name,
                'admin': admin_name,
                'users': {},
                'invite_code': invite_code,
                'created_at': datetime.now()
            }
            self.invite_codes[invite_code] = {'type': 'group', 'id': group_id}
        
        return group_id
    
    def get_group_invite_code(self, group_id):
        return self.groups.get(group_id, {}).get('invite_code')
    
    def join_group_by_invite(self, invite_code, user_name):
        with self.lock:
            invite_info = self.invite_codes.get(invite_code)
            if invite_info and invite_info['type'] == 'group':
                group_id = invite_info['id']
                user_id = str(uuid.uuid4())
                self.groups[group_id]['users'][user_id] = user_name
                return group_id
        return None
    
    def create_private_room(self, creator_name):
        room_id = str(uuid.uuid4())
        invite_code = str(uuid.uuid4())[:8]
        
        with self.lock:
            self.private_rooms[room_id] = {
                'creator': creator_name,
                'users': {},
                'invite_code': invite_code,
                'created_at': datetime.now(),
                'max_users': 2
            }
            self.invite_codes[invite_code] = {'type': 'private', 'id': room_id}
        
        return room_id
    
    def get_private_room_invite_code(self, room_id):
        return self.private_rooms.get(room_id, {}).get('invite_code')
    
    def join_private_room(self, invite_code, user_name):
        with self.lock:
            invite_info = self.invite_codes.get(invite_code)
            if invite_info and invite_info['type'] == 'private':
                room_id = invite_info['id']
                room = self.private_rooms.get(room_id)
                if room and len(room['users']) < room['max_users']:
                    user_id = str(uuid.uuid4())
                    room['users'][user_id] = user_name
                    return room_id
        return None
    
    def is_user_in_group(self, group_id, user_id):
        return group_id in self.groups
    
    def is_user_in_private_room(self, room_id, user_id):
        return room_id in self.private_rooms
    
    def add_message(self, room_id, message_data):
        with self.lock:
            # Ensure expires_at is ISO string
            expires_at = datetime.now() + timedelta(minutes=1)
            message_data['expires_at'] = expires_at.isoformat()
            self.messages[room_id].append(message_data)
    
    def _cleanup_messages(self):
        while True:
            time.sleep(30)  # Check every 30 seconds
            current_time = datetime.now()
            
            with self.lock:
                try:
                    for room_id in list(self.messages.keys()):
                        valid_messages = []
                        for msg in self.messages[room_id]:
                            try:
                                expires_at_str = msg.get('expires_at')
                                if expires_at_str and isinstance(expires_at_str, str):
                                    expires_at = datetime.fromisoformat(expires_at_str)
                                    if expires_at > current_time:
                                        valid_messages.append(msg)
                                elif expires_at_str:
                                    continue
                                else:
                                    valid_messages.append(msg)
                            except (ValueError, TypeError):
                                continue
                        
                        self.messages[room_id] = valid_messages
                        
                        if not self.messages[room_id]:
                            del self.messages[room_id]
                            
                except Exception as e:
                    print(f"Cleanup error: {e}")
                    pass

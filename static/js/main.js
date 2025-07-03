// Enhanced Screenshot Protection and Error Handling
document.addEventListener('DOMContentLoaded', function() {
    console.log('Ghost Chat loaded successfully');
    
    // Enhanced screenshot protection
    document.addEventListener('contextmenu', function(e) {
        e.preventDefault();
        showNotification('Right-click disabled for privacy', 'error');
    });
    
    // Disable developer tools
    document.addEventListener('keydown', function(e) {
        if (e.key === 'F12' || 
            (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J')) ||
            (e.ctrlKey && e.key === 'U')) {
            e.preventDefault();
            showNotification('Developer tools disabled', 'error');
        }
    });
    
    // Disable print screen
    document.addEventListener('keydown', function(e) {
        if (e.key === 'PrintScreen') {
            e.preventDefault();
            showNotification('Screenshots disabled for privacy!', 'error');
        }
    });
    
    // Initialize image modal
    createImageModal();
});

// Enhanced Notification System
function showNotification(message, type = 'success') {
    // Remove existing notifications
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(notification => notification.remove());
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 4000);
}

// Image Modal Functions
function createImageModal() {
    if (document.querySelector('.image-modal')) return;
    
    const modal = document.createElement('div');
    modal.className = 'image-modal';
    modal.innerHTML = `
        <img src="" alt="Full size image">
        <button class="close-modal" onclick="closeImageModal()">&times;</button>
    `;
    document.body.appendChild(modal);
    
    // Close modal when clicking outside
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            closeImageModal();
        }
    });
    
    // Close with Escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeImageModal();
        }
    });
}

function showImageModal(imageSrc) {
    const modal = document.querySelector('.image-modal');
    if (modal) {
        const img = modal.querySelector('img');
        img.src = imageSrc;
        modal.classList.add('show');
    }
}

function closeImageModal() {
    const modal = document.querySelector('.image-modal');
    if (modal) {
        modal.classList.remove('show');
    }
}

// Enhanced Image Upload with Progress
function handleImageUpload(inputElement) {
    const file = inputElement.files[0];
    if (!file) return;
    
    // Validate file size (50MB)
    if (file.size > 50 * 1024 * 1024) {
        showNotification('File size must be less than 50MB', 'error');
        inputElement.value = '';
        return;
    }
    
    // Validate file type
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/bmp', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
        showNotification('Please select a valid image file', 'error');
        inputElement.value = '';
        return;
    }
    
    // Show upload progress
    const progressDiv = document.createElement('div');
    progressDiv.className = 'upload-progress';
    progressDiv.innerHTML = `
        <div>Uploading image...</div>
        <div class="progress-bar">
            <div class="progress-fill" style="width: 0%"></div>
        </div>
        <div>0% complete</div>
    `;
    document.body.appendChild(progressDiv);
    
    // Create FormData and upload
    const formData = new FormData();
    formData.append('image', file);
    
    // Simulate progress
    let progress = 0;
    const progressInterval = setInterval(() => {
        progress += 10;
        const progressFill = progressDiv.querySelector('.progress-fill');
        const progressText = progressDiv.querySelector('div:last-child');
        
        if (progressFill && progressText) {
            progressFill.style.width = progress + '%';
            progressText.textContent = progress + '% complete';
        }
        
        if (progress >= 90) {
            clearInterval(progressInterval);
        }
    }, 100);
    
    fetch('/api/upload-image', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        clearInterval(progressInterval);
        progressDiv.remove();
        
        if (data.success) {
            showImagePreview(data.image_url);
            showNotification('Image uploaded successfully!');
        } else {
            showNotification(data.message || 'Upload failed', 'error');
        }
    })
    .catch(error => {
        clearInterval(progressInterval);
        progressDiv.remove();
        console.error('Upload error:', error);
        showNotification('Upload failed: Network error', 'error');
    });
    
    // Reset input
    inputElement.value = '';
}

function showImagePreview(imageUrl) {
    const inputArea = document.querySelector('.input-area');
    if (!inputArea) return;
    
    // Remove existing preview
    const existingPreview = document.querySelector('.image-preview');
    if (existingPreview) {
        existingPreview.remove();
    }
    
    const previewDiv = document.createElement('div');
    previewDiv.className = 'image-preview';
    previewDiv.innerHTML = `
        <img src="${imageUrl}" alt="Preview">
        <button class="remove-image" onclick="removeImagePreview()">&times;</button>
    `;
    
    inputArea.parentNode.insertBefore(previewDiv, inputArea);
    
    // Store image URL for sending
    window.pendingImageUrl = imageUrl;
    
    // Update send button state
    updateSendButtonState();
}

function removeImagePreview() {
    const preview = document.querySelector('.image-preview');
    if (preview) {
        preview.remove();
        window.pendingImageUrl = null;
        updateSendButtonState();
    }
}

// Enhanced Message Functions with better error handling
function addMessage(data, currentUser) {
    const messages = document.getElementById('messages');
    if (!messages) return;
    
    try {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message';
        messageDiv.setAttribute('data-message-id', data.message_id || Date.now());
        
        const isOwnMessage = data.user_name === currentUser;
        if (isOwnMessage) {
            messageDiv.classList.add('own-message');
        }
        
        const avatar = (data.user_name || 'U').charAt(0).toUpperCase();
        const timeString = formatTime(data.timestamp);
        
        let messageContent = '';
        if (data.image_url) {
            messageContent = `<img src="${data.image_url}" alt="Image" class="message-image" onclick="showImageModal('${data.image_url}')">`;
        }
        if (data.message) {
            messageContent += `<div class="message-content">${sanitizeMessage(data.message)}</div>`;
        }
        
        messageDiv.innerHTML = `
            ${!isOwnMessage ? `<div class="message-avatar">${avatar}</div>` : ''}
            <div class="message-bubble">
                ${messageContent}
                <div class="message-time">${timeString}</div>
            </div>
            ${isOwnMessage ? `<div class="message-avatar">${avatar}</div>` : ''}
        `;
        
        messages.appendChild(messageDiv);
        scrollToBottom(messages);
        
        // Auto-delete after 1 minute with smooth animation
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
                messageDiv.style.opacity = '0';
                messageDiv.style.transform = 'translateY(-20px)';
                setTimeout(() => {
                    if (messageDiv.parentNode) {
                        messageDiv.remove();
                    }
                }, 500);
            }
        }, 60000);
    } catch (error) {
        console.error('Error adding message:', error);
    }
}

function addSystemMessage(message) {
    const messages = document.getElementById('messages');
    if (!messages) return;
    
    try {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'system-message';
        messageDiv.textContent = message;
        
        messages.appendChild(messageDiv);
        scrollToBottom(messages);
        
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.style.transition = 'opacity 0.3s ease';
                messageDiv.style.opacity = '0';
                setTimeout(() => {
                    if (messageDiv.parentNode) {
                        messageDiv.remove();
                    }
                }, 300);
            }
        }, 30000);
    } catch (error) {
        console.error('Error adding system message:', error);
    }
}

// Enhanced Typing Indicator
let typingTimer;
let isTyping = false;

function handleTyping(socket) {
    if (!socket || !socket.connected) return;
    
    try {
        if (!isTyping) {
            isTyping = true;
            socket.emit('user_typing', { typing: true });
        }
        
        clearTimeout(typingTimer);
        typingTimer = setTimeout(() => {
            isTyping = false;
            socket.emit('user_typing', { typing: false });
        }, 1000);
    } catch (error) {
        console.error('Typing error:', error);
    }
}

function showTypingIndicator(userName) {
    const messages = document.getElementById('messages');
    if (!messages) return;
    
    try {
        // Remove existing indicator
        const existingIndicator = messages.querySelector('.typing-indicator');
        if (existingIndicator) {
            existingIndicator.remove();
        }
        
        const typingDiv = document.createElement('div');
        typingDiv.className = 'typing-indicator';
        typingDiv.innerHTML = `
            ${userName} is typing
            <div class="typing-dots">
                <span></span>
                <span></span>
                <span></span>
            </div>
        `;
        
        messages.appendChild(typingDiv);
        scrollToBottom(messages);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (typingDiv.parentNode) {
                typingDiv.remove();
            }
        }, 5000);
    } catch (error) {
        console.error('Show typing indicator error:', error);
    }
}

function hideTypingIndicator() {
    try {
        const indicator = document.querySelector('.typing-indicator');
        if (indicator) {
            indicator.remove();
        }
    } catch (error) {
        console.error('Hide typing indicator error:', error);
    }
}

// Utility Functions
function formatTime(timestamp) {
    if (!timestamp) return '';
    
    try {
        const date = new Date(timestamp);
        return date.toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: false 
        });
    } catch (error) {
        console.error('Format time error:', error);
        return '';
    }
}

function sanitizeMessage(message) {
    if (!message) return '';
    
    try {
        const div = document.createElement('div');
        div.textContent = message;
        return div.innerHTML;
    } catch (error) {
        console.error('Sanitize message error:', error);
        return message;
    }
}

function scrollToBottom(element) {
    try {
        if (element) {
            element.scrollTop = element.scrollHeight;
        }
    } catch (error) {
        console.error('Scroll to bottom error:', error);
    }
}

function copyToClipboard(text) {
    try {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(text).then(() => {
                showNotification('Copied to clipboard!');
            }).catch(() => {
                showNotification('Failed to copy', 'error');
            });
        } else {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            try {
                document.execCommand('copy');
                showNotification('Copied to clipboard!');
            } catch (err) {
                showNotification('Failed to copy', 'error');
            }
            document.body.removeChild(textArea);
        }
    } catch (error) {
        console.error('Copy to clipboard error:', error);
        showNotification('Failed to copy', 'error');
    }
}

function updateSendButtonState() {
    try {
        const messageInput = document.getElementById('message-input');
        const sendButton = document.getElementById('send-button');
        
        if (messageInput && sendButton) {
            const hasText = messageInput.value.trim().length > 0;
            const hasImage = window.pendingImageUrl;
            
            if (hasText || hasImage) {
                sendButton.style.opacity = '1';
                sendButton.disabled = false;
            } else {
                sendButton.style.opacity = '0.5';
                sendButton.disabled = true;
            }
        }
    } catch (error) {
        console.error('Update send button state error:', error);
    }
}

// Connection monitoring
function setupConnectionMonitoring(socket) {
    if (!socket) return;
    
    socket.on('connect', () => {
        console.log('Connected to server');
        showNotification('Connected successfully!');
    });
    
    socket.on('disconnect', () => {
        console.log('Disconnected from server');
        showNotification('Connection lost. Trying to reconnect...', 'error');
    });
    
    socket.on('connect_error', (error) => {
        console.error('Connection error:', error);
        showNotification('Connection failed. Please refresh the page.', 'error');
    });
    
    socket.on('join_success', () => {
        console.log('Successfully joined room');
    });
    
    socket.on('join_error', (data) => {
        console.error('Join error:', data.message);
        showNotification('Failed to join room: ' + data.message, 'error');
    });
    
    socket.on('message_error', (data) => {
        console.error('Message error:', data.message);
        showNotification('Failed to send message: ' + data.message, 'error');
    });
    
    socket.on('error', (data) => {
        console.error('Socket error:', data.message);
        showNotification('Server error occurred', 'error');
    });
}

// Auto-logout after inactivity
let inactivityTimer;
const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes

function resetInactivityTimer() {
    clearTimeout(inactivityTimer);
    inactivityTimer = setTimeout(() => {
        showNotification('Session expired due to inactivity', 'error');
        setTimeout(() => {
            window.location.href = '/';
        }, 3000);
    }, INACTIVITY_TIMEOUT);
}

// Track user activity
['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'].forEach(event => {
    document.addEventListener(event, resetInactivityTimer, true);
});

// Initialize inactivity timer
resetInactivityTimer();

// Global error handler
window.addEventListener('error', function(e) {
    console.error('Global error:', e.error);
    showNotification('An error occurred. Please refresh the page if issues persist.', 'error');
});

// Unhandled promise rejection handler
window.addEventListener('unhandledrejection', function(e) {
    console.error('Unhandled promise rejection:', e.reason);
    showNotification('Network error occurred.', 'error');
});

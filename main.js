document.addEventListener('DOMContentLoaded', () => {
    // 1. Navigation Logic
    const currentPath = window.location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.nav-links a').forEach(link => {
        if (link.getAttribute('href') === currentPath) {
            link.classList.add('active');
        }
    });

    // 2. Modal Logic (Internships Page)
    const modal = document.getElementById('apply-modal');
    const fileInput = document.getElementById('file-input');
    const dropZone = document.getElementById('drop-zone');
    const fileInfo = document.getElementById('file-info');
    const statusMsg = document.getElementById('status-message');
    const submitBtn = document.getElementById('submit-application');
    let selectedFile = null;

    window.openApplicationModal = (roleName) => {
        const title = document.getElementById('modal-title');
        if (title) title.innerText = `Apply for ${roleName}`;
        if (modal) modal.style.display = 'flex';
        resetModal();
    };

    window.closeModal = () => {
        if (modal) {
            modal.style.opacity = '0';
            setTimeout(() => {
                modal.style.display = 'none';
                modal.style.opacity = '1';
                resetModal();
            }, 300);
        }
    };

    function resetModal() {
        selectedFile = null;
        if (fileInput) fileInput.value = '';
        if (fileInfo) fileInfo.innerText = '';
        if (statusMsg) {
            statusMsg.style.display = 'none';
            statusMsg.className = '';
        }
        if (submitBtn) {
            submitBtn.style.display = 'none';
            submitBtn.disabled = false;
            submitBtn.innerText = 'Submit My Application';
        }
    }

    if (dropZone) {
        dropZone.addEventListener('click', () => fileInput.click());
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.style.borderColor = 'var(--primary)';
            dropZone.style.background = '#FFFFFF';
        });
        dropZone.addEventListener('dragleave', () => {
            dropZone.style.borderColor = 'var(--border)';
            dropZone.style.background = 'var(--bg-sub)';
        });
        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            if (e.dataTransfer.files.length) handleFileSelection(e.dataTransfer.files[0]);
        });
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length) handleFileSelection(e.target.files[0]);
        });
    }

    function handleFileSelection(file) {
        if (file.type !== 'application/pdf') {
            showStatus('Security Protocol: Please provide a PDF document.', 'error');
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            showStatus('Size Exceeded: File must be under 5MB.', 'error');
            return;
        }
        selectedFile = file;
        fileInfo.innerText = `Ready: ${file.name}`;
        submitBtn.style.display = 'block';
        showStatus('Document validated.', 'success');
    }

    if (submitBtn) {
        submitBtn.addEventListener('click', async () => {
            if (!selectedFile) return;
            submitBtn.innerText = 'Archiving to AWS S3...';
            submitBtn.disabled = true;

            const formData = new FormData();
            formData.append('resume', selectedFile);

            try {
                const response = await fetch('/upload', { method: 'POST', body: formData });
                const result = await response.json();
                
                if (response.ok) {
                    showStatus('Success: Application submitted to cloud.', 'success');
                    setTimeout(closeModal, 1500);
                } else {
                    showStatus(result.error || 'Infrastructure error.', 'error');
                }
            } catch (err) {
                showStatus('Connectivity error. Engine offline.', 'error');
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerText = 'Submit My Application';
            }
        });
    }

    // 3. Contact Form Logic
    const contactForm = document.getElementById('contact-form');
    const contactStatus = document.getElementById('contact-status');

    if (contactForm) {
        contactForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = contactForm.querySelector('button');
            btn.innerText = 'Syncing...';
            btn.disabled = true;

            const data = {
                name: document.getElementById('name').value,
                email: document.getElementById('email').value,
                message: document.getElementById('message').value,
                timestamp: new Date().toISOString()
            };

            try {
                const response = await fetch('/contact', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                
                if (response.ok) {
                    showContactStatus('Message archived in S3. Confirmation pending.', 'success');
                    contactForm.reset();
                } else {
                    const error = await response.json();
                    showContactStatus(error.error || 'Archive failure.', 'error');
                }
            } catch (err) {
                showContactStatus('Infrastructure offline.', 'error');
            } finally {
                btn.innerText = 'Establish Contact';
                btn.disabled = false;
            }
        });
    }

    function showStatus(msg, type) {
        if (!statusMsg) return;
        statusMsg.innerText = msg;
        statusMsg.style.display = 'block';
        statusMsg.style.background = type === 'success' ? '#F0FDF4' : '#FEF2F2';
        statusMsg.style.color = type === 'success' ? '#166534' : '#991B1B';
        statusMsg.style.border = `1px solid ${type === 'success' ? '#BBF7D0' : '#FECACA'}`;
    }

    function showContactStatus(msg, type) {
        if (!contactStatus) return;
        contactStatus.innerText = msg;
        contactStatus.style.display = 'block';
        contactStatus.style.background = type === 'success' ? '#F0FDF4' : '#FEF2F2';
        contactStatus.style.color = type === 'success' ? '#166534' : '#991B1B';
        contactStatus.style.border = `1px solid ${type === 'success' ? '#BBF7D0' : '#FECACA'}`;
    }

    // Close modal on click outside
    window.onclick = function(event) {
        if (event.target == modal) {
            closeModal();
        }
    }
});

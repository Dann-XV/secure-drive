const apiBase = '/files';
const token = localStorage.getItem('authToken');
const fileInput = document.getElementById('fileInput');
const fileList = document.getElementById('fileList');
const messageDiv = document.getElementById('message');
const filesCount = document.getElementById('filesCount');

if (!token) {
    window.location.href = '/login.html';
}

async function fetchFiles() {
    try {
        const response = await fetch(apiBase, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || 'Could not load files');
        }
        renderFiles(data.files || []);
    } catch (err) {
        messageDiv.textContent = err.message;
        messageDiv.className = 'drive-error';
    }
}

function renderFiles(files) {
    fileList.innerHTML = '';
    filesCount.textContent = `${files.length} file${files.length === 1 ? '' : 's'}`;

    if (!files.length) {
        fileList.innerHTML = '<p class="empty-state">No files uploaded yet. Click the plus button to add files.</p>';
        return;
    }

    files.forEach((file) => {
        const item = document.createElement('div');
        item.className = 'file-card';
        item.innerHTML = `
            <div>
                <a href="/files/${file._id}" class="file-link">${file.originalName}</a>
                <p class="file-meta">${new Date(file.createdAt).toLocaleString()} · ${Math.round(file.size / 1024)} KB</p>
            </div>
            <span class="file-badge">${file.mime}</span>
        `;
        fileList.appendChild(item);
    });
}

async function uploadFile(file) {
    const formData = new FormData();
    formData.append('file', file);

    try {
        const response = await fetch(`${apiBase}/upload`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
            },
            body: formData,
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || 'Upload failed');
        }
        messageDiv.textContent = 'Upload successful!';
        messageDiv.className = 'drive-success';
        fetchFiles();
    } catch (err) {
        messageDiv.textContent = err.message;
        messageDiv.className = 'drive-error';
    }
}

document.getElementById('uploadButton').addEventListener('click', () => {
    fileInput.click();
});

fileInput.addEventListener('change', (event) => {
    if (event.target.files.length) {
        uploadFile(event.target.files[0]);
    }
});

document.getElementById('logoutButton').addEventListener('click', () => {
    localStorage.removeItem('authToken');
    window.location.href = '/login.html';
});

fetchFiles();
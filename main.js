import './style.css'

const video = document.getElementById('webcam');
const shutterBtn = document.getElementById('shutter-btn');
const cameraContainer = document.querySelector('.camera-container');
const photoWall = document.getElementById('photo-wall');

// Webcam Setup
async function setupCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: {
                width: 400,
                height: 400,
                facingMode: "user"
            },
            audio: false
        });
        video.srcObject = stream;
    } catch (err) {
        console.error("Error accessing webcam:", err);
        alert("Please allow camera access to use the Polaroid.");
    }
}

setupCamera();

// Shutter Logic
shutterBtn.addEventListener('click', () => {
    playShutterSound();
    takePhoto();
});

function playShutterSound() {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;

    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.1);

    gain.gain.setValueAtTime(0.5, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.1);
}

function takePhoto() {
    // Flash effect
    const flash = document.querySelector('.flash');
    flash.style.backgroundColor = '#fff';
    flash.style.boxShadow = '0 0 50px #fff';
    setTimeout(() => {
        flash.style.backgroundColor = '#eee';
        flash.style.boxShadow = 'inset 0 0 10px rgba(0,0,0,0.1)';
    }, 100);

    // Capture image
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');

    // Mirror the image to match the video feed
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageUrl = canvas.toDataURL('image/png');

    createPhotoElement(imageUrl);
}

function createPhotoElement(url) {
    const photo = document.createElement('div');
    photo.classList.add('photo');

    const content = document.createElement('div');
    content.classList.add('photo-content');

    const img = document.createElement('img');
    img.src = url;

    const date = document.createElement('div');
    date.classList.add('photo-date');
    const now = new Date();
    date.textContent = `${now.getFullYear()}.${now.getMonth() + 1}.${now.getDate()}`;

    content.appendChild(img);
    photo.appendChild(content);
    photo.appendChild(date);

    // Append to camera container initially for the "eject" animation
    // We need to position it behind the camera body.
    // The CSS handles the initial position (top: 20px) and z-index.
    cameraContainer.appendChild(photo);

    // Trigger eject animation
    requestAnimationFrame(() => {
        photo.classList.add('ejecting');
    });

    // Start developing
    setTimeout(() => {
        photo.classList.add('developed');
    }, 1000); // Start developing after eject starts

    // Make draggable after ejection
    setTimeout(() => {
        photo.classList.add('draggable');
        makeDraggable(photo);

        // Move to photo wall to allow free dragging across the screen
        // We need to calculate the current position relative to the page
        const rect = photo.getBoundingClientRect();
        photoWall.appendChild(photo);
        photo.style.position = 'absolute';
        photo.style.left = rect.left + 'px';
        photo.style.top = rect.top + 'px';
        photo.classList.remove('ejecting'); // Remove animation class to stop interfering

    }, 1200); // Wait for eject animation (1s) + buffer
}

// Drag and Drop Logic
function makeDraggable(element) {
    let isDragging = false;
    let startX, startY, initialLeft, initialTop;
    let zIndex = 1000;

    element.addEventListener('mousedown', (e) => {
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;

        // Get current computed style position
        const style = window.getComputedStyle(element);
        initialLeft = parseInt(style.left || 0);
        initialTop = parseInt(style.top || 0);

        element.style.zIndex = ++zIndex; // Bring to front
        element.style.cursor = 'grabbing';

        e.preventDefault(); // Prevent text selection
    });

    window.addEventListener('mousemove', (e) => {
        if (!isDragging) return;

        const dx = e.clientX - startX;
        const dy = e.clientY - startY;

        element.style.left = `${initialLeft + dx}px`;
        element.style.top = `${initialTop + dy}px`;
    });

    window.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            element.style.cursor = 'grab';

            // Add a slight random rotation for realism
            const randomRot = Math.random() * 10 - 5;
            element.style.transform = `rotate(${randomRot}deg)`;
        }
    });
}

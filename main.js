import './style.css'
import html2canvas from 'html2canvas';

const video = document.getElementById('webcam');
const shutterBtn = document.getElementById('shutter-btn');
const printBtn = document.getElementById('print-btn');
const cameraContainer = document.querySelector('.camera-container');
const photoWall = document.getElementById('photo-wall');

// Print button triggers save wall function
printBtn.addEventListener('click', async () => {
    try {
        // Create A4 container
        const a4Container = document.createElement('div');
        a4Container.classList.add('a4-export-container');
        document.body.appendChild(a4Container);

        // A4 Dimensions (with padding)
        const a4Width = 794;
        const a4Height = 1123;
        const padding = 60; // Increased padding
        const contentWidth = a4Width - (padding * 2);
        const contentHeight = a4Height - (padding * 2);

        // Get all photos
        const photos = Array.from(document.querySelectorAll('.photo-wall .photo'));

        if (photos.length === 0) {
            alert("No photos to save!");
            document.body.removeChild(a4Container);
            return;
        }

        // Calculate Bounding Box of current photos
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

        photos.forEach(photo => {
            const rect = photo.getBoundingClientRect();
            // Use visual bounds (getBoundingClientRect) to account for rotation
            minX = Math.min(minX, rect.left);
            minY = Math.min(minY, rect.top);
            maxX = Math.max(maxX, rect.right);
            maxY = Math.max(maxY, rect.bottom);
        });

        const totalWidth = maxX - minX;
        const totalHeight = maxY - minY;

        // Calculate Scale to fit A4
        const scaleX = contentWidth / totalWidth;
        const scaleY = contentHeight / totalHeight;
        const scale = Math.min(scaleX, scaleY, 1); // Don't scale up if it fits, only down. Or maybe we want to fill? Let's cap at 1 to avoid pixelation.

        // Center the content in A4
        const scaledWidth = totalWidth * scale;
        const scaledHeight = totalHeight * scale;
        const offsetX = (a4Width - scaledWidth) / 2;
        const offsetY = (a4Height - scaledHeight) / 2;

        // Clone and map photos
        photos.forEach(photo => {
            const clone = photo.cloneNode(true);

            // Use getBoundingClientRect for the source position as well to match the bounding box logic
            const rect = photo.getBoundingClientRect();
            const x = rect.left;
            const y = rect.top;

            // Calculate relative position to bounding box
            const relX = x - minX;
            const relY = y - minY;

            // Scale position
            const newLeft = offsetX + (relX * scale);
            const newTop = offsetY + (relY * scale);

            clone.style.left = `${newLeft}px`;
            clone.style.top = `${newTop}px`;
            clone.style.position = 'absolute';

            // Scale the element itself
            // We need to preserve existing rotation
            // The clone has the rotation in style.transform.
            // We append scale to it.
            // Note: transform order matters.
            const currentTransform = clone.style.transform || '';
            clone.style.transform = `${currentTransform} scale(${scale})`;
            clone.style.transformOrigin = 'top left'; // Important for positioning

            clone.classList.remove('draggable');
            a4Container.appendChild(clone);
        });

        // Wait a moment for images to load in clone if needed (usually instant for dataURLs)
        await new Promise(resolve => setTimeout(resolve, 100));

        const canvas = await html2canvas(a4Container, {
            backgroundColor: null,
            scale: 2, // High quality
            logging: false,
            useCORS: true
        });

        const link = document.createElement('a');
        link.download = `polaroid-wall-a4-${Date.now()}.png`;
        link.href = canvas.toDataURL();
        link.click();

        // Cleanup
        document.body.removeChild(a4Container);

    } catch (err) {
        console.error("Error saving wall:", err);
        alert("Failed to save photo wall.");
    }
});

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

function playEjectionSound() {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;

    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    // Low frequency motor/gear sound
    osc.type = 'square';
    osc.frequency.setValueAtTime(80, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(120, ctx.currentTime + 0.3);
    osc.frequency.linearRampToValueAtTime(60, ctx.currentTime + 0.8);

    // Fade in and out
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.1);
    gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.7);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.9);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.9);
}

function takePhoto() {
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
        playEjectionSound(); // Play mechanical sound during ejection
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

    // Double-click to delete
    element.addEventListener('dblclick', () => {
        element.classList.add('crumpling');
        element.style.cursor = 'default';

        // Remove from DOM after animation
        setTimeout(() => {
            element.remove();
        }, 500);
    });

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

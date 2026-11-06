// ==========================================
// 1. PRESETS AND COLOR PALETTES
// ==========================================

// Preset Color Palettes used to randomize the colors of the wheel sections
const COLOR_PALETTES = [
    ['#ef4444', '#f97316', '#f59e0b', '#10b981', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899'],
    ['#b91c1c', '#c2410c', '#b45309', '#047857', '#0e7490', '#1d4ed8', '#6d28d9', '#be185d'],
    ['#d97706', '#059669', '#2563eb', '#7c3aed', '#db2777', '#dc2626'],
    ['#e11d48', '#be123c', '#9f1239', '#881337', '#4c0519']
];

// Sample Presets for quick wheel configurations (Dinner, Raffle, Yes/No, Dice)
const PRESETS = {
    dinner: [
        { name: 'Pizza', weight: 3, color: '#ef4444' },
        { name: 'Sushi', weight: 2, color: '#06b6d4' },
        { name: 'Tacos', weight: 3, color: '#f59e0b' },
        { name: 'Burgers', weight: 2, color: '#10b981' },
        { name: 'Thai Food', weight: 1, color: '#8b5cf6' },
        { name: 'Salad', weight: 1, color: '#84cc16' }
    ],
    raffle: [
        { name: 'Grand Prize ($100)', weight: 1, color: '#f59e0b' },
        { name: 'Second Prize ($50)', weight: 2, color: '#3b82f6' },
        { name: 'Third Prize ($20)', weight: 5, color: '#10b981' },
        { name: 'Consolation Sticker', weight: 12, color: '#6b7280' }
    ],
    yesno: [
        { name: 'YES!', weight: 5, color: '#10b981' },
        { name: 'NO', weight: 5, color: '#ef4444' },
        { name: 'MAYBE', weight: 2, color: '#f59e0b' }
    ],
    dice: [
        { name: 'One (1)', weight: 1, color: '#ef4444' },
        { name: 'Two (2)', weight: 1, color: '#f97316' },
        { name: 'Three (3)', weight: 1, color: '#f59e0b' },
        { name: 'Four (4)', weight: 1, color: '#10b981' },
        { name: 'Five (5)', weight: 1, color: '#06b6d4' },
        { name: 'Six (6)', weight: 1, color: '#8b5cf6' }
    ]
};


// ==========================================
// 2. APPLICATION STATE & LOCALSTORAGE
// ==========================================

// Load segments from localStorage if available, otherwise default to the dinner preset
let segments = JSON.parse(localStorage.getItem('stage_spinner_segments')) || [...PRESETS.dinner];
let currentRotation = 0; // Tracks the current rotation angle of the wheel in radians
let isSpinning = false;  // Prevents clicking spin multiple times while already spinning
let soundEnabled = true; // Toggle for sound effects
let isDarkMode = localStorage.getItem('stage_spinner_theme') !== 'light'; // Theme persistence state


// ==========================================
// 3. WEB AUDIO API SYNTHESIZER
// ==========================================

const AudioCtx = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;
let drumrollInterval = null;

// Initializes or resumes the browser audio context when needed
function getAudioContext() {
    if (!audioCtx) {
        audioCtx = new AudioCtx();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    return audioCtx;
}

// Generates a cryptographically secure random number for fair wheel spins
function getSecureRandom() {
    const array = new Uint32Array(1);
    window.crypto.getRandomValues(array);
    return array[0] / (0xFFFFFFFF + 1);
}

// Synthesizes a single snare drum sound hit for the spinning drumroll
function playSnareHit(volume = 0.15) {
    if (!soundEnabled) return;
    try {
        const ctx = getAudioContext();
        const now = ctx.currentTime;

        const bufferSize = ctx.sampleRate * 0.05;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = getSecureRandom() * 2 - 1;
        }

        const noise = ctx.createBufferSource();
        noise.buffer = buffer;

        const noiseFilter = ctx.createBiquadFilter();
        noiseFilter.type = 'highpass';
        noiseFilter.frequency.value = 800;

        const noiseEnvelope = ctx.createGain();
        noiseEnvelope.gain.setValueAtTime(volume, now);
        noiseEnvelope.gain.exponentialRampToValueAtTime(0.01, now + 0.05);

        noise.connect(noiseFilter);
        noiseFilter.connect(noiseEnvelope);
        noiseEnvelope.connect(ctx.destination);

        const osc = ctx.createOscillator();
        const oscEnvelope = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(180, now);
        osc.frequency.exponentialRampToValueAtTime(40, now + 0.04);

        oscEnvelope.gain.setValueAtTime(volume * 0.8, now);
        oscEnvelope.gain.exponentialRampToValueAtTime(0.01, now + 0.04);

        osc.connect(oscEnvelope);
        oscEnvelope.connect(ctx.destination);

        noise.start(now);
        osc.start(now);
        noise.stop(now + 0.05);
        osc.stop(now + 0.05);
    } catch (e) { console.error(e); }
}

// Synthesizes a celebratory cymbal crash and brass chord when the wheel stops
function playCymbalCrash() {
    if (!soundEnabled) return;
    try {
        const ctx = getAudioContext();
        const now = ctx.currentTime;

        const bufferSize = ctx.sampleRate * 1.2;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = getSecureRandom() * 2 - 1;
        }

        const cymbal = ctx.createBufferSource();
        cymbal.buffer = buffer;

        const filter = ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 3500;

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

        cymbal.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);

        cymbal.start(now);

        const notes = [261.63, 329.63, 392.00, 523.25];
        notes.forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const oscGain = ctx.createGain();
            
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, now + idx * 0.08);
            
            oscGain.gain.setValueAtTime(0, now + idx * 0.08);
            oscGain.gain.linearRampToValueAtTime(0.18, now + idx * 0.08 + 0.04);
            oscGain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.5);
            
            osc.connect(oscGain);
            oscGain.connect(ctx.destination);
            
            osc.start(now + idx * 0.08);
            osc.stop(now + idx * 0.08 + 0.5);
        });
    } catch (e) { console.error(e); }
}

// Starts looping snare hits to create a continuous drumroll effect during a spin
function startDrumroll() {
    if (!soundEnabled) return;
    stopDrumroll();
    let intervalTime = 40;
    drumrollInterval = setInterval(() => {
        const randomVol = 0.12 + getSecureRandom() * 0.08;
        playSnareHit(randomVol);
    }, intervalTime);
}

// Stops the drumroll loop sound
function stopDrumroll() {
    if (drumrollInterval) {
        clearInterval(drumrollInterval);
        drumrollInterval = null;
    }
}


// ==========================================
// 4. DOM ELEMENT CACHING
// ==========================================

const canvas = document.getElementById('wheel-canvas');
const ctx = canvas.getContext('2d');
const spinBtn = document.getElementById('spin-btn');
const centerCap = document.getElementById('center-cap');
const segmentsContainer = document.getElementById('segments-container');
const addSegmentBtn = document.getElementById('add-segment-btn');
const randomizeColorsBtn = document.getElementById('randomize-colors-btn');
const clearAllBtn = document.getElementById('clear-all-btn');
const statusDisplay = document.getElementById('status-display');
const totalCountEl = document.getElementById('total-count');
const totalWeightEl = document.getElementById('total-weight');
const winnerModal = document.getElementById('winner-modal');
const modalContent = document.getElementById('modal-card');
const winnerTitle = document.getElementById('winner-title');
const winnerDetails = document.getElementById('winner-details');
const closeModalBtn = document.getElementById('close-modal-btn');
const presetBtn = document.getElementById('preset-btn');
const presetModal = document.getElementById('preset-modal');
const closePresetBtn = document.getElementById('close-preset-btn');
const soundToggle = document.getElementById('sound-toggle');
const soundIcon = document.getElementById('sound-icon');
const pointer = document.getElementById('wheel-pointer');
const settingsBtn = document.getElementById('settings-btn');
const settingsModal = document.getElementById('settings-modal');
const closeSettingsBtn = document.getElementById('close-settings-btn');
const themeToggleBtn = document.getElementById('theme-toggle-btn');
const themeIcon = document.getElementById('theme-icon');
const confirmModal = document.getElementById('confirm-modal');
const cancelClearBtn = document.getElementById('cancel-clear-btn');
const confirmClearBtn = document.getElementById('confirm-clear-btn');


// ==========================================
// 5. HELPER FUNCTIONS & PERSISTENCE
// ==========================================

// Calculates the total sum of weights across all active wheel sections
function getTotalWeight() {
    return segments.reduce((sum, seg) => sum + (Math.max(0.1, parseFloat(seg.weight) || 1)), 0);
}

// Saves the current custom wheel sections into the browser's localStorage
function saveToLocalStorage() {
    localStorage.setItem('stage_spinner_segments', JSON.stringify(segments));
}

// Escapes special HTML characters to keep input fields secure
function escapeHtml(str) {
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


// ==========================================
// 6. CANVAS WHEEL RENDERING
// ==========================================

// Draws the wheel slices, colors, text labels, and outer rim onto the HTML5 Canvas
function drawWheel() {
    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(centerX, centerY) - 10;

    ctx.clearRect(0, 0, width, height);

    // Render empty state if no sections exist
    if (segments.length === 0) {
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
        ctx.fillStyle = '#27272a';
        ctx.fill();
        ctx.strokeStyle = '#d4af37';
        ctx.lineWidth = 4;
        ctx.stroke();

        ctx.save();
        ctx.fillStyle = '#a1a1aa';
        ctx.font = 'bold 18px "Plus Jakarta Sans"';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('No Sections Added', centerX, centerY);
        ctx.restore();
        return;
    }

    const totalWeight = getTotalWeight();
    let startAngle = currentRotation;

    // Loop through each segment and draw its respective slice
    for (let i = 0; i < segments.length; i++) {
        const seg = segments[i];
        const weight = Math.max(0.1, parseFloat(seg.weight) || 1);
        const sliceAngle = (weight / totalWeight) * 2 * Math.PI;
        const endAngle = startAngle + sliceAngle;

        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, startAngle, endAngle);
        ctx.closePath();

        ctx.fillStyle = seg.color || '#3b82f6';
        ctx.fill();

        ctx.strokeStyle = 'rgba(0, 0, 0, 0.25)';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Draw the text label inside the slice
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(startAngle + sliceAngle / 2);
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';

        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
        ctx.shadowBlur = 4;
        ctx.font = 'bold 16px "Plus Jakarta Sans", sans-serif';

        let text = seg.name || `Section ${i + 1}`;
        if (text.length > 18) text = text.substring(0, 16) + '...';

        ctx.fillText(text, radius - 25, 0);
        ctx.restore();

        startAngle = endAngle;
    }

    // Draw outer golden ring rim
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 6;
    ctx.stroke();
}


// ==========================================
// 7. CONTROL PANEL MANAGEMENT
// ==========================================

// Renders the interactive row inputs in the right-hand panel for each section
function renderSegmentsList() {
    segmentsContainer.innerHTML = '';

    segments.forEach((seg, idx) => {
        const item = document.createElement('div');
        item.className = 'segment-row flex items-center gap-2 bg-zinc-900/80 p-2.5 rounded-lg border border-amber-900/30 hover:border-amber-500/40 transition group';
        
        item.innerHTML = `
            <input type="color" value="${escapeHtml(seg.color)}" data-idx="${idx}" class="color-picker w-7 h-7 rounded border-0 bg-transparent cursor-pointer">
            <input type="text" value="${escapeHtml(seg.name)}" data-idx="${idx}" placeholder="Section Name" class="segment-input name-input flex-1 bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1 text-xs text-zinc-100 focus:outline-none focus:border-amber-400">
            <div class="segment-input flex items-center gap-1 bg-zinc-950 border border-zinc-800 rounded px-2 py-1" title="Relative Weight (Higher = Bigger Slice)">
                <span class="text-[10px] text-zinc-400 uppercase font-bold">Wt:</span>
                <input type="number" min="0.1" step="0.5" value="${seg.weight}" data-idx="${idx}" class="weight-input w-12 bg-transparent text-xs text-amber-400 font-bold text-center focus:outline-none">
            </div>
            <button type="button" data-idx="${idx}" class="delete-btn p-2 text-zinc-500 hover:text-red-400 hover:bg-red-950/40 rounded transition">
                <i class="fa-solid fa-trash-can text-sm pointer-events-none"></i>
            </button>
        `;

        segmentsContainer.appendChild(item);
    });

    totalCountEl.textContent = segments.length;
    totalWeightEl.textContent = getTotalWeight().toFixed(1);

    drawWheel();
    saveToLocalStorage(); // Automatically save state changes
}

// Appends a new default option to the wheel list
function addSegment() {
    const palette = COLOR_PALETTES[0];
    const color = palette[segments.length % palette.length];
    segments.push({
        name: `Option ${segments.length + 1}`,
        weight: 1,
        color: color
    });
    renderSegmentsList();
}


// ==========================================
// 8. WHEEL SPINNING & PHYSICS LOGIC
// ==========================================

let lastSegmentIndex = -1;

// Handles wheel rotation calculations, easing animation, and winner selection
function spinWheel() {
    if (isSpinning || segments.length === 0) return;

    isSpinning = true;
    spinBtn.disabled = true;
    spinBtn.classList.add('opacity-50', 'cursor-not-allowed');
    statusDisplay.textContent = "Roll the drums! The wheel is spinning...";

    // Determine winning slice based on relative weights using secure randomness
    const totalWeight = getTotalWeight();
    let randomWeight = getSecureRandom() * totalWeight;
    let winnerIndex = 0;

    for (let i = 0; i < segments.length; i++) {
        const w = Math.max(0.1, parseFloat(segments[i].weight) || 1);
        if (randomWeight < w) {
            winnerIndex = i;
            break;
        }
        randomWeight -= w;
    }

    const targetPointerAngle = (3 * Math.PI) / 2;
    let cumulativeAngle = 0;
    for (let i = 0; i < winnerIndex; i++) {
        const w = Math.max(0.1, parseFloat(segments[i].weight) || 1);
        cumulativeAngle += (w / totalWeight) * 2 * Math.PI;
    }
    const winnerWeight = Math.max(0.1, parseFloat(segments[winnerIndex].weight) || 1);
    const winnerSliceAngle = (winnerWeight / totalWeight) * 2 * Math.PI;
    
    const randomSliceOffset = 0.15 * winnerSliceAngle + getSecureRandom() * 0.7 * winnerSliceAngle;
    const targetSegmentAngle = cumulativeAngle + randomSliceOffset;

    const currentNormRotation = currentRotation % (2 * Math.PI);
    const fullSpins = (5 + Math.floor(getSecureRandom() * 4)) * 2 * Math.PI;
    
    const targetFinalRotation = currentRotation + fullSpins + ((targetPointerAngle - targetSegmentAngle - currentNormRotation) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);

    const startTime = performance.now();
    const spinDuration = 4500 + getSecureRandom() * 1000;
    const initialRotation = currentRotation;
    const totalDelta = targetFinalRotation - initialRotation;

    lastSegmentIndex = -1;
    startDrumroll();

    // Animation loop using requestAnimationFrame and cubic-bezier easing
    function animateSpin(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / spinDuration, 1);

        const easeOut = 1 - Math.pow(1 - progress, 3.5);
        currentRotation = initialRotation + totalDelta * easeOut;

        const currentPointerAngle = ((targetPointerAngle - (currentRotation % (2 * Math.PI))) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
        let currentSliceStart = 0;
        let activeIdx = 0;

        for (let i = 0; i < segments.length; i++) {
            const w = Math.max(0.1, parseFloat(segments[i].weight) || 1);
            const slice = (w / totalWeight) * 2 * Math.PI;
            if (currentPointerAngle >= currentSliceStart && currentPointerAngle < currentSliceStart + slice) {
                activeIdx = i;
                break;
            }
            currentSliceStart += slice;
        }

        if (activeIdx !== lastSegmentIndex) {
            if (pointer) {
                pointer.style.transform = 'scale(1.15) translateY(2px)';
                setTimeout(() => { if (pointer) pointer.style.transform = 'scale(1) translateY(0)'; }, 60);
            }
            lastSegmentIndex = activeIdx;
        }

        drawWheel();

        if (progress < 1) {
            requestAnimationFrame(animateSpin);
        } else {
            stopDrumroll();
            isSpinning = false;
            spinBtn.disabled = false;
            spinBtn.classList.remove('opacity-50', 'cursor-not-allowed');
            
            const winner = segments[winnerIndex];
            statusDisplay.innerHTML = `Result: <span class="text-amber-400 font-bold">${escapeHtml(winner.name)}</span>!`;

            showWinnerModal(winner);
        }
    }

    requestAnimationFrame(animateSpin);
}


// ==========================================
// 9. MODALS & CELEBRATIONS
// ==========================================

// Opens the winner celebration modal and triggers confetti
function showWinnerModal(winner) {
    playCymbalCrash();
    winnerTitle.textContent = winner.name;
    winnerDetails.textContent = `Selected from ${segments.length} entries (Weight: ${winner.weight})`;
    
    winnerModal.classList.remove('opacity-0', 'pointer-events-none');
    modalContent.classList.remove('scale-90');
    modalContent.classList.add('scale-100');

    if (typeof confetti === 'function') {
        confetti({
            particleCount: 120,
            spread: 80,
            origin: { y: 0.6 }
        });
    }
}

// Hides the winner celebration modal
function hideWinnerModal() {
    winnerModal.classList.add('opacity-0', 'pointer-events-none');
    modalContent.classList.remove('scale-100');
    modalContent.classList.add('scale-90');
}


// ==========================================
// 10. EVENT LISTENERS & INITIALIZATION
// ==========================================

// Handles changes made to segment names, weights, and colors in the panel
segmentsContainer.addEventListener('input', (e) => {
    const target = e.target;
    const idx = parseInt(target.getAttribute('data-idx'));
    if (isNaN(idx)) return;

    if (target.classList.contains('name-input')) {
        segments[idx].name = target.value;
    } else if (target.classList.contains('weight-input')) {
        segments[idx].weight = Math.max(0.1, parseFloat(target.value) || 0.1);
        totalWeightEl.textContent = getTotalWeight().toFixed(1);
    } else if (target.classList.contains('color-picker')) {
        segments[idx].color = target.value;
    }
    drawWheel();
    saveToLocalStorage();
});

// Handles deleting individual segments from the list
segmentsContainer.addEventListener('click', (e) => {
    const deleteBtn = e.target.closest('.delete-btn');
    if (deleteBtn) {
        const idx = parseInt(deleteBtn.getAttribute('data-idx'));
        if (!isNaN(idx) && idx >= 0 && idx < segments.length) {
            segments.splice(idx, 1);
            renderSegmentsList();
        }
    }
});

// Spin and add button click handlers
addSegmentBtn.addEventListener('click', addSegment);
spinBtn.addEventListener('click', spinWheel);
centerCap.addEventListener('click', spinWheel);
canvas.addEventListener('click', spinWheel);

// Randomizes all segment colors using predefined palettes
randomizeColorsBtn.addEventListener('click', () => {
    const paletteIndex = Math.floor(getSecureRandom() * COLOR_PALETTES.length);
    const palette = COLOR_PALETTES[paletteIndex];
    segments.forEach((seg, i) => {
        seg.color = palette[i % palette.length];
    });
    renderSegmentsList();
});

// Clear all segments confirmation modal handlers
clearAllBtn.addEventListener('click', () => {
    if (segments.length === 0) return;
    confirmModal.classList.remove('opacity-0', 'pointer-events-none');
});

cancelClearBtn.addEventListener('click', () => {
    confirmModal.classList.add('opacity-0', 'pointer-events-none');
});

confirmClearBtn.addEventListener('click', () => {
    segments = [];
    renderSegmentsList();
    confirmModal.classList.add('opacity-0', 'pointer-events-none');
    statusDisplay.textContent = "Wheel cleared! Add new sections to spin.";
});

closeModalBtn.addEventListener('click', hideWinnerModal);

// Settings modal toggle handlers
settingsBtn.addEventListener('click', () => {
    settingsModal.classList.remove('opacity-0', 'pointer-events-none');
});

closeSettingsBtn.addEventListener('click', () => {
    settingsModal.classList.add('opacity-0', 'pointer-events-none');
});

// Theme toggle handler (Light vs Dark mode)
themeToggleBtn.addEventListener('click', () => {
    isDarkMode = !isDarkMode;
    applyTheme();
    localStorage.setItem('stage_spinner_theme', isDarkMode ? 'dark' : 'light');
});

// Applies the selected theme class to the body element
function applyTheme() {
    if (isDarkMode) {
        document.body.classList.remove('light-mode');
        if (themeIcon) themeIcon.className = "fa-solid fa-moon text-amber-400";
    } else {
        document.body.classList.add('light-mode');
        if (themeIcon) themeIcon.className = "fa-solid fa-sun text-amber-500";
    }
}

// Preset modal toggle handlers
presetBtn.addEventListener('click', () => {
    presetModal.classList.remove('opacity-0', 'pointer-events-none');
});

closePresetBtn.addEventListener('click', () => {
    presetModal.classList.add('opacity-0', 'pointer-events-none');
});

// Loads selected preset configuration into the wheel
document.querySelectorAll('.preset-option').forEach(btn => {
    btn.addEventListener('click', () => {
        const type = btn.getAttribute('data-type');
        if (PRESETS[type]) {
            segments = JSON.parse(JSON.stringify(PRESETS[type]));
            renderSegmentsList();
            presetModal.classList.add('opacity-0', 'pointer-events-none');
        }
    });
});

// Sound effects toggle handler
soundToggle.addEventListener('click', () => {
    soundEnabled = !soundEnabled;
    if (soundEnabled) {
        soundIcon.className = "fa-solid fa-volume-high text-amber-400";
        soundToggle.childNodes[2].textContent = " Drumroll On";
    } else {
        soundIcon.className = "fa-solid fa-volume-xmark text-zinc-500";
        soundToggle.childNodes[2].textContent = " Drumroll Off";
    }
});

// Initialize application on window load
window.onload = function() {
    applyTheme();
    renderSegmentsList();
};

// Redraw wheel canvas when browser window is resized
window.addEventListener('resize', () => {
    drawWheel();
});

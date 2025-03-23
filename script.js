document.addEventListener('DOMContentLoaded', () => {
    const startBtn = document.getElementById('startBtn');
    const stopBtn = document.getElementById('stopBtn');
    const animationContainer = document.getElementById('animation-container');
    const audioSelect = document.getElementById('audioSource');
    const animationSelect = document.getElementById('animationSelect');

    // Initialize variables
    let audioContext;
    let analyser;
    let microphone;
    let javascriptNode;
    let animation;
    let currentAnimationType = 'listening1.json';
    let isBlueOrbActive = false;

    // Animation settings
    const minSpeed = 0.001;
    const maxSpeed = 2;
    const sensitivity = 1.5;
    const smoothingFactor = 0.05;
    let currentSpeed = minSpeed;

    // Populate animation selector
    const animations = ['listening1.json', 'listening2.json', 'soundwave.json', 'blueOrb'];
    animations.forEach(anim => {
        const option = document.createElement('option');
        option.value = anim;
        option.text = anim === 'blueOrb' ? 'Blue Orb' : anim.replace('.json', '');
        animationSelect.appendChild(option);
    });

    // Initialize animation with the first option
    loadAnimation(animations[0]);

    // Function to load animations
    function loadAnimation(animationType) {
        currentAnimationType = animationType;
        
        if (animationType === 'blueOrb') {
            if (animation) {
                animation.destroy();
                animation = null;
            }
            createBlueOrb();
            isBlueOrbActive = true;
        } else {
            isBlueOrbActive = false;
            if (animation) {
                animation.destroy();
            }
            animation = lottie.loadAnimation({
                container: animationContainer,
                renderer: 'svg',
                loop: true,
                autoplay: false,
                path: animationType
            });
        }
    }

    // Function to create blue orb SVG
    function createBlueOrb() {
        const svgNS = "http://www.w3.org/2000/svg";
        animationContainer.innerHTML = '';
        
        // Create the SVG element
        const svg = document.createElementNS(svgNS, "svg");
        svg.setAttribute("width", "100%");
        svg.setAttribute("height", "100%");
        svg.setAttribute("viewBox", "0 0 200 200");
        animationContainer.appendChild(svg);
        
        // Create the blue orb (circle)
        const circle = document.createElementNS(svgNS, "circle");
        circle.setAttribute("cx", "100");
        circle.setAttribute("cy", "100");
        circle.setAttribute("r", "50");
        circle.setAttribute("fill", "#0066ff");
        circle.setAttribute("id", "blueOrb");
        
        svg.appendChild(circle);
    }

    // Handle animation type change
    animationSelect.addEventListener('change', () => {
        if (!startBtn.disabled) {
            loadAnimation(animationSelect.value);
        }
    });

    // Process audio for Lottie animations
    function processLottieAudio() {
        const array = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(array);
        
        // Calculate volume across all frequencies
        const volume = array.reduce((a, b) => a + b) / array.length;
        
        // Check if there's sound (volume above threshold)
        const soundThreshold = 10;
        if (volume > soundThreshold) {
            // Play animation at constant speed when sound is detected
            if (animation.isPaused) {
                animation.play();
            }
            // Set a fixed speed (no scaling based on volume)
            animation.setSpeed(1.0);
        } else {
            // Pause animation when no sound
            if (!animation.isPaused) {
                animation.pause();
            }
        }
    }

    // Process audio for Blue Orb visualization
    function processBlueOrbAudio() {
        const array = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(array);
        
        const circle = document.getElementById('blueOrb');
        if (!circle) return;
        
        // Calculate overall volume - this is the raw volume without averaging
        const volume = array.reduce((a, b) => a + b, 0);
        
        // Direct scaling with maximum responsiveness
        const baseRadius = 50;
        const maxRadius = 120;
        const volumeRatio = volume / (128 * array.length);
        const newRadius = baseRadius + (volumeRatio * (maxRadius - baseRadius));
        
        // Apply the radius directly without any smoothing
        circle.setAttribute("r", newRadius);
    }

    // General audio processing function
    function processAudio() {
        if (isBlueOrbActive) {
            processBlueOrbAudio();
        } else if (animation) {
            processLottieAudio();
        }
    }

    // Function to populate audio input devices
    async function populateAudioDevices() {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const audioDevices = devices.filter(device => device.kind === 'audioinput');
            
            audioSelect.innerHTML = '';
            
            audioDevices.forEach(device => {
                const option = document.createElement('option');
                option.value = device.deviceId;
                option.text = device.label || `Microphone ${audioSelect.length + 1}`;
                audioSelect.appendChild(option);
            });
        } catch (error) {
            console.error('Error getting audio devices:', error);
        }
    }

    // Call once to populate initial device list
    populateAudioDevices();
    navigator.mediaDevices.addEventListener('devicechange', populateAudioDevices);

    async function startListening() {
        try {
            // Update the animation to match current selection
            loadAnimation(animationSelect.value);
            
            // Get selected device ID
            const selectedDeviceId = audioSelect.value;
            
            // Set up audio constraints
            const constraints = {
                audio: {
                    deviceId: selectedDeviceId ? { exact: selectedDeviceId } : undefined
                }
            };

            // Get audio stream
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            
            // Initialize audio context
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            analyser = audioContext.createAnalyser();
            analyser.fftSize = 256;
            // Reduce smoothing for more responsive visualization
            analyser.smoothingTimeConstant = 0.2;
            
            microphone = audioContext.createMediaStreamSource(stream);
            javascriptNode = audioContext.createScriptProcessor(1024, 1, 1);

            // Connect the nodes
            microphone.connect(analyser);
            analyser.connect(javascriptNode);
            javascriptNode.connect(audioContext.destination);
            
            // Start processing audio
            javascriptNode.onaudioprocess = processAudio;
            
            // Start animation if it's a Lottie animation
            if (!isBlueOrbActive && animation) {
                animation.play();
            }
            
            // Update UI
            startBtn.disabled = true;
            stopBtn.disabled = false;
            audioSelect.disabled = true;
            animationSelect.disabled = true;
        } catch (error) {
            console.error('Error:', error);
            alert('Error accessing audio input. Please check your system audio settings.');
        }
    }

    function stopListening() {
        // Stop audio processing
        if (javascriptNode) {
            javascriptNode.onaudioprocess = null;
            javascriptNode.disconnect();
        }
        if (microphone) microphone.disconnect();
        if (analyser) analyser.disconnect();
        if (audioContext) audioContext.close();

        // Stop animation if it's a Lottie animation
        if (!isBlueOrbActive && animation) {
            animation.pause();
        }

        // Reset speed
        currentSpeed = minSpeed;

        // Update UI
        startBtn.disabled = false;
        stopBtn.disabled = true;
        audioSelect.disabled = false;
        animationSelect.disabled = false;
    }

    // Request initial microphone permission to show device labels
    navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
            stream.getTracks().forEach(track => track.stop());
            populateAudioDevices();
        })
        .catch(error => console.error('Error getting initial permission:', error));

    // Event listeners
    startBtn.addEventListener('click', startListening);
    stopBtn.addEventListener('click', stopListening);
}); 
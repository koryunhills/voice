document.addEventListener('DOMContentLoaded', () => {
    const startBtn = document.getElementById('startBtn');
    const stopBtn = document.getElementById('stopBtn');
    const animationContainer = document.getElementById('animation-container');
    const audioSelect = document.getElementById('audioSource');

    // Initialize variables
    let audioContext;
    let analyser;
    let microphone;
    let javascriptNode;
    let animation;

    // Animation settings
    const minSpeed = 0.001;  // Reduced from 0.05 for slower minimum speed
    const maxSpeed = 3;   // Reduced from 4 for slower maximum speed
    const sensitivity = 1.5;   // Reduced from 3 for less dramatic changes
    const smoothingFactor = 0.05; // Reduced for even smoother transitions
    let currentSpeed = minSpeed;

    // Initialize animation
    animation = lottie.loadAnimation({
        container: animationContainer,
        renderer: 'svg',
        loop: true,
        autoplay: false,
        path: 'listening.json'
    });

    function processAudio() {
        const array = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(array);
        
        // Calculate volume across all frequencies
        const volume = array.reduce((a, b) => a + b) / array.length;
        
        // Non-linear mapping of volume to speed (slightly reduced exponential factor)
        const normalizedVolume = Math.pow(volume / 128, 1.3); // Reduced from 1.5 for gentler acceleration
        const targetSpeed = minSpeed + (normalizedVolume * (maxSpeed - minSpeed) * sensitivity);
        
        // Smooth the speed transition
        currentSpeed = currentSpeed + (targetSpeed - currentSpeed) * smoothingFactor;
        
        // Apply speed with bounds
        const boundedSpeed = Math.max(minSpeed, Math.min(currentSpeed, maxSpeed));
        animation.setSpeed(boundedSpeed);

        // Debug volume levels (optional)
        // console.log('Volume:', volume, 'Speed:', boundedSpeed);
    }

    // Function to populate audio input devices
    async function populateAudioDevices() {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const audioDevices = devices.filter(device => device.kind === 'audioinput');
            
            // Clear existing options
            audioSelect.innerHTML = '';
            
            // Add devices to select
            audioDevices.forEach(device => {
                const option = document.createElement('option');
                option.value = device.deviceId;
                option.text = device.label || `Microphone ${audioSelect.length + 1}`;
                audioSelect.appendChild(option);
            });

            console.log('Available audio devices:', audioDevices);
        } catch (error) {
            console.error('Error getting audio devices:', error);
        }
    }

    // Call once to populate initial device list
    populateAudioDevices();

    // Update device list when devices change
    navigator.mediaDevices.addEventListener('devicechange', populateAudioDevices);

    async function startListening() {
        try {
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
            analyser.smoothingTimeConstant = 0.5;
            
            microphone = audioContext.createMediaStreamSource(stream);
            javascriptNode = audioContext.createScriptProcessor(2048, 1, 1);

            // Connect the nodes
            microphone.connect(analyser);
            analyser.connect(javascriptNode);
            javascriptNode.connect(audioContext.destination);
            
            // Start processing audio
            javascriptNode.onaudioprocess = processAudio;
            
            // Start animation
            animation.play();
            
            // Update UI
            startBtn.disabled = true;
            stopBtn.disabled = false;
            audioSelect.disabled = true;

            console.log('Using audio input:', audioSelect.options[audioSelect.selectedIndex].text);

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

        // Stop animation
        animation.pause();

        // Reset speed
        currentSpeed = minSpeed;

        // Update UI
        startBtn.disabled = false;
        stopBtn.disabled = true;
        audioSelect.disabled = false;
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
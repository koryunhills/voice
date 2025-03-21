# Voice-Responsive Circle Animation

A simple web application that animates a circle based on voice input volume. The circle grows and shrinks in real-time as you speak.

## Features

- Real-time circle animation responding to microphone input
- Smooth transitions between size changes
- Simple, clean interface
- Cross-browser compatibility

## Implementation

### HTML Structure

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Voice-Responsive Circle</title>
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <div class="container">
        <div id="circle"></div>
        <div class="controls">
            <button id="startBtn">Start Listening</button>
            <button id="stopBtn" disabled>Stop</button>
        </div>
        <div class="status" id="status">Click "Start Listening" to begin</div>
    </div>
    <script src="script.js"></script>
</body>
</html>
```

### CSS Styling

```css
body {
    margin: 0;
    padding: 0;
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
    background-color: #f0f0f0;
    font-family: Arial, sans-serif;
}

.container {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 20px;
}

#circle {
    width: 100px;
    height: 100px;
    border-radius: 50%;
    background-color: #3498db;
    transition: transform 0.1s ease-out;
}

.controls {
    display: flex;
    gap: 10px;
}

button {
    padding: 10px 15px;
    background-color: #2980b9;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 16px;
}

button:disabled {
    background-color: #95a5a6;
    cursor: not-allowed;
}

button:hover:not(:disabled) {
    background-color: #3498db;
}

.status {
    margin-top: 10px;
    color: #7f8c8d;
}
```

### JavaScript Implementation

```javascript
document.addEventListener('DOMContentLoaded', () => {
    const circle = document.getElementById('circle');
    const startBtn = document.getElementById('startBtn');
    const stopBtn = document.getElementById('stopBtn');
    const status = document.getElementById('status');
    
    let audioContext;
    let analyser;
    let microphone;
    let javascriptNode;
    let isListening = false;
    
    // Base size of the circle
    const baseSize = 100;
    // Maximum size the circle can grow to
    const maxSize = 300;
    // Sensitivity factor - adjust this to make the circle more or less responsive
    const sensitivity = 4;
    
    startBtn.addEventListener('click', startListening);
    stopBtn.addEventListener('click', stopListening);
    
    function startListening() {
        // Check if browser supports the Web Audio API
        if (!window.AudioContext && !window.webkitAudioContext) {
            status.textContent = 'Web Audio API is not supported in this browser.';
            return;
        }
        
        // Create audio context
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        // Request access to the microphone
        navigator.mediaDevices.getUserMedia({ audio: true, video: false })
            .then(stream => {
                status.textContent = 'Listening to your voice...';
                startBtn.disabled = true;
                stopBtn.disabled = false;
                isListening = true;
                
                // Create an analyser node
                analyser = audioContext.createAnalyser();
                analyser.fftSize = 256;
                analyser.smoothingTimeConstant = 0.8;
                
                // Create a microphone input
                microphone = audioContext.createMediaStreamSource(stream);
                
                // Connect the microphone to the analyser
                microphone.connect(analyser);
                
                // Set up JavaScript node for processing
                javascriptNode = audioContext.createScriptProcessor(2048, 1, 1);
                analyser.connect(javascriptNode);
                javascriptNode.connect(audioContext.destination);
                
                // Process audio data
                javascriptNode.onaudioprocess = processAudio;
            })
            .catch(error => {
                status.textContent = 'Error accessing microphone: ' + error;
            });
    }
    
    function stopListening() {
        if (isListening) {
            if (javascriptNode) {
                javascriptNode.onaudioprocess = null;
                javascriptNode.disconnect();
            }
            
            if (microphone) {
                microphone.disconnect();
            }
            
            if (analyser) {
                analyser.disconnect();
            }
            
            if (audioContext) {
                // Close the audio context if supported
                if (audioContext.state !== 'closed' && audioContext.close) {
                    audioContext.close();
                }
            }
            
            isListening = false;
            status.textContent = 'Listening stopped';
            startBtn.disabled = false;
            stopBtn.disabled = true;
            
            // Reset circle size
            circle.style.transform = 'scale(1)';
        }
    }
    
    function processAudio(event) {
        // Get frequency data
        const array = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(array);
        
        // Calculate average volume
        let average = 0;
        for (let i = 0; i < array.length; i++) {
            average += array[i];
        }
        average = average / array.length;
        
        // Calculate size based on volume
        const scale = 1 + (average * sensitivity / 100);
        
        // Apply size limitation
        const finalScale = Math.min(scale, maxSize / baseSize);
        
        // Update circle size
        circle.style.transform = `scale(${finalScale})`;
    }
});
```

## Setup Instructions

1. Create a new project folder
2. Create three files in the folder:
   - `index.html`
   - `styles.css`
   - `script.js`
3. Copy the provided code into the respective files
4. Open `index.html` in a modern web browser

## Browser Permissions

The application requires microphone access. When you click "Start Listening," the browser will prompt for permission to use your microphone. You must allow this for the application to work.

## Customization Options

You can customize the animation by modifying these variables in the JavaScript:

- `baseSize`: The default size of the circle (in pixels)
- `maxSize`: The maximum size the circle can grow to (in pixels)
- `sensitivity`: How responsive the circle is to volume changes (higher = more responsive)

Additionally, you can change the circle's color, transition speed, and other visual properties in the CSS file.

## Troubleshooting

- **No permission prompt**: Make sure you're using HTTPS or localhost, as modern browsers require secure connections for microphone access
- **No animation**: Check browser console for errors, ensure your microphone is working properly
- **Lag or stuttering**: Try decreasing the FFT size or increasing the script processor buffer size

## Browser Compatibility

This application works in modern browsers that support the Web Audio API, including:
- Chrome 14+
- Firefox 23+
- Safari 6+
- Edge 12+

## License

This project is available under the MIT License.
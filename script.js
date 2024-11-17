// Dementia Audio App Script
// Author: Peter Leonard
// Date: November 17, 2024
// Description: JavaScript logic for the Dementia Audio App.

const audioContext = new (window.AudioContext || window.webkitAudioContext)();
let sourceNode = null;
let gateData = [];
let gateData2 = [];
let analyser = null;
let canvas = document.getElementById('visualizer');
let canvasCtx = canvas.getContext('2d');
let fileInput = document.getElementById('audioFile');
let currentAudioData = null;

function createBuffer(type, frequency) {
  const bufferSize = audioContext.sampleRate * 60; // 60 seconds of audio
  const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
  const data = buffer.getChannelData(0);

  if (type === 'whiteNoise') {
    for (let i = 0; i < data.length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
  } else if (type === 'sineWave') {
    for (let i = 0; i < data.length; i++) {
      data[i] = Math.sin((2 * Math.PI * frequency * i) / audioContext.sampleRate);
    }
  }

  return buffer;
}

function updateGateData() {
  const gateDuration = parseInt(document.getElementById('gateDuration').value, 10);
  const gateMinimum = parseFloat(document.getElementById('gateMinimum').value);
  const totalDuration = 1103;
  const fadeDuration = 3;


  gateData = [];
  gateData2 = [];

  /*
  // Set the gate to fully open (1.0) for the entire gate duration
  for (let i = 0; i < gateDuration; i++) {
    gateData.push(1.0);
    gateData2.push(0.0);    
  }

  // Set the gate to the minimum value for the rest of the duration
  for (let i = gateDuration; i < totalDuration; i++) {
    gateData.push(gateMinimum);
    gateData2.push(1.0);    
  }
  */

  for (let i = 0; i < fadeDuration; i++) {
                gateData.push(gateMinimum + (1.0 - gateMinimum) * (i / fadeDuration));
            }
            for (let i = fadeDuration; i < gateDuration - fadeDuration; i++) {
                gateData.push(1.0);
            }
            for (let i = gateDuration - fadeDuration; i < gateDuration; i++) {
                gateData.push(1.0 - (1.0 - gateMinimum) * ((i - (gateDuration - fadeDuration)) / fadeDuration));
            }
            for (let i = gateDuration; i < totalDuration; i++) {
                gateData.push(gateMinimum);
            }

  // Convert gate duration to milliseconds based on sample rate (44.1kHz assumed)
  const gateDurationMs = (gateDuration / audioContext.sampleRate) * 1000;
  
  // Update the displayed values in real-time
  document.getElementById('gateDurationValue').textContent = gateDuration + ' samples';
  document.getElementById('gateDurationMsValue').textContent = `(${gateDurationMs.toFixed(2)} ms)`;
  document.getElementById('gateMinimumValue').textContent = gateMinimum; // Update displayed gate minimum value
}

document.getElementById('gateDuration').addEventListener('input', function() {
  updateGateData();
  if (currentAudioData) {
    modulateAndPlayAudio(currentAudioData);
  }
});

// Add event listener for gateMinimum slider
document.getElementById('gateMinimum').addEventListener('input', function() {
  updateGateData();
  if (currentAudioData) {
    modulateAndPlayAudio(currentAudioData);
  }
});

function modulateAndPlayAudio(audioData) {
  updateGateData();

  const totalDuration = 1103;
  const modulatedAudioData = new Float32Array(audioData.length);

  for (let i = 0; i < audioData.length; i++) {
    const gateIndex = i % totalDuration;
    modulatedAudioData[i] = audioData[i] * gateData[gateIndex];
  }

  const modulatedBuffer = audioContext.createBuffer(1, modulatedAudioData.length, audioContext.sampleRate);
  modulatedBuffer.copyToChannel(modulatedAudioData, 0);

  if (sourceNode) {
    sourceNode.stop();
    sourceNode.disconnect();
  }

  sourceNode = audioContext.createBufferSource();
  sourceNode.buffer = modulatedBuffer;
  sourceNode.loop = true;
  sourceNode.connect(audioContext.destination);

  sourceNode.start();

  visualize();
}

// Function to resume the AudioContext
function resumeAudioContext() {
  if (audioContext.state === 'suspended') {
    audioContext.resume().then(() => {
      console.log('AudioContext resumed');
    }).catch((err) => {
      console.error('Error resuming AudioContext:', err);
    });
  }
}

// Start audio (main sound) and additional noise
function startAudio() {
  resumeAudioContext();  // Ensure AudioContext is resumed

  const soundType = document.getElementById('soundType').value;

  if (soundType === 'audioFile') {
    const file = fileInput.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = function(event) {
        audioContext.decodeAudioData(event.target.result, function(buffer) {
          currentAudioData = buffer.getChannelData(0);
          modulateAndPlayAudio(currentAudioData);
          stopAdditionalNoise();  // Start additional noise
        }, function(error) {
          console.error('Error decoding audio data:', error);
        });
      };
      reader.onerror = function(error) {
        console.error('Error reading file:', error);
      };
      reader.readAsArrayBuffer(file);
    } else {
      alert('Please select an audio file.');
    }
  } else {
    const frequency = parseFloat(document.getElementById('frequency').value);
    const buffer = createBuffer(soundType, frequency);
    currentAudioData = buffer.getChannelData(0);
    modulateAndPlayAudio(currentAudioData);
    startAdditionalNoise();  // Start additional noise
  }

    // Check if the screen width is less than 550px
    if (window.innerWidth <= 550) {
    // Show the mute alert
    const muteAlert = document.getElementById('muteAlert');
    muteAlert.style.display = 'block';
    
    // Hide the alert after 1.5 seconds
    setTimeout(function() {
      muteAlert.style.display = 'none';
    }, 1500);
  }

}

// Stop audio (main sound) and additional noise
function stopAudio() {
  if (sourceNode) {
    sourceNode.stop();
    sourceNode.disconnect();
    sourceNode = null;
  }

  stopAdditionalNoise();  // Stop additional noise
}

function visualize() {
  analyser = audioContext.createAnalyser();
  analyser.fftSize = 2048;
  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);
  canvasCtx.clearRect(0, 0, canvas.width, canvas.height);

  if (sourceNode) {
    sourceNode.connect(analyser);
  }

  function draw() {
    requestAnimationFrame(draw);
    analyser.getByteTimeDomainData(dataArray);
    canvasCtx.fillStyle = '#ffc0cb';
    canvasCtx.fillRect(0, 0, canvas.width, canvas.height);
    canvasCtx.lineWidth = 2;
    canvasCtx.strokeStyle = '#62186B';        
    canvasCtx.beginPath();
    const sliceWidth = canvas.width * 1.0 / bufferLength;
    let x = 0;
    for (let i = 0; i < bufferLength; i++) {
      const v = dataArray[i] / 128.0;
      const y = v * canvas.height / 2;
      if (i === 0) {
        canvasCtx.moveTo(x, y);
      } else {
        canvasCtx.lineTo(x, y);
      }
      x += sliceWidth;
    }
    canvasCtx.lineTo(canvas.width, canvas.height / 2);
    canvasCtx.stroke();
  }
  draw();
}

// Event listeners
document.getElementById('soundType').addEventListener('change', function () {
  const soundType = this.value; // Get the selected value
  const pulseAmplitudeContainer = document.getElementById('pulseAmplitudeContainer');
  const additionalNoiseControls = document.querySelector('.additional-noise-controls'); // Select the additional noise controls div

  // Start additional noise if Sine Wave or White Noise is selected
  if (soundType === 'sineWave' || soundType === 'whiteNoise') {
    additionalNoiseControls.style.display = 'block'; // Show additional noise controls
    startAdditionalNoise(); // Start additional noise
  } else {
    additionalNoiseControls.style.display = 'none'; // Hide additional noise controls
  }

  // Handle audio file selection
  if (soundType === 'audioFile') {
    fileInput.style.display = 'block'; // Show the file input
    pulseAmplitudeContainer.style.display = 'block'; // Show the Pulse Amplitude Range container
    document.getElementById('gateDuration').value = 319; // Set Gate Duration to 319 samples for Audio File
    document.getElementById('gateMinimum').value = 0.66; // Set Pulse Amplitude to 0.66 for Audio File
    document.getElementById('gateMinimumValue').textContent = '0.66'; // Update the displayed value

    // Stop current audio and reset current audio data
    stopAudio();
    currentAudioData = null; // Reset current audio data
  } else {
    fileInput.style.display = 'none'; // Hide the file input
    pulseAmplitudeContainer.style.display = 'none'; // Hide the Pulse Amplitude Range container
    document.getElementById('gateDuration').value = 44; // Set Gate Duration back to 44 samples
    document.getElementById('gateMinimum').value = 0.0; // Set Pulse Amplitude back to 0.0
    document.getElementById('gateMinimumValue').textContent = '0.0'; // Update the displayed value

    const frequency = parseFloat(document.getElementById('frequency').value);
    const buffer = createBuffer(soundType, frequency);
    currentAudioData = buffer.getChannelData(0); // Store current audio data
    modulateAndPlayAudio(currentAudioData); // Immediately play the new sound type
  }
});


// ADD ADDITIONAL NOISE ------------------------

// Reuse the main audioContext
const additionalNoiseGainNode = audioContext.createGain();
const additionalNoiseBuffer = createBuffer('whiteNoise', 0); // Frequency doesn't matter for white noise

additionalNoiseGainNode.connect(audioContext.destination);

// Set initial volume
let additionalNoiseVolume = 0.0; // Default volume level
additionalNoiseGainNode.gain.value = additionalNoiseVolume; // Start with the volume set to slider value

// Pre-create the noise buffer and keep it ready
let additionalNoiseSource = audioContext.createBufferSource();
additionalNoiseSource.buffer = additionalNoiseBuffer;
additionalNoiseSource.loop = true; // Loop the noise to avoid re-initializing

additionalNoiseSource.connect(additionalNoiseGainNode);

let isPlaying = false; // To track the playing state

// Start additional noise function
function startAdditionalNoise() {
  if (!isPlaying) { // Only start if not already playing
    additionalNoiseSource.start(0); // Start immediately
    isPlaying = true; // Update the playing state
  }
}

// Stop additional noise function
function stopAdditionalNoise() {
  if (isPlaying) { // Only stop if currently playing
    additionalNoiseSource.stop(); // Stop the current source
    additionalNoiseSource = audioContext.createBufferSource(); // Reset the source for next play
    additionalNoiseSource.buffer = additionalNoiseBuffer;
    additionalNoiseSource.loop = true; // Loop the new source
    additionalNoiseSource.connect(additionalNoiseGainNode); // Reconnect to gain node
    isPlaying = false; // Update the playing state
  }
}

// Volume slider event listener
const additionalNoiseVolumeSlider = document.getElementById('additionalNoiseVolume');
const additionalNoiseVolumeValue = document.getElementById('additionalNoiseVolumeValue');

// Update the volume when the slider changes
additionalNoiseVolumeSlider.addEventListener('input', function () {
  additionalNoiseVolume = parseFloat(this.value); // Store the new volume level
  additionalNoiseGainNode.gain.value = additionalNoiseVolume; // Directly apply the volume
  additionalNoiseVolumeValue.textContent = additionalNoiseVolume;
});
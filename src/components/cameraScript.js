// ###########
//    Video
// ###########

let videoElement = document.getElementById('videoSelect');
const cameraSelect = document.getElementById('cameraSelect');
let cameraUsed = "";
const exposureSlider = document.getElementById('exposure');

// Start streaming video from the specified device
async function startStream(deviceId) {
    const constraints = {
        video: {
            deviceId: deviceId ? { exact: deviceId } : undefined
        }
    };
    try {
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        videoElement.srcObject = stream;

        const videoTrack = stream.getVideoTracks()[0];
        const capabilities = videoTrack.getCapabilities();

        //TODO: Need to retest this with spectrometer
        if ('exposureMode' in capabilities) {
            // Set the exposure mode to manual
            await videoTrack.applyConstraints({
                advanced: [{ exposureMode: 'manual' }]
            });

            if ('exposureTime' in capabilities) {
                await videoTrack.applyConstraints({
                    advanced: [{ exposureTime: exposureSlider.value }]
                });
            }
            exposureSlider.addEventListener('input', () => {
                videoTrack.applyConstraints({
                    advanced: [{ exposureTime: parseFloat(exposureSlider.value) }]
                });
            });
        }
        // Makes sure the graph is drawn into its canvas the moment the stream starts
        videoElement.onloadedmetadata = () => {
            plotRGBLineFromCamera(videoElement, getYPercentage(), getStripeWidth());
        };
    } catch (error) {
        console.error('Error accessing camera: ', error);
        alert("Camera has not been found");
    }
}

// Get the available video devices (cameras)
async function getCameras() {
    try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');

        if (cameraSelect != null) {
            cameraSelect.innerHTML = '';
            videoDevices.forEach(device => {
                const option = document.createElement('option');
                option.value = device.deviceId;
                option.text = device.label || `Camera ${cameraSelect.length + 1}`;
                cameraSelect.appendChild(option);
            });
        }

        // If there are cameras, start with the first one
        if (videoDevices.length > 0) {
            startStream(videoDevices[0].deviceId);
            cameraUsed = videoDevices[0].deviceId;
        }
    } catch (error) {
        console.error('Error fetching devices: ', error);
    }
}

// Request camera access first to ensure permissions are granted
async function requestCameraAccess() {
    try {
        await navigator.mediaDevices.getUserMedia({ video: true });
        await getCameras();
    } catch (error) {
        console.error('Camera access was denied.', error);
        alert('Camera access was denied.');
    }
}

async function resetCamera() {
    const button = document.getElementById('pausePlayVideoButton');
    await startStream(cameraUsed);
    if (button.innerText === "Play"){
        button.innerText = "Pause";
    }
}

// Event listener to switch between cameras
if (cameraSelect != null) {
    cameraSelect.addEventListener('change', () => {
        startStream(cameraSelect.value);
        cameraUsed = cameraSelect.value;
    });
}

async function pausePlayVideo(){
    const button = document.getElementById("pausePlayVideoButton");
    if (button.innerText === "Pause"){
        videoElement.pause();
        button.innerText = "Play";
    }
    else{
        videoElement.play();
        button.innerText = "Pause";
    }
}

function getBackToCameraStream(){
    videoElement.style.display = 'none'; // Show the video element
    videoElement = document.getElementById('videoMain');
    videoElement.style.display = 'block'; // Show the video element
    document.getElementById("cameraWindowControlsOnMeasureCameraStreaming").style.display = "block";
    document.getElementById("cameraWindowControlsOnMeasureFromPicture").style.display = "none";
    resetCamera();
}

function loadImageIntoCamera() {
    // Create a file input element
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';

    // Add an event listener to handle the file selection
    input.addEventListener('change', function(event) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                const stream = videoElement.srcObject;
                if (stream) {
                    const tracks = stream.getTracks();
                    tracks.forEach(track => track.stop());
                    videoElement.srcObject = null;
                }
                videoElement.style.display = 'none'; // Hide the video element
                document.getElementById("cameraWindowControlsOnMeasureCameraStreaming").style.display = "none";
                document.getElementById("cameraWindowControlsOnMeasureFromPicture").style.display = "block";
                videoElement = document.getElementById('cameraImage');
                videoElement.src = e.target.result;
                videoElement.style.display = 'block'; // Show the image element
            };
            reader.readAsDataURL(file);
        }
    });

    // Trigger the file input click event to open the file dialog
    input.click();
}

function getElementWidth(element) {
    if (element instanceof HTMLVideoElement) {
        return element.videoWidth;
    } else if (element instanceof HTMLImageElement) {
        return element.naturalWidth;
    } else {
        console.log('Unsupported element type');
        throw new Error('Unsupported element type');
    }
}

function getElementHeight(element) {
    if (element instanceof HTMLVideoElement) {
        return element.videoHeight;
    } else if (element instanceof HTMLImageElement) {
        return element.naturalHeight;
    } else {
        throw new Error('Unsupported element type');
    }
}

// Request access and populate the camera list when the page loads
requestCameraAccess();

// #####################
//    Camera Exposure
// #####################
let isRecording = false; // Flag to track recording state

function openCameraExposure(){
    const window = document.getElementById("cameraExposureWindow");
    window.style.display = "block";
}

function closeCameraExposure(){
    const window = document.getElementById("cameraExposureWindow");
    window.style.display = "none";
}

function showCameraRecordingWindow(){
    document.getElementById("cameraRecordingIsOn").style.display = "block";
}

function  closeCameraRecordingWindow(){
    document.getElementById("cameraRecordingIsOn").style.display = "none";
}

function stopOngoingRecording(){
    if (isRecording) {
        isRecording = false; // Set flag to false to stop recording
        videoElement.play(); // Resume video playback
        closeCameraRecordingWindow();
    }
}

function startCameraCapture(){
    if (videoElement.paused){
        alert("Camera is paused! To start capture please unpause the camera!");
        return;
    }

    const inputRange = document.getElementById("NumOfSamples").value;
    const inputTime = document.getElementById("timeOfPause").value;
    const checkboxCombined = document.getElementById("toggleCombined");
    const checkboxRed = document.getElementById("toggleR");
    const checkboxGreen = document.getElementById("toggleG");
    const checkboxBlue = document.getElementById("toggleB");
    const checkboxGraph = document.getElementById("screenshotOfGraph");

    if (isNaN(inputRange) || inputRange <= 0) {
        alert("Number of captures must be a number greater than 0!");
        document.getElementById("NumOfSamples").focus();
        return;
    }
    if (isNaN(inputTime) || inputTime < 200) {
        alert("Pause in between captures must be a greater/equal than 200!");
        document.getElementById("timeOfPause").focus();
        return;
    }
    if (!checkboxCombined.checked && !checkboxRed.checked && !checkboxGreen.checked && !checkboxBlue.checked) {
        alert("At least one checkbox with a color must be checked!");
        return;
    }

    const zip = new JSZip();
    const images = [];
    let imageIndex = 0;

    // Funkcia na vytvorenie jednej snímky
    async function captureGraph() {
        if(!isRecording){
            return;
        }

        await videoElement.play();
        await new Promise(resolve => setTimeout(resolve, 200)); // Čaká 200 ms (upraviť podľa potreby)
        await videoElement.pause();

        // Capture video frame
        const videoCanvas = document.createElement('canvas');
        const ctx = videoCanvas.getContext('2d');
        videoCanvas.width = videoElement.videoWidth;
        videoCanvas.height = videoElement.videoHeight;
        ctx.drawImage(videoElement, 0, 0, videoCanvas.width, videoCanvas.height);
        const videoImageData = videoCanvas.toDataURL('image/png');
        images.push({ name: `video_frame_${imageIndex + 1}.png`, data: videoImageData });

        // Optionally capture graph if checkbox is checked
        if (checkboxGraph.checked) {
            const graphImageData = graphCanvas.toDataURL('image/png');
            images.push({ name: `graph_${imageIndex + 1}.png`, data: graphImageData });
        }

        imageIndex++;
        if(!isRecording){
            return;
        }

        if (imageIndex < inputRange) {
            setTimeout(captureGraph, inputTime-200); // Čaká a robí ďalšiu snímku
        } else {
            videoElement.play();
            createZip(); // Po poslednej snímke vytvor ZIP
        }
    }

    // Funkcia na vytvorenie ZIP súboru
    function createZip() {
        if(!isRecording){
            return;
        }

        images.forEach(image => {
            // Pridanie každej snímky do ZIP súboru
            zip.file(image.name, image.data.split(',')[1], { base64: true });
        });

        // Generovanie ZIP a jeho stiahnutie
        zip.generateAsync({ type: 'blob' }).then(function (content) {
            const url = URL.createObjectURL(content); // Vytvorenie URL z blobu
            const link = document.createElement('a');
            link.href = url;
            link.download = 'graphs.zip'; // Názov ZIP súboru
            link.click();

            // Uvoľnenie pamäte pre URL
            URL.revokeObjectURL(url);
        });

        isRecording = false;
        closeCameraRecordingWindow();
    }

    isRecording = true; // Set flag to true to start recording
    closeCameraExposure();
    showCameraRecordingWindow();
    // Začať sekvenciu snímok
    captureGraph();
}

// ##################
//    Graph save
// ##################

function saveGraphImage(){
    const checkboxCombined = document.getElementById("toggleCombined");
    const checkboxRed = document.getElementById("toggleR");
    const checkboxGreen = document.getElementById("toggleG");
    const checkboxBlue = document.getElementById("toggleB");

    if (!checkboxCombined.checked && !checkboxRed.checked && !checkboxGreen.checked && !checkboxBlue.checked) {
        alert("At least one checkbox with a color must be checked!");
        return;
    }

    let wasPaused = false;
    if(videoElement.paused){
        wasPaused = true;
    }
    videoElement.pause();

    const graphImageData = graphCanvas.toDataURL('image/png');

    // Vytvorenie dočasného odkazu na stiahnutie
    const link = document.createElement('a');
    link.href = graphImageData;
    link.download = 'graph.png'; // Názov uloženého súboru
    link.click();

    if (!wasPaused) {
        videoElement.play();
    }
}

function saveCameraImage(){
    const checkboxCombined = document.getElementById("toggleCombined");
    const checkboxRed = document.getElementById("toggleR");
    const checkboxGreen = document.getElementById("toggleG");
    const checkboxBlue = document.getElementById("toggleB");

    if (!checkboxCombined.checked && !checkboxRed.checked && !checkboxGreen.checked && !checkboxBlue.checked) {
        alert("At least one checkbox with a color must be checked!");
        return;
    }

    let wasPaused = false;
    if(videoElement.paused){
        wasPaused = true;
    }
    videoElement.pause();

    const videoCanvas = document.createElement('canvas');
    const ctx = videoCanvas.getContext('2d');
    videoCanvas.width = videoElement.videoWidth;
    videoCanvas.height = videoElement.videoHeight;
    ctx.drawImage(videoElement, 0, 0, videoCanvas.width, videoCanvas.height);
    const videoImageData = videoCanvas.toDataURL('image/png');

    // Vytvorenie dočasného odkazu na stiahnutie
    const link = document.createElement('a');
    link.href = videoImageData;
    link.download = 'graph.png'; // Názov uloženého súboru
    link.click();

    if (!wasPaused) {
        videoElement.play();
    }
}

// ##################
//    Canvas/Pasik
// ##################

function getStripeWidth(){
    return stripeWidth;
}

function decreaseStripeWidth() {
    const rangeInput = document.getElementById("stripeWidthRange");
    if (stripeWidth > parseInt(rangeInput.min, 10)) {
        rangeInput.value = stripeWidth - 1;
        updateStripeWidth(rangeInput.value);
    }
}

function increaseStripeWidth() {
    const rangeInput = document.getElementById("stripeWidthRange");
    if (stripeWidth < parseInt(rangeInput.max, 10)) {
        rangeInput.value = stripeWidth + 1;
        updateStripeWidth(rangeInput.value);
    }
}

// Aktualizuje hodnotu šírky pásika na základe posuvníka
function updateStripeWidth(value) {
    stripeWidth = parseInt(value, 10);
    document.getElementById("stripeWidthValue").textContent = value;
    var y = yPercentage * c.height;
    if (y < stripeWidth/2){
        y = stripeWidth/2;
        yPercentage = y / c.height;
    }
    else if (y + stripeWidth/2 > c.height){
        y = c.height - stripeWidth/2;
        yPercentage = y / c.height;
    }
    drawSelectionLine();
    if (videoElement) {
        plotRGBLineFromCamera(videoElement, getYPercentage(), stripeWidth);
    }
}

function getYPercentage() {
    return yPercentage;
}

// Draws the yellow selection line
function drawSelectionLine() {
    ctx.clearRect(0, 0, c.width, c.height); // Clear the canvas
    ctx.beginPath(); // Start a new path to avoid connecting lines
    ctx.strokeStyle = "rgba(255, 255, 0, 0.5)"; // Set line color to yellow
    ctx.lineWidth = getStripeWidth();
    var y = yPercentage * c.height; // Calculate Y-coordinate based on percentage
    ctx.moveTo(0, y);
    ctx.lineTo(c.width, y);
    ctx.stroke();
}

var c = document.getElementById("cameraWindowCanvasRecording");

// Unless the Canvas is present, nothing will be done with it
var ctx = c.getContext("2d", { willReadFrequently: true });
var yPercentage = 0.5; // Global variable representing Y position as a percentage (default to 50%)
var stripeWidth = 1
var videoWindow = document.getElementById("videoMainWindow");
var computedStyle = getComputedStyle(videoWindow);

c.width = parseInt(computedStyle.width, 10);
c.height = parseInt(computedStyle.height, 10);
//set max width of stripe
document.getElementById("stripeWidthRange").max = c.height;

// Event listener for mouse clicks on the canvas
c.addEventListener("click", function (event) {
    var rect = c.getBoundingClientRect(); // Get canvas position
    var y = event.clientY - rect.top; // Calculate Y within canvas
    if (y < getStripeWidth()/2){
        y = getStripeWidth()/2;
    }
    else if (y + getStripeWidth()/2 > c.height){
        y = c.height - getStripeWidth()/2;
    }
    yPercentage = y / c.height; // Update global variable as percentage
    drawSelectionLine(); // Redraw line at the new position
    if (videoElement) {
        plotRGBLineFromCamera(videoElement, getYPercentage(), getStripeWidth());
    }
});

// Initial draw of the line at the default percentage
drawSelectionLine();    // Initial draw of the line at the default percentage
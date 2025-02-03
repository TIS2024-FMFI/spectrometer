// ###########
//    Video
// ###########

// Video element
let videoElement = document.getElementById('videoSelect');
// Camera selection dropdown
const cameraSelect = document.getElementById('cameraSelect');
//current camera used
let cameraUsed = "";
// Exposure slider
const exposureSlider = document.getElementById('exposure');

/**
 * Start streaming video from the specified deviceId
 * @param deviceId
 */
async function startStream(deviceId) {
    const constraints = {
        video: {
            deviceId: deviceId ? { exact: deviceId } : undefined,
            width: { ideal: 1280 },
            height: { ideal: 720 }
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
            if(videoElement.videoWidth === 1280){
                document.getElementById("videoMainWindow").style.height = "214px";
            }
            plotRGBLineFromCamera(videoElement, getYPercentage(), getStripeWidth());
        };
    } catch (error) {
        console.error('Error accessing camera: ', error);
        alert("Camera has not been found");
    }
}

/**
 * Get the available video devices (cameras)
 */
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

/**
 * Request camera access first to ensure permissions are granted
 */
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

/**
 * Resets the camera stream with the current camera
 */
async function resetCamera() {
    document.getElementById("playVideoButton").style.display = "none";
    document.getElementById("pauseVideoButton").style.display = "block";
    await startStream(cameraUsed);
}

/**
 * Event listener to switch between cameras
 */
if (cameraSelect != null) {
    cameraSelect.addEventListener('change', () => {
        startStream(cameraSelect.value);
        cameraUsed = cameraSelect.value;
    });
}

/**
 * Pauses the video stream
 */
async function pauseVideo(){
    videoElement.pause();
    document.getElementById("playVideoButton").style.display = "inline";
    document.getElementById("pauseVideoButton").style.display = "none";
}

/**
 * Plays the video stream
 */
async function playVideo(){
    videoElement.play();
    document.getElementById("playVideoButton").style.display = "none";
    document.getElementById("pauseVideoButton").style.display = "inline";
}

/**
 * Changes the videoElement from img to video, so the camera can be used
 */
function getBackToCameraStream(){
    videoElement.style.display = 'none'; // Hide the image element
    videoElement = document.getElementById('videoMain');
    videoElement.style.display = 'inline'; // Show the video element
    document.getElementById("screenshotCameraButton").style.display = "inline";
    document.getElementById("cameraExposureButton").style.display = "inline";
    document.getElementById("cameraWindowControlsOnMeasureCameraStreaming").style.display = "flex";
    document.getElementById("cameraWindowControlsOnMeasureFromPicture").style.display = "none";
    resetCamera();
}

/**
 * Loads an image from the user's computer into the camera window
 */
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
                document.getElementById("screenshotCameraButton").style.display = "none";
                document.getElementById("cameraExposureButton").style.display = "none";
                videoElement = document.getElementById('cameraImage');
                videoElement.src = e.target.result;
                videoElement.style.display = 'block'; // Show the image element
                videoElement.onload = () => {
                    needToRecalculateMaxima = true;
                    plotRGBLineFromCamera(videoElement, getYPercentage(), getStripeWidth());
                };
            };
            reader.readAsDataURL(file);
        }
    });

    // Trigger the file input click event to open the file dialog
    input.click();
}

/**
 * Returns the width of the element (video or image)
 * @param element
 * @returns {number}
 */
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

/**
 * Returns the height of the element (video or image)
 * @param element
 * @returns {number}
 */
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

// Flag to track recording state
let isRecording = false;

/**
 * Opens the camera exposure window
 */
function openCameraExposure(){
    const window = document.getElementById("cameraExposureWindow");
    window.style.display = "block";
}

/**
 * Closes the camera exposure window
 */
function closeCameraExposure(){
    const window = document.getElementById("cameraExposureWindow");
    window.style.display = "none";
}

/**
 * Opens the waiting window while the graph is being recorded
 */
function showCameraRecordingWindow(){
    document.getElementById("cameraRecordingIsOn").style.display = "block";
}

/**
 * Closes the waiting window while the graph is being recorded
 */
function  closeCameraRecordingWindow(){
    document.getElementById("cameraRecordingIsOn").style.display = "none";
}

/**
 * Terminates the ongoing recording
 */
function stopOngoingRecording(){
    if (isRecording) {
        isRecording = false; // Set flag to false to stop recording
        videoElement.play(); // Resume video playback
        closeCameraRecordingWindow();
    }
}

/**
 * Starts the recording of the graph
 */
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

    // Creates one shot during the recording
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

    // Creates a ZIP file with all the captured images
    function createZip() {
        if(!isRecording){
            return;
        }

        images.forEach(image => {
            // Adds each image to the ZIP file
            zip.file(image.name, image.data.split(',')[1], { base64: true });
        });

        // Generates the ZIP file and creates a download link
        zip.generateAsync({ type: 'blob' }).then(function (content) {
            const url = URL.createObjectURL(content); // Vytvorenie URL z blobu
            const link = document.createElement('a');
            link.href = url;
            link.download = 'graphs.zip'; // Názov ZIP súboru
            link.click();

            // Revoke the URL to free up memory
            URL.revokeObjectURL(url);
        });

        isRecording = false;
        closeCameraRecordingWindow();
    }

    isRecording = true; // Set flag to true to start recording
    closeCameraExposure();
    showCameraRecordingWindow();
    // Start the recording process
    captureGraph();
}

// ##################
//    Graph save
// ##################

/**
 * Saves the graph as an image
 */
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
    if (videoElement instanceof HTMLImageElement){
        wasPaused = true;
    }
    else{
        if(videoElement.paused){
            wasPaused = true;
        }
        videoElement.pause();
    }

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

/**
 * Saves the camera image as an image
 */
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

/**
 * Returns the width of the stripe
 * @returns {number}
 */
function getStripeWidth(){
    return stripeWidth;
}

/**
 * Decreases the width of the stripe
 */
function decreaseStripeWidth() {
    const rangeInput = document.getElementById("stripeWidthRange");
    if (stripeWidth > parseInt(rangeInput.min, 10)) {
        rangeInput.value = stripeWidth - 1;
        updateStripeWidth(rangeInput.value);
    }
}

/**
 * Increases the width of the stripe
 */
function increaseStripeWidth() {
    const rangeInput = document.getElementById("stripeWidthRange");
    if (stripeWidth < parseInt(rangeInput.max, 10)) {
        rangeInput.value = stripeWidth + 1;
        updateStripeWidth(rangeInput.value);
    }
}

/**
 * Updates the width of the stripe based on the value
 * @param value
 */
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
        needToRecalculateMaxima = true;
        plotRGBLineFromCamera(videoElement, getYPercentage(), getStripeWidth());
    }
}

/**
 * Returns the Y position as a percentage
 * @returns {number}
 */
function getYPercentage() {
    return yPercentage;
}

/**
 * // Draws the yellow selection line knows as Stripe
 */
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

// Canvas for the camera window
var c = document.getElementById("cameraWindowCanvasRecording");

// Unless the Canvas is present, nothing will be done with it
var ctx = c.getContext("2d", { willReadFrequently: true });
var yPercentage = 0.5; // Global variable representing Y position as a percentage (default to 50%)
var stripeWidth = 1
var videoWindow = document.getElementById("videoMainWindow");
var computedStyle = getComputedStyle(videoWindow);

// Set the canvas width and height to match the video window
c.width = parseInt(computedStyle.width, 10);
c.height = parseInt(computedStyle.height, 10);

//set max width of stripe
document.getElementById("stripeWidthRange").max = c.height;

// Event listener for mouse clicks on the canvas
c.addEventListener("click", function (event) {
    c.height = parseInt(getComputedStyle(videoWindow).height,10);
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
        needToRecalculateMaxima = true;
        plotRGBLineFromCamera(videoElement, getYPercentage(), getStripeWidth());
    }
});

// Initial draw of the line at the default percentage
drawSelectionLine();
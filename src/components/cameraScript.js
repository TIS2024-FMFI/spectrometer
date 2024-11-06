// ###########
//    Video
// ###########

const videoElement = document.getElementById('video');
const cameraSelect = document.getElementById('cameraSelect');
let cameraUsed = "";

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

        // Makes sure the graph is drawn into its canvas the moment the stream starts
        videoElement.onloadedmetadata = () => {
            plotRGBLineFromCamera(videoElement, getYPercentage());
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

// Function to manually change to a camera with the given name (if it exists)
async function changeCamera(cameraName) {
    try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');

        // Find a device that matches the given name and start it
        if (videoDevices.find(device => device.label === cameraName)) {
            startStream(targetDevice.deviceId);
            cameraUsed = targetDevice.deviceId;
        } else {
            //TEMP remove
            if (videoDevices.length > 0) {
                startStream(videoDevices[0].deviceId);
                cameraUsed = videoDevices[0].deviceId;
            }
        }
    } catch (error) {
        console.error('Error switching camera:', error);
    }
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
        if (videoElement) {
            plotRGBLineFromCamera(videoElement, getYPercentage(), getStripeWidth());
        }
    }
}

// Request access and populate the camera list when the page loads
requestCameraAccess();

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
if (c != null) {
    var ctx = c.getContext("2d");
    var yPercentage = 0.5; // Global variable representing Y position as a percentage (default to 50%)
    var stripeWidth = 1
    var videoWindow = document.getElementById("videoWindow");
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
}
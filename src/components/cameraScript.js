// #####
// Video
// #####
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

        cameraSelect.innerHTML = '';
        videoDevices.forEach(device => {
            const option = document.createElement('option');
            option.value = device.deviceId;
            option.text = device.label || `Camera ${cameraSelect.length + 1}`;
            cameraSelect.appendChild(option);
        });

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
    await startStream(cameraUsed);
}

async function changeDisplay(){
    const setUp = document.getElementById('cameraWindowControlsOnSetUp');
    const measure = document.getElementById('cameraWindowControlsOnMeasure');
    if (window.getComputedStyle(measure).display === "none") {
        measure.style.display = "block";
        setUp.style.display = "none";
    }
    else{
        measure.style.display = "none";
        setUp.style.display = "block";
    }
}

async function blockChangingCamera(canChange = true){
    const setUp = document.getElementById('cameraWindowControlsOnSetUp');
    const measure = document.getElementById('cameraWindowControlsOnMeasure');
    if (canChange){
        measure.style.display = "none";
        setUp.style.display = "block";
    }
    else{
        measure.style.display = "block";
        setUp.style.display = "none";
    }
}

// Event listener to switch between cameras
cameraSelect.addEventListener('change', () => {
    startStream(cameraSelect.value);
    cameraUsed = cameraSelect.value;
});

// Request access and populate the camera list when the page loads
requestCameraAccess();

// ######
// Canvas
// ######
var c = document.getElementById("cameraWindowCanvas");
var ctx = c.getContext("2d");
var yPercentage = 0.5; // Global variable representing Y position as a percentage (default to 50%)

c.width = 640;
c.height = 480;

function drawLine() {
    ctx.clearRect(0, 0, c.width, c.height); // Clear the canvas
    ctx.beginPath(); // Start a new path to avoid connecting lines
    var y = yPercentage * c.height; // Calculate Y-coordinate based on percentage
    ctx.moveTo(0, y);
    ctx.lineTo(c.width, y);
    ctx.stroke();
}

// Event listener for mouse clicks on the canvas
c.addEventListener("click", function(event) {
    var rect = c.getBoundingClientRect(); // Get canvas position
    var y = event.clientY - rect.top; // Calculate Y within canvas
    yPercentage = y / c.height; // Update global variable as percentage
    drawLine(); // Redraw line at the new position
});

// Initial draw of the line at the default percentage
drawLine();
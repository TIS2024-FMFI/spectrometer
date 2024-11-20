
let currentStep = 1;
const TOTAL_STEPS = 3;

/**
 * Changes the step in the stepper
 * @param direction -1 = previous, 1 = next
 */
function changeStep(direction) {

    // Prevents moving from step2 to step 3 if it is not calibrated
    if (direction === 1) {
        if (currentStep === 2 && calibrationData.length === 0) {
            alert("No calibration data to export. Please calibrate first.");
            return;
        } else if (currentStep === 1 && cameraUsed.trim().length === 0) {
            alert("No available camera. Please connect a camera first.");
            return;
        }
    }

    document.getElementById(`step${currentStep}`).classList.remove('active');   //Remove the previous step
    currentStep += direction;   // Add the following step
    document.getElementById(`step${currentStep}`).classList.add('active');  //Add the current step

    if (currentStep === 1 || currentStep === TOTAL_STEPS) {
        videoElement = document.getElementById(currentStep === 1 ? "videoSelect" : "videoMain");
        resetCamera();
    }

    if (currentStep === 1) {
        document.getElementById('prevButton').disabled = true;
        document.getElementById('nextButton').disabled = false;
    } else if (currentStep === 2) {
        document.getElementById('prevButton').disabled = false;
        document.getElementById('nextButton').disabled = false;
    } else if (currentStep === 3) {
        document.getElementById('prevButton').disabled = true;
        document.getElementById('nextButton').disabled = true;
    }
}
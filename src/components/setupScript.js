
let currentStep = 1;

/**
 * Changes the step in the stepper
 * @param direction -1 = previous, 1 = next
 */
function changeStep(direction) {

    document.getElementById(`step${currentStep}`).classList.remove('active');   //Remove the previous step
    currentStep += direction;   // Add the following step
    document.getElementById(`step${currentStep}`).classList.add('active');  //Add the current step

    if (currentStep === 1) {
        document.getElementById('prevButton').disabled = true;
        document.getElementById('nextButton').disabled = false;
        videoElement = document.getElementById("videoSelect");
        resetCamera();
    } else if (currentStep === 2) {
        document.getElementById('prevButton').disabled = false;
        document.getElementById('nextButton').disabled = false;
        drawGridCalibration();
    } else if (currentStep === 3) {
        document.getElementById('stepper-buttons').classList.add('disabled');   // Removes stepper buttons
        videoElement = document.getElementById("videoMain");
        resetCamera();
    }
}
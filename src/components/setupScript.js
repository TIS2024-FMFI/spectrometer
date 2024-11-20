
let currentStep = 1;
const TOTAL_STEPS = 3;

/**
 * Changes the step in the stepper
 * @param direction -1 = previous, 1 = next
 */
function changeStep(direction) {

    document.getElementById(`step${currentStep}`).classList.remove('active');   //Remove the previous step
    currentStep += direction;   // Add the following step
    document.getElementById(`step${currentStep}`).classList.add('active');  //Add the current step

    if (currentStep === 1) {
        videoElement = document.getElementById("videoSelect");
        resetCamera();
    } else if (currentStep === TOTAL_STEPS) {
        videoElement = document.getElementById("videoMain");
        resetCamera();
    }

    // Enable or disable buttons based on the current step
    document.getElementById('prevButton').disabled = (currentStep === 1);
    document.getElementById('nextButton').disabled = (currentStep === TOTAL_STEPS);
}
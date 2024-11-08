let counter = 3; //number for the next input box

let polyFitCoefficientsArray = [];
let calibrationData = [];
let pixelCalPoints = [];
let nmCalPoints = [];

/**
 *Adds a pair of input boxes
 */
function addInputPair() {
    counter++;
    if (counter === 15) {
        return;
    }

    const container = document.getElementById("input-container");
    const div = document.createElement("div");

    const pointLabel = document.createElement("span");
    pointLabel.textContent = `Point ${counter}: `;

    // Create the first input for px with label
    const labelPx = document.createElement("label");
    labelPx.setAttribute("for", `point${counter}px`);
    const inputPx = document.createElement("input");
    inputPx.type = "number";
    inputPx.id = `point${counter}px`;

    // Create the second input for nm with label
    const labelNm = document.createElement("label");
    labelNm.setAttribute("for", `point${counter}nm`);
    const inputNm = document.createElement("input");
    inputNm.type = "number";
    inputNm.id = `point${counter}nm`;

    // Append everything to the div
    div.appendChild(pointLabel);
    div.appendChild(labelPx);
    div.appendChild(inputPx);
    div.appendChild(labelNm);
    div.appendChild(inputNm);

    // Append the div to the container
    container.appendChild(div);
}

/**
 * Removes one pair of input boxes
 */
function removeInputPair() {
    const inputContainer = document.getElementById("input-container");
    if (inputContainer.children.length > 3) {
        const lastInputPair = inputContainer.lastElementChild;
        inputContainer.removeChild(lastInputPair); // Remove the last input pair
        counter --;
        }
}

/**
 * Resets the values in the input boxes
 */
function resetInputBoxes() {
    for (let i = 1; i <= 3; i++) {
        const pxInput = document.getElementById(`point${i}px`);
        const nmInput = document.getElementById(`point${i}nm`);
        pxInput.value = ""; // Set px value
        nmInput.value = ""; // Set nm value
    }
}

/**
 * Removes all the additional boxes that were already added by the user
 */
function deleteAllAdditionalInputPairs() {
    if (counter !== 3) {
        for (let i = counter; i !== 3; i--) {
            removeInputPair();
        }
    }
}

/**
 * Saves the calibration points from the input boxes
 */
function setCalibrationPoints() {
    resetCalValues(); //resets the contet of arrays before saving new calibration points
    for (let i = 1; i < counter + 1; i++) {
        const pxInput = document.getElementById(`point${i}px`);
        const nmInput = document.getElementById(`point${i}nm`);

        // Ensure both inputs exist before trying to get their values
        if (pxInput && nmInput) {
            const pxValue = parseFloat(pxInput.value);
            const nmValue = parseFloat(nmInput.value);

            if (!isNaN(pxValue) && !isNaN(nmValue)) {
                calibrationData.push({ px: pxValue, nm: nmValue });
            }
        }
    }
    calibrate();
}

/**
 * Creates an array of coefficients with the help of the Polynomial Regression located in polynomialReggressionScript.js
 */
function calibrate() {
    for (let i = 0; i < calibrationData.length; i++) {
        const point = calibrationData[i];
        pixelCalPoints.push(point.px);
        nmCalPoints.push(point.nm);
    }
    const polyfit = new Polyfit(pixelCalPoints, nmCalPoints);

    if (nmCalPoints.length === 3) {
        polyFitCoefficientsArray = polyfit.computeCoefficients(2);
    }
    else if (nmCalPoints.length > 3) {
        polyFitCoefficientsArray = polyfit.computeCoefficients(3);
    }
}

/**
 * Gets the wave Length from the pixel
 */
function getWaveLengthByPx(pixel) {
    let waveLength = 0; // ?????
    for (let i = 0; i < polyFitCoefficientsArray.length; i++) {
        let number = parseFloat(polyFitCoefficientsArray[i]);
        if (i === 0) {
            waveLength += number;
        }
        else {
            waveLength += number * Math.pow(pixel, i); // Calculate each term: coefficient * (pixel^i)
        }
    }
    return waveLength;
}

/**
 * delets the content of polyFitCoefficientsArray, calibrationData, pixelCalPoints, nmCalPoints before saving new values
 */
function resetCalValues() {
    polyFitCoefficientsArray = [];
    calibrationData = [];
    pixelCalPoints = [];
    nmCalPoints = [];
}

/**
 * Exports calibration settings into a .txt file
 */
function exportCalibrationFile() {
    // Check if there are any calibration points to export
    if (calibrationData.length === 0) {
        alert("No calibration data to export. Please calibrate first.");
        return;
    }

    // Map each point to a line of raw `px` and `nm` values separated by a comma
    const lines = calibrationData.map(point => `${point.px},${point.nm}`).join("\n");

    // Create a Blob from the lines with plain text format
    const blob = new Blob([lines], { type: "text/plain" });
    const url = URL.createObjectURL(blob);

    // Create a temporary anchor element to trigger the download
    const a = document.createElement("a");
    a.href = url;
    a.download = "calibration_points.txt";
    document.body.appendChild(a);
    a.click();

    // Clean up by revoking the Object URL and removing the element
    URL.revokeObjectURL(url);
    document.body.removeChild(a);
}

/**
 * Lets the user choose a file and then automatically fill out input boxes with the calibration points from the file
 */
function importCalibrationFile() {
    resetCalibrationPoints();

    const fileInput = document.getElementById("my-file");
    const file = fileInput.files[0]; // Get the selected file

    const reader = new FileReader();

    //reading the content of the file
    reader.onload = function(event) {
        const fileContent = event.target.result; // Get file content as text

        const lines = fileContent.split("\n").map(line => line.trim()).filter(line => line.length > 0);

        // If there are more than 3 lines, add extra input pairs for the additional lines
        const extraLines = lines.length - 3;
        for (let i = 0; i < extraLines; i++) {
            addInputPair(); // Add extra input fields dynamically
        }

        // Fills the input fields with the file content
        for (let i = 0; i < lines.length; i++) {
            const [px, nm] = lines[i].split(",");
            const pxInput = document.querySelector(`#point${i+1}px`);
            const nmInput = document.querySelector(`#point${i+1}nm`);

            if (pxInput && nmInput) {
                pxInput.value = px.trim(); // Set px value
                nmInput.value = nm.trim(); // Set nm value
            }
        }
    };

    reader.readAsText(file); // Read the file as text (adjust if you need other formats)
}

/**
 * Resets
 */
function resetCalibrationPoints() {
    deleteAllAdditionalInputPairs();
    resetInputBoxes();
    counter = 3;
}



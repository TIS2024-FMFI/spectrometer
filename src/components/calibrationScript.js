/**
 * Number for the next input box
 * @type {number}
 */
let inputBoxCounter = 3;
let polyFitCoefficientsArray = [];
let calibrationData = [];
let pixelCalPoints = [];
let nmCalPoints = [];
let nMAxis = []

let graphCanvasCalibration;
let graphCtxCalibration;

/**
 *Adds a pair of input boxes
 */
function addInputPair() {
    inputBoxCounter++;
    if (inputBoxCounter >= 15) {
        return;
    }

    const container = document.getElementById("input-container");
    const div = document.createElement("div");

    // Label for the translation of "Point"
    const pointLabel = document.createElement("label");
    pointLabel.setAttribute("data-translate", "point")

    // Label for the numbering
    const numberLabel = document.createElement("label");
    numberLabel.textContent = ` ${inputBoxCounter}: `;

    // Create the first input for px with label
    const inputPx = document.createElement("input");
    inputPx.id = `point${inputBoxCounter}px`;
    inputPx.type = "number";

    // Create the second input for nm with label
    const inputNm = document.createElement("input");
    inputNm.id = `point${inputBoxCounter}nm`;
    inputNm.type = "number";

    // Append everything to the div
    div.appendChild(pointLabel);
    div.appendChild(numberLabel);
    div.appendChild(inputPx);
    div.appendChild(inputNm);

    // Append the div to the container
    container.appendChild(div);

    // Sets the labels for the new pair
    updateTextContent();
}

/**
 * Removes one pair of input boxes
 */
function removeInputPair() {
    const inputContainer = document.getElementById("input-container");
    if (inputContainer.children.length > 3) {
        const lastInputPair = inputContainer.lastElementChild;
        inputContainer.removeChild(lastInputPair); // Remove the last input pair
        inputBoxCounter --;
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
    if (inputBoxCounter !== 3) {
        for (let i = inputBoxCounter; i !== 3; i--) {
            removeInputPair();
        }
    }
}

/**
 * Saves the calibration points from the input boxes
 */
function setCalibrationPoints() {
    resetCalValues(); //resets the content of arrays before saving new calibration points
    for (let i = 1; i < inputBoxCounter + 1; i++) {
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

    if (calibrationData.length < 3) {
        resetCalValues();
        window.alert("Insufficient number of calibration points");
        return;
    }

    calibrate();
    clearGraph(graphCtxCalibration, graphCanvasCalibration);
    drawGridCalibration();
    drawCalibrationLine();
    drawCalibrationPoints();
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
    }}

/**
 * Gets the wave Length from the pixel
 */
function getWaveLengthByPx(pixel) {
    let waveLength = 0;
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
 * deletes the content of polyFitCoefficientsArray, calibrationData, pixelCalPoints, nmCalPoints before saving new values
 */
function resetCalValues() {
    polyFitCoefficientsArray = [];
    calibrationData = [];
    pixelCalPoints = [];
    nmCalPoints = [];
    nMAxis = [];
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
 * Converts the Px Axis into Nm using with the help of the calibration points
 * @returns {*[]}
 */
function convertPxAxisIntoNm(){
    for (let i = 1; i <= 1920; i++) {
        nMAxis.push(getWaveLengthByPx(i));
    }
    return nMAxis;
}
/**
 * Empties the input boxes and removes all the additional ones
 */
function resetCalibrationPoints() {
    deleteAllAdditionalInputPairs();
    resetInputBoxes();
    resetCalValues();
    inputBoxCounter = 3;
}

/**
 * Draws the grid of the graph
 */
function drawGridCalibration() {
    graphCanvasCalibration = document.getElementById('graphCalibration');
    graphCtxCalibration = graphCanvasCalibration.getContext('2d');
    clearGraph(graphCtxCalibration, graphCanvasCalibration);
    const width = graphCanvasCalibration.width;
    const height = graphCanvasCalibration.height;
    const padding = 30;

    const yMin = 350;
    const yMax = 1000;
    const numOfYLabels = 30;
    const yStep = Math.ceil((yMax - yMin) / numOfYLabels / 5) * 5;

    graphCtxCalibration.beginPath();
    graphCtxCalibration.strokeStyle = '#e0e0e0';
    graphCtxCalibration.lineWidth = 0.5;
    graphCtxCalibration.font = '10px Arial';
    graphCtxCalibration.fillStyle = 'black';

    for (let i = 0; i <= numOfYLabels; i++) {
        const yValue = yMax - i * yStep;
        if (yValue < yMin) { break; }

        const y = padding + ((height - 2 * padding) / (yMax - yMin)) * (yMax - yValue);
        graphCtxCalibration.moveTo(padding, y);
        graphCtxCalibration.lineTo(width - padding, y);
        graphCtxCalibration.fillText(yValue.toFixed(0), 5, y + 3);
    }

    const xMin = 0;
    const xMax = 1280;
    const numOfXLabels = 32;
    const xStep = Math.ceil((xMax - xMin) / numOfXLabels / 5) * 5;

    for (let i = 0; i <= numOfXLabels; i++) {
        const xValue = i * xStep;
        if (xValue > xMax) { break; }

        const x = padding + ((xValue - xMin) / xMax) * (width - 2 * padding);
        graphCtxCalibration.moveTo(x, padding);
        graphCtxCalibration.lineTo(x, height - padding);
        graphCtxCalibration.font = xValue >= 1000 ? '9px Arial' : '10px Arial';
        graphCtxCalibration.fillText(xValue.toFixed(0), x - 7, height - padding + 15);
    }

    graphCtxCalibration.stroke();
}

/**
 * Draws the function created from the pixelCalPoints and nmCalPoints arrays
 */
function drawCalibrationLine() {
    const width = graphCanvasCalibration.width;
    const height = graphCanvasCalibration.height;
    const padding = 30;

    const interpolate = lagrangeInterpolation(pixelCalPoints, nmCalPoints);

    const rangeBeginX = 0;
    const rangeEndX = 1280;
    const rangeBeginY = 350;
    const rangeEndY = 1000;

    graphCtxCalibration.beginPath();

    const stepSize = 5; // Space between plot points
    let firstPoint = true;

    for (let x = 0; x <= 1280; x += stepSize) {
        const yInterpolated = interpolate(x);

        // Scale x and y to fit within the graph dimensions
        let xScaled = padding + ((x - rangeBeginX) / (rangeEndX - rangeBeginX)) * (width - 2 * padding);
        let yScaled = height - padding - ((yInterpolated - rangeBeginY) / (rangeEndY - rangeBeginY)) * (height - 2 * padding);

        if (firstPoint) {
            graphCtxCalibration.moveTo(xScaled, yScaled);
            firstPoint = false;
        } else {
            graphCtxCalibration.lineTo(xScaled, yScaled);
        }
    }

    graphCtxCalibration.strokeStyle = 'blue';
    graphCtxCalibration.lineWidth = 1.5;
    graphCtxCalibration.stroke();
}

/**
 * Returns a function made from arrX and arrY points
 * @param arrX represents the x value for each point
 * @param arrY represents the y value for each point
 * @returns {function(*): number}
 */
function lagrangeInterpolation(arrX, arrY) {
    return function(x) {
        let result = 0;

        for (let i = 0; i < arrX.length; i++) {
            let term = arrY[i];
            for (let j = 0; j < arrX.length; j++) {
                if (i !== j) {
                    term *= (x - arrX[j]) / (arrX[i] - arrX[j]);
                }
            }
            result += term;
        }
        return result;
    };
}

/**
 * Draws the points represented by nmCalPoints and pixelCalPoints
 */
function drawCalibrationPoints() {
    const width = graphCanvasCalibration.width;
    const height = graphCanvasCalibration.height;
    const padding = 30;

    const rangeBeginX = 0;
    const rangeEndX = 1280;
    const rangeBeginY = 350;
    const rangeEndY = 1000;

    for (let i = 0; i < nmCalPoints.length; i++) {
        const x = padding + ((pixelCalPoints[i] - rangeBeginX) / (rangeEndX - rangeBeginX)) * (width - 2 * padding);
        const y = height - padding - ((nmCalPoints[i] - rangeBeginY) / (rangeEndY - rangeBeginY)) * (height - 2 * padding);

        // Draw point
        graphCtxCalibration.fillStyle = 'red';
        graphCtxCalibration.strokeStyle = 'red';
        graphCtxCalibration.beginPath();
        graphCtxCalibration.arc(x, y, 4, 0, 2 * Math.PI);
        graphCtxCalibration.fill();
        graphCtxCalibration.stroke();
    }
}
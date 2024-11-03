let counter = 4; //number for the next input box
let calibrationData = [];

/**
 *Adds a pair of input boxes
 */
function addInputPair() {
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

    counter++;
}

/**
 * Saves the calibration points from the input boxes
 */
function calibrate() {
    for (let i = 1; i < counter; i++) {
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
}

/**
 * Exports calibration settings into a .txt file
 */
function exportCalFile() {
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


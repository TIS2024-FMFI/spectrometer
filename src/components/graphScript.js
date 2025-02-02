// Slúži na priblíženie grafu na základe kliknutia na canvas
let zoomList = [];
let cursorCoordinates = { x: 'N/A', y: 'N/A' };
let isDragging = false;
let dragStartX = 0;
let dragEndX = 0;
let animationId;
let smoothing = 0;
let minValue = 0;
let referenceColors = ['#ff7602' ,'#ffdd00' ,'#00ffd3' ,'#8f5bf8',
                                '#d64d4d', '#a6794b', '#77ba7b', '#f800ff',
                                '#f89a8e', '#cabb6e', '#237c24', '#3109a5',
                                '#ff6767', '#545a03', '#4cb15f', '#6a0345',
                                '#a51104', '#ffbb28', '#1a371a', '#470925',
                                '#9f9f00', '#a8ac6b', '#956f83', '#a53be4']
let referenceGraph = [];
let captureReferenceGraph = false;
let showReferenceGraph = false;
let needToRecalculateMaxima = true;
let maxima = [];


function plotRGBLineFromCamera(videoElement, stripePosition = 0.5, stripeWidth = 1) {
    if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
    }

    const lineCanvas = createLineCanvas(videoElement, stripeWidth);
    const ctx = lineCanvas.getContext('2d', { willReadFrequently: true });
    const graphCanvas = document.getElementById('graphCanvas');
    const graphCtx = graphCanvas.getContext('2d', { willReadFrequently: true });

    function draw() {
        drawGraphLine(videoElement, ctx, graphCtx, graphCanvas, stripePosition, stripeWidth);
        if (!(videoElement instanceof HTMLImageElement)) {
            animationId = requestAnimationFrame(draw);
            if (!videoElement.paused) {
                needToRecalculateMaxima = true;
            }
        }
    }

    setupEventListeners(videoElement, draw, graphCanvas);
    draw();
}

function drawGraphLine(videoElement, ctx, graphCtx, graphCanvas, stripePosition, stripeWidth) {
    const { toggleCombined, toggleR, toggleG, toggleB } = getToggleStates();
    const startY = getElementHeight(videoElement) * stripePosition - stripeWidth / 2;
    ctx.drawImage(videoElement, 0, startY, getElementWidth(videoElement), stripeWidth, 0, 0, getElementWidth(videoElement), stripeWidth);

    let pixels = ctx.getImageData(0, 0, getElementWidth(videoElement), stripeWidth).data;
    let pixelWidth = getElementWidth(videoElement);

    if (stripeWidth > 1) {
        pixels = averagePixels(pixels, pixelWidth, stripeWidth);
    }

    if (captureReferenceGraph) {
        referenceGraph.push([pixels, pixelWidth, smoothing, minValue]);
        captureReferenceGraph = false;
    }

    if (needToRecalculateMaxima && document.getElementById('togglePeaksCheckbox').checked) {
        maxima = findMaxima(pixels, pixelWidth, minValue);
        needToRecalculateMaxima = false;
    }

    let [zoomStart, zoomEnd] = getZoomRange(pixelWidth);

    if (zoomList.length === 2 && (zoomEnd - zoomStart) >= 2) {
        pixels = pixels.slice(zoomStart * 4, zoomEnd * 4);
        pixelWidth = zoomEnd - zoomStart;
    }

    clearGraph(graphCtx, graphCanvas);
    drawGrid(graphCtx, graphCanvas, zoomStart, zoomEnd);

    if (showReferenceGraph) {
        for (let i = 0; i < referenceGraph.length; i++) {
            let [tempPixels, tempPixelWidth, tempSmoothing, tempMinValue] = referenceGraph[i];
            if (zoomList.length === 2) {
                tempPixels = tempPixels.slice(zoomStart * 4, zoomEnd * 4);
                tempPixelWidth = zoomEnd - zoomStart;
            }
            drawLine(graphCtx, tempPixels, tempPixelWidth, referenceColors[i % referenceColors.length], -1, tempSmoothing, tempMinValue);
        }
    }

    if (toggleCombined) {
        drawLine(graphCtx, pixels, pixelWidth, 'black', -1, smoothing, minValue);
    }
    if (toggleR) {
        drawLine(graphCtx, pixels, pixelWidth, 'red', 0, smoothing, minValue);
    }
    if (toggleG) {
        drawLine(graphCtx, pixels, pixelWidth, 'green', 1, smoothing, minValue);
    }
    if (toggleB) {
        drawLine(graphCtx, pixels, pixelWidth, 'blue', 2, smoothing, minValue);
    }

    if (document.getElementById('togglePeaksCheckbox').checked && maxima.length > 0) {
        drawMaxima(graphCtx, maxima, graphCanvas, zoomStart, zoomEnd);
    }

    if (isDragging) {
        const rectX = Math.min(dragStartX, dragEndX);
        const rectWidth = Math.abs(dragStartX - dragEndX);
        graphCtx.fillStyle = 'rgba(0, 0, 255, 0.2)';
        graphCtx.fillRect(rectX, 30, rectWidth, graphCanvas.height - 60);
    }

    drawCursorCoordinates(graphCtx, graphCanvas, cursorCoordinates, videoElement, pixels);
}

function drawCursorCoordinates(graphCtx, graphCanvas, cursorCoordinates, videoElement, pixels) {
    let displayX = cursorCoordinates.x;
    let displayY = cursorCoordinates.y;
    let elementWidth;

    if (videoElement instanceof HTMLImageElement) {
        elementWidth = videoElement.naturalWidth;
    } else {
        elementWidth = videoElement.videoWidth;
    }

    let xLowerBound = 0;
    let xUpperBound = elementWidth;

    if (zoomList.length === 2) {
        const [zoomStart, zoomEnd] = zoomList;
        displayX = Math.round(zoomStart + (displayX / (graphCanvas.width - 60)) * (zoomEnd - zoomStart));
        xLowerBound = zoomStart;
        xUpperBound = zoomEnd;
    }

    if (displayX < xLowerBound || displayX > xUpperBound || displayY < 0 || displayY > 255) {
        displayX = 'N/A';
        displayY = 'N/A';
    }

    const toggleYCoordinate = document.getElementById('toggleYCoordinate').checked;
    if (toggleYCoordinate && displayX !== 'N/A') {
        const graphData = getGraphDataAtX(displayX, pixels, xLowerBound, xUpperBound); // Pass pixels and pixelWidth
        displayY = graphData ? graphData.y : 'N/A';
    }

    const textX = `X: ${displayX}`;
    const textY = `Y: ${displayY}`;
    const textWidthX = graphCtx.measureText(textX).width;
    const textWidthY = graphCtx.measureText(textY).width;
    const textXPos = graphCanvas.width - Math.max(textWidthX, textWidthY);

    graphCtx.clearRect(textXPos - 5, 0, Math.max(textWidthX, textWidthY) + 10, 15);
    graphCtx.fillStyle = 'white';
    graphCtx.fillRect(textXPos - 5, 0, Math.max(textWidthX, textWidthY) + 10, 15);
    graphCtx.fillStyle = 'black';
    graphCtx.font = '10px Arial'; // Smaller font size
    graphCtx.fillText(textX, textXPos, 12); // X coordinate
    graphCtx.fillText(textY, textXPos, 24); // Y coordinate
}

function getGraphDataAtX(x, pixels, xStart, xEnd) {
    console.log(x, xEnd)
    if (x < 0 || x >= xEnd) {
        return { y: 'N/A' };
    }

    let y = calculateMaxColor(pixels, x - xStart);
    if (smoothing > 0) {
        y = Math.floor(smoothedValue(pixels, x - xStart, -1, smoothing, xEnd));
    }

    return { y };
}

function averagePixels(pixels, pixelWidth, stripeWidth) {
    let averagedPixels = new Uint8ClampedArray(pixelWidth * 4);
    for (let x = 0; x < pixelWidth; x++) {
        let r = 0, g = 0, b = 0, a = 0;
        for (let y = 0; y < stripeWidth; y++) {
            r += pixels[(y * pixelWidth + x) * 4];
            g += pixels[(y * pixelWidth + x) * 4 + 1];
            b += pixels[(y * pixelWidth + x) * 4 + 2];
            a += pixels[(y * pixelWidth + x) * 4 + 3];
        }
        averagedPixels[x * 4] = r / stripeWidth;
        averagedPixels[x * 4 + 1] = g / stripeWidth;
        averagedPixels[x * 4 + 2] = b / stripeWidth;
        averagedPixels[x * 4 + 3] = a / stripeWidth;
    }
    return averagedPixels;
}

function findMaxima(pixels, pixelWidth, minValue) {
    let maxima = [];
    let start = null;

    for (let x = 1; x < pixelWidth - 1; x++) {
        let value = smoothedValue(pixels, x, -1, smoothing, pixelWidth);
        let prevValue = smoothedValue(pixels, x - 1, -1, smoothing, pixelWidth);
        let nextValue = smoothedValue(pixels, x + 1, -1, smoothing, pixelWidth);

        if (value > minValue && value >= prevValue && value >= nextValue) {
            if (start === null && prevValue < value) {
                start = x;
            }
        } else {
            if (start !== null) {
                let end = x - 1;
                let plateauValue = smoothedValue(pixels, start, -1, smoothing, pixelWidth);
                let nextPlateauValue = smoothedValue(pixels, x, -1, smoothing, pixelWidth);

                if (plateauValue > nextPlateauValue) {
                    maxima.push({ x: Math.floor((start + end) / 2), value: Math.floor(plateauValue) });
                }
                start = null;
            }
        }
    }

    // Check for maximum at the first pixel
    if (smoothedValue(pixels, 0, -1, smoothing, pixelWidth) > smoothedValue(pixels, 1, -1, smoothing, pixelWidth)) {
        maxima.push({ x: 0, value: Math.floor(smoothedValue(pixels, 0, -1, smoothing, pixelWidth)) });
    }

    // Check for maximum at the last pixel
    if (smoothedValue(pixels, pixelWidth - 1, -1, smoothing, pixelWidth) > smoothedValue(pixels, pixelWidth - 2, -1, smoothing, pixelWidth)) {
        maxima.push({ x: pixelWidth - 1, value: Math.floor(smoothedValue(pixels, pixelWidth - 1, -1, smoothing, pixelWidth)) });
    }

    return maxima;
}

// console.log(`x: ${x}, value: ${value}, left: ${prevValue}, right: ${nextValue}`);
// console.log('Maxima:', maxima);

function drawDottedLine(ctx, x, yStart, yEnd, color) {
    ctx.beginPath();
    ctx.setLineDash([5, 5]); // Set the line dash pattern
    ctx.moveTo(x, yEnd); // Start from the bottom
    ctx.lineTo(x, yStart); // Draw to the peak value
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.setLineDash([]); // Reset the line dash pattern
}

function drawMaxima(ctx, maxima, canvas, zoomStart, zoomEnd) {
    const padding = 30;
    const height = canvas.height;
    maxima.forEach(max => {
        if (max.x >= zoomStart && max.x <= zoomEnd) {
            const x = calculateXPosition(max.x - zoomStart, zoomEnd - zoomStart, canvas.width);
            const y = calculateYPosition(max.value, height);
            drawDottedLine(ctx, x, height - padding, y, 'red');
            drawPeakLabel(ctx, x, y, max.x, max.value);
        }
    });
}

function drawPeakLabel(ctx, x, y, peakX, peakY) {
    const label = `(${peakX}, ${peakY})`;
    const textWidth = ctx.measureText(label).width;
    const textHeight = 16; // Approximate height of the text
    const padding = 5;

    ctx.fillStyle = 'white';
    ctx.fillRect(x - textWidth / 2 - padding, y - textHeight - padding * 2, textWidth + padding * 2, textHeight);
    ctx.strokeStyle = 'black';
    ctx.strokeRect(x - textWidth / 2 - padding, y - textHeight - padding * 2, textWidth + padding * 2, textHeight);

    ctx.fillStyle = 'black';
    ctx.fillText(label, x - textWidth / 2, y - textHeight / 2 - padding);
}

function createLineCanvas(videoElement, stripeWidth) {
    const lineCanvas = document.createElement('canvas');
    lineCanvas.width = getElementWidth(videoElement);
    lineCanvas.height = stripeWidth;
    return lineCanvas;
}

function setupEventListeners(videoElement, draw, graphCanvas) {
    document.getElementById('smoothingRange').addEventListener('input', function() {
        smoothing = parseInt(this.value);
        document.getElementById('smoothingValue').textContent = smoothing;
        if (videoElement instanceof HTMLImageElement) {
            needToRecalculateMaxima = true;
            draw();
        }
    });

    document.getElementById('togglePeaksCheckbox').addEventListener('change', () => {
        if (videoElement instanceof HTMLImageElement) {
            needToRecalculateMaxima = true;
            draw();
        }
    });

    document.getElementById('minValueRange').addEventListener('input', function() {
        minValue = parseInt(this.value, 10);
        document.getElementById('minValueValue').textContent = minValue;
        if (videoElement instanceof HTMLImageElement) {
            needToRecalculateMaxima = true;
            draw();
        }
    });

    document.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
        checkbox.addEventListener('change', () => {
            if (videoElement instanceof HTMLImageElement) {
                draw();
            }
        });
    });

    document.getElementById('resetZoomButton').addEventListener('click', () => {
        zoomList = [];
        if (videoElement instanceof HTMLImageElement) {
            draw();
        }
    });

    const referenceGraphCheckbox = document.getElementById('referenceGraphCheckbox');
    referenceGraphCheckbox.addEventListener('change', () => {
        if (referenceGraphCheckbox.checked) {
            document.getElementById("referenceGraphControl").style.display = "block";
            showReferenceGraph = true;
        } else {
            document.getElementById("referenceGraphControl").style.display = "none";
            showReferenceGraph = false;
        }
        if (videoElement instanceof HTMLImageElement) {
            draw();
        }
    });

    graphCanvas.addEventListener('mousedown', (event) => {
        isDragging = true;
        const rect = graphCanvas.getBoundingClientRect();
        dragStartX = Math.max(30, Math.min(event.clientX - rect.left, graphCanvas.width - 30));
        dragEndX = dragStartX; // Initialize dragEndX to dragStartX
        if (videoElement instanceof HTMLImageElement) {
            draw();
        }
    });

    graphCanvas.addEventListener('mousemove', (event) => {
        const rect = graphCanvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        let elementWidth;
        if (videoElement instanceof HTMLImageElement) {
            elementWidth = videoElement.naturalWidth;
        } else {
            elementWidth = videoElement.videoWidth;
        }

        cursorCoordinates.x = Math.round((x - 30) / (graphCanvas.width - 60) * elementWidth);

        if (zoomList.length === 2) {
            cursorCoordinates.x = Math.round((x - 30) / (elementWidth) * elementWidth);
        }

        cursorCoordinates.y = Math.round(255 - ((y - 30) / (graphCanvas.height - 60) * 255));

        if (isDragging) {
            dragEndX = Math.max(30, Math.min(event.clientX - rect.left, graphCanvas.width - 30));

            if (zoomList.length === 2) {
                dragEndX = Math.max(30, Math.min(event.clientX - rect.left, elementWidth));
            }
        }
        if (videoElement instanceof HTMLImageElement) {
            draw();
        }
    });

    graphCanvas.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            addZoomRange(dragStartX, dragEndX);
            if (videoElement instanceof HTMLImageElement) {
                draw();
            }
        }
    });
}

function getToggleStates() {
    return {
        toggleCombined: document.getElementById('toggleCombined').checked,
        toggleR: document.getElementById('toggleR').checked,
        toggleG: document.getElementById('toggleG').checked,
        toggleB: document.getElementById('toggleB').checked
    };
}

function getZoomRange(pixelWidth) {
    let zoomStart = 0;
    let zoomEnd = pixelWidth;
    if (zoomList.length === 2) {
        [zoomStart, zoomEnd] = zoomList;
    }
    return [zoomStart, zoomEnd];
}

function clearGraph(graphCtx, graphCanvas) {
    graphCtx.clearRect(0, 0, graphCanvas.width, graphCanvas.height);
    graphCtx.fillStyle = 'white';
    graphCtx.fillRect(0, 0, graphCanvas.width, graphCanvas.height);
}

function drawGrid(graphCtx, graphCanvas, zoomStart, zoomEnd) {
    const width = graphCanvas.width;
    const height = graphCanvas.height;
    const padding = 30;
    const yRange = 255;
    const numOfYLabels = 20;

    graphCtx.beginPath();
    graphCtx.strokeStyle = '#e0e0e0';
    graphCtx.lineWidth = 0.5;
    graphCtx.font = '10px Arial';
    graphCtx.fillStyle = 'black';

    for (let i = 0; i <= numOfYLabels; i++) {
        const y = padding + ((height - 2 * padding) / numOfYLabels) * i;
        graphCtx.moveTo(padding, y);
        graphCtx.lineTo(width - padding, y);
        const label = (yRange - (i * (yRange / numOfYLabels))).toFixed(0);
        graphCtx.fillText(label, 5, y + 3);
    }

    const toggleXLabelsPx = document.getElementById('toggleXLabelsPx').checked;
    const numOfXLabels = 20;
    const isZoomedIn = zoomList.length === 2;

    for (let i = 0; i <= numOfXLabels; i++) {
        const x = padding + ((width - 2 * padding) / numOfXLabels) * i;
        graphCtx.moveTo(x, padding);
        graphCtx.lineTo(x, height - padding);
        let label;
        if (!toggleXLabelsPx) {
            const pixelValue = zoomStart + (i * (zoomEnd - zoomStart) / numOfXLabels);
            label = getWaveLengthByPx(pixelValue).toFixed(isZoomedIn ? 2 : 0);
        } else {
            label = (zoomStart + (i * (zoomEnd - zoomStart) / numOfXLabels)).toFixed(isZoomedIn ? 2 : 0);
        }
        graphCtx.fillText(label, x - 10, height - 5);
    }

    graphCtx.stroke();
}

function drawLine(graphCtx, pixels, pixelWidth, color, colorOffset, smoothing) {
    graphCtx.beginPath();

    for (let x = 0; x < pixelWidth; x++) {
        let value = smoothedValue(pixels, x, colorOffset, smoothing, pixelWidth);
        const y = calculateYPosition(value, graphCtx.canvas.height);
        const scaledX = calculateXPosition(x, pixelWidth, graphCtx.canvas.width);

        if (x === 0) {
            graphCtx.moveTo(scaledX, y);
        } else {
            graphCtx.lineTo(scaledX, y);
        }
    }

    graphCtx.strokeStyle = color;
    graphCtx.lineWidth = 1;
    graphCtx.stroke();
}

function smoothedValue(pixels, x, colorOffset, smoothing, pixelWidth) {
    let sum = 0;
    let count = 0;
    for (let offset = -smoothing; offset <= smoothing; offset++) {
        const smoothedX = x + offset;
        if (smoothedX >= 0 && smoothedX < pixelWidth) {
            if (colorOffset === -1) {
                sum += calculateMaxColor(pixels, smoothedX);
            } else {
                sum += pixels[smoothedX * 4 + colorOffset];
            }
            count++;
        }
    }
    return count > 0 ? sum / count : 0;
}

function calculateMaxColor(pixels, x) {
    return Math.max(pixels[x * 4], pixels[x * 4 + 1], pixels[x * 4 + 2]);
}

function calculateYPosition(value, canvasHeight) {
    const padding = 30;
    const yRange = 255;
    return canvasHeight - padding - (value / yRange) * (canvasHeight - 2 * padding);
}

function calculateXPosition(x, pixelWidth, canvasWidth) {
    const padding = 30;
    return padding + (x / (pixelWidth - 1)) * (canvasWidth - 2 * padding);
}

function addZoomRange(startX, endX) {
    const graphCanvas = document.getElementById('graphCanvas');
    const rect = graphCanvas.getBoundingClientRect();
    const canvasWidth = rect.width - 60; // Adjust for padding

    let elementWidth;
    if (videoElement instanceof HTMLImageElement) {
        elementWidth = videoElement.naturalWidth;
    } else {
        elementWidth = videoElement.videoWidth;
    }

    let zoomStart = 0;
    let zoomEnd = elementWidth;
    if (zoomList.length === 2) {
        [zoomStart, zoomEnd] = zoomList;
    }

    const startIndex = Math.floor(zoomStart + (startX - 30) / canvasWidth * (zoomEnd - zoomStart));
    const endIndex = Math.floor(zoomStart + (endX - 30) / canvasWidth * (zoomEnd - zoomStart));

    if (Math.abs(startIndex - endIndex) < 2) {
        console.log('Zoom range too small, zoom not applied.');
        return;
    }

    if (startIndex > endIndex) {
        zoomList = [endIndex, startIndex];
    } else {
        zoomList = [startIndex, endIndex];
    }
    console.log('Zoom range:', zoomList);
}

function addReferenceLine() {
    captureReferenceGraph = true;
    plotRGBLineFromCamera(videoElement, getYPercentage(), getStripeWidth());
}

function removeReferenceLinesAndAddNewReferenceLine() {
    referenceGraph = [];
    addReferenceLine();
}

// Event listener pre zmenu šírky pásika
document.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
    checkbox.addEventListener('change', () => {
        if (videoElement) {
            plotRGBLineFromCamera(videoElement, getYPercentage(), getStripeWidth());
        }
    });
});
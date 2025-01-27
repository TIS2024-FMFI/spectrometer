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
let mouseUp = true;


function plotRGBLineFromCamera(videoElement, stripePosition = 0.5, stripeWidth = 1) {
    if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
    }

    const lineCanvas = createLineCanvas(videoElement, stripeWidth);
    const ctx = lineCanvas.getContext('2d', { willReadFrequently: true });
    let graphCanvas = document.getElementById('graphCanvas');

    graphCanvas.width = document.getElementById("graphWindowContainer").getBoundingClientRect().width;
    graphCanvas.height = document.getElementById("graphWindowContainer").getBoundingClientRect().height;

    let graphCtx = graphCanvas.getContext('2d', { willReadFrequently: true });

    function draw() {
        drawGraphLine(videoElement, ctx, graphCtx, graphCanvas, stripePosition, stripeWidth);
        if (!(videoElement instanceof HTMLImageElement)) {
            animationId = requestAnimationFrame(draw);
        }
    }

    const resizeObserver = new ResizeObserver(() => {
        graphCanvas.width = document.getElementById("graphWindowContainer").getBoundingClientRect().width;
        graphCanvas.height = document.getElementById("graphWindowContainer").getBoundingClientRect().height;
        graphCtx = graphCanvas.getContext('2d', { willReadFrequently: true });
    });

// Start observing the graphCanvas element
    resizeObserver.observe(graphCanvas);
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

    if (document.getElementById('togglePeaksCheckbox').checked) {
        const maxima = findMaxima(pixels, pixelWidth, minValue);
        drawMaxima(graphCtx, maxima, graphCanvas);
    }

    if (isDragging) {
        const rectX = Math.min(dragStartX, dragEndX);
        const rectWidth = Math.abs(dragStartX - dragEndX);
        graphCtx.fillStyle = 'rgba(0, 0, 255, 0.2)';
        graphCtx.fillRect(rectX, 30, rectWidth, graphCanvas.height - 60);
    }

    drawCursorCoordinates(graphCtx, graphCanvas, cursorCoordinates, videoElement);
}

function drawCursorCoordinates(graphCtx, graphCanvas, cursorCoordinates, videoElement) {
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

    const text = `X: ${displayX}, Y: ${displayY}`;
    const textWidth = graphCtx.measureText(text).width;
    const textX = graphCanvas.width - 150 + (150 - textWidth) / 2;

    graphCtx.clearRect(graphCanvas.width - 150, 0, 150, 30);
    graphCtx.fillStyle = 'white';
    graphCtx.fillRect(graphCanvas.width - 150, 0, 150, 30);
    graphCtx.fillStyle = 'black';
    graphCtx.font = '16px Arial';
    graphCtx.fillText(text, textX, 20);
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
    for (let x = 1; x < pixelWidth - 1; x++) {
        let value = calculateMaxColor(pixels, x);
        console.log(`x: ${x}, value: ${value}, left: ${calculateMaxColor(pixels, x - 1)}, right: ${calculateMaxColor(pixels, x + 1)}`);
        if (value > minValue && value > calculateMaxColor(pixels, x - 1) && value > calculateMaxColor(pixels, x + 1)) {
            maxima.push({ x, value });
        }
    }
    console.log('Maxima:', maxima);
    console.log('Pixels:', pixels);
    return maxima;
}

function drawMaxima(graphCtx, maxima, graphCanvas) {
    graphCtx.fillStyle = 'red';
    maxima.forEach(max => {
        const x = calculateXPosition(max.x, graphCanvas.width);
        const y = calculateYPosition(max.value, graphCanvas.height);
        graphCtx.beginPath();
        graphCtx.arc(x, y, 3, 0, 2 * Math.PI);
        graphCtx.fill();
    });
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
            draw();
        }
    });

    document.getElementById('togglePeaksCheckbox').addEventListener('change', () => {
        if (videoElement instanceof HTMLImageElement) {
            draw();
        }
    });

    document.getElementById('minValueRange').addEventListener('input', function() {
        minValue = parseInt(this.value, 10);
        document.getElementById('minValueValue').textContent = minValue;
        if (videoElement instanceof HTMLImageElement) {
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
        mouseUp = false;
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
        mouseUp = true;
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
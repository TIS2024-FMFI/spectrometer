// Slúži na priblíženie grafu na základe kliknutia na canvas
let zoomList = [];
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
let eventListeners = [];


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
            needToRecalculateMaxima = true;
        }
    }

    const resizeObserver = new ResizeObserver(() => {
        graphCanvas.width = document.getElementById("graphWindowContainer").getBoundingClientRect().width;
        graphCanvas.height = document.getElementById("graphWindowContainer").getBoundingClientRect().height;
        graphCtx = graphCanvas.getContext('2d', { willReadFrequently: true });
        if (videoElement instanceof HTMLImageElement) {
            draw();
        }
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
    drawGrid(graphCtx, graphCanvas, zoomStart, zoomEnd, pixels);

    // Calculate the maximum value from the pixels
    let maxValue = 0;
    for (let i = 0; i < pixels.length; i += 4) {
        const value = Math.max(pixels[i], pixels[i + 1], pixels[i + 2]);
        if (value > maxValue) {
            maxValue = value;
        }
    }
    maxValue += 5; // Add 5 to the maximum value

    if (showReferenceGraph) {
        for (let i = 0; i < referenceGraph.length; i++) {
            let [tempPixels, tempPixelWidth, tempSmoothing] = referenceGraph[i];
            if (zoomList.length === 2) {
                tempPixels = tempPixels.slice(zoomStart * 4, zoomEnd * 4);
                tempPixelWidth = zoomEnd - zoomStart;
            }
            drawLine(graphCtx, tempPixels, tempPixelWidth, referenceColors[i % referenceColors.length], -1, tempSmoothing, maxValue);
        }
    }

    if (toggleCombined) {
        drawLine(graphCtx, pixels, pixelWidth, 'black', -1, smoothing, maxValue);
    }
    if (toggleR) {
        drawLine(graphCtx, pixels, pixelWidth, 'red', 0, smoothing, maxValue);
    }
    if (toggleG) {
        drawLine(graphCtx, pixels, pixelWidth, 'green', 1, smoothing, maxValue);
    }
    if (toggleB) {
        drawLine(graphCtx, pixels, pixelWidth, 'blue', 2, smoothing, maxValue);
    }

    if (document.getElementById('togglePeaksCheckbox').checked && maxima.length > 0) {
        drawMaxima(graphCtx, maxima, graphCanvas, zoomStart, zoomEnd, maxValue);
    }

    if (isDragging) {
        const rectX = Math.min(dragStartX, dragEndX);
        const rectWidth = Math.abs(dragStartX - dragEndX);
        graphCtx.fillStyle = 'rgba(0, 0, 255, 0.2)';
        graphCtx.fillRect(rectX, 30, rectWidth, graphCanvas.height - 60);
    }
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
    const firstPixelValue = smoothedValue(pixels, 0, -1, smoothing, pixelWidth);
    if (firstPixelValue > smoothedValue(pixels, 1, -1, smoothing, pixelWidth) && firstPixelValue > minValue) {
        maxima.push({ x: 0, value: Math.floor(firstPixelValue) });
    }

    // Check for maximum at the last pixel
    const lastPixelValue = smoothedValue(pixels, pixelWidth - 1, -1, smoothing, pixelWidth);
    if (lastPixelValue > smoothedValue(pixels, pixelWidth - 2, -1, smoothing, pixelWidth) && lastPixelValue > minValue) {
        maxima.push({ x: pixelWidth - 1, value: Math.floor(lastPixelValue) });
    }

    return maxima;
}

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

function drawMaxima(ctx, maxima, canvas, zoomStart, zoomEnd, maxValue) {
    const padding = 30;
    const height = canvas.height;
    maxima.forEach(max => {
        if (max.x >= zoomStart && max.x <= zoomEnd) {
            const x = calculateXPosition(max.x - zoomStart, zoomEnd - zoomStart, canvas.width);
            const y = calculateYPosition(max.value, height, maxValue);
            drawDottedLine(ctx, x, height - padding, y, 'red');
            drawPeakLabel(ctx, x, y, max.x);
        }
    });
}

function drawPeakLabel(ctx, x, y, peakX) {
    const toggleXLabelsPx = document.getElementById('toggleXLabelsPx').checked;
    let label;
    if (!toggleXLabelsPx) {
        label = `X: ${getWaveLengthByPx(peakX).toFixed(0)}`;
    } else {
        label = `X: ${peakX}`;
    }
    const textWidth = ctx.measureText(label).width;
    const textHeight = 20; // Increase the text height for bigger text

    ctx.fillStyle = 'black';
    ctx.font = 'bold 14px Arial'; // Make the text bigger and bold
    ctx.fillText(label, x - textWidth / 2, y - textHeight / 2);
}

function createLineCanvas(videoElement, stripeWidth) {
    const lineCanvas = document.createElement('canvas');
    lineCanvas.width = getElementWidth(videoElement);
    lineCanvas.height = stripeWidth;
    return lineCanvas;
}

function removeEventListeners() {
    eventListeners.forEach(({ element, type, listener }) => {
        element.removeEventListener(type, listener);
    });
    eventListeners = [];
}

function setupEventListeners(videoElement, draw, graphCanvas) {
    removeEventListeners();

    function addEventListener(element, type, listener) {
        element.addEventListener(type, listener);
        eventListeners.push({ element, type, listener });
    }

    addEventListener(document.getElementById('smoothingRange'), 'input', function() {
        smoothing = parseInt(this.value);
        document.getElementById('smoothingValue').textContent = smoothing;
        if (videoElement instanceof HTMLImageElement) {
            needToRecalculateMaxima = true;
            draw();
        }
    });

    addEventListener(document.getElementById('togglePeaksCheckbox'), 'change', () => {
        if (videoElement instanceof HTMLImageElement) {
            needToRecalculateMaxima = true;
            draw();
        }
    });

    addEventListener(document.getElementById('minValueRange'), 'input', function() {
        minValue = parseInt(this.value, 10);
        document.getElementById('minValueValue').textContent = minValue;
        if (videoElement instanceof HTMLImageElement) {
            needToRecalculateMaxima = true;
            draw();
        }
    });

    document.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
        addEventListener(checkbox, 'change', () => {
            if (videoElement instanceof HTMLImageElement) {
                draw();
            }
        });
    });

    addEventListener(document.getElementById('resetZoomButton'), 'click', () => {
        zoomList = [];
        if (videoElement instanceof HTMLImageElement) {
            draw();
        }
    });

    document.getElementById('referenceGraphCheckbox').addEventListener( 'change', () => {
        const referenceGraphCheckbox = document.getElementById('referenceGraphCheckbox');
        if (referenceGraphCheckbox.checked) {
            document.getElementById("referenceGraphControl").style.display = "block";
            console.log('show');
            showReferenceGraph = true;
        } else {
            document.getElementById("referenceGraphControl").style.display = "none";
            console.log('hide');
            showReferenceGraph = false;
        }
        if (videoElement instanceof HTMLImageElement) {
            draw();
        }
    });

    addEventListener(graphCanvas, 'mousedown', (event) => {
        isDragging = true;
        const rect = graphCanvas.getBoundingClientRect();
        dragStartX = Math.max(30, Math.min(event.clientX - rect.left, graphCanvas.width - 30));
        dragEndX = dragStartX;
        if (videoElement instanceof HTMLImageElement) {
            draw();
        }
    });

    addEventListener(graphCanvas, 'mousemove', (event) => {
        const rect = graphCanvas.getBoundingClientRect();

        if (isDragging) {
            dragEndX = Math.max(30, Math.min(event.clientX - rect.left, graphCanvas.width - 30));

            if (zoomList.length === 2) {
                dragEndX = Math.max(30, Math.min(event.clientX - rect.left, graphCanvas.width - 30));
            }
        }
        if (videoElement instanceof HTMLImageElement) {
            needToRecalculateMaxima = true;
            draw();
        }
    });

    addEventListener(graphCanvas, 'mouseup', () => {
        if (isDragging) {
            isDragging = false;
            addZoomRange(dragStartX, dragEndX);
            if (videoElement instanceof HTMLImageElement) {
                draw();
            }
        }
    });

    document.querySelectorAll('input[name="toggleXLabels"]').forEach(radio => {
        addEventListener(radio, 'change', () => {
            if (videoElement instanceof HTMLImageElement) {
                draw();
            }
        });
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

function drawGrid(graphCtx, graphCanvas, zoomStart, zoomEnd, pixels) {
    const width = graphCanvas.width;
    const height = graphCanvas.height;
    const padding = 30;

    // Calculate the maximum value from the pixels
    let maxValue = 0;
    for (let i = 0; i < pixels.length; i += 4) {
        const value = Math.max(pixels[i], pixels[i + 1], pixels[i + 2]);
        if (value > maxValue) {
            maxValue = value;
        }
    }
    maxValue += 5; // Add 5 to the maximum value

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
        const label = (maxValue - (i * (maxValue / numOfYLabels))).toFixed(0);
        graphCtx.fillText(label, 5, y + 3);
    }

    const toggleXLabelsPx = document.getElementById('toggleXLabelsPx').checked;
    const stepSize = Math.ceil((zoomEnd - zoomStart) / 20);

    for (let i = Math.ceil(zoomStart / stepSize) * stepSize; i <= zoomEnd; i += stepSize) {
        const x = padding + ((i - zoomStart) / (zoomEnd - zoomStart)) * (width - 2 * padding);
        graphCtx.moveTo(x, padding);
        graphCtx.lineTo(x, height - padding);
        let label;
        if (!toggleXLabelsPx) {
            label = getWaveLengthByPx(i).toFixed(0);
        } else {
            label = i.toFixed(0);
        }
        graphCtx.fillText(label, x - 10, height - 5);
    }

    graphCtx.stroke();
}

function drawLine(graphCtx, pixels, pixelWidth, color, colorOffset, smoothing, maxValue) {
    graphCtx.beginPath();

    for (let x = 0; x < pixelWidth; x++) {
        let value = smoothedValue(pixels, x, colorOffset, smoothing, pixelWidth);
        const y = calculateYPosition(value, graphCtx.canvas.height, maxValue);
        const scaledX = calculateXPosition(x, pixelWidth, graphCtx.canvas.width);

        if (x === 0) {
            graphCtx.moveTo(scaledX, y);
        } else {
            graphCtx.lineTo(scaledX, graphCtx.currentY || y); // Move to the X value
            graphCtx.lineTo(scaledX, y); // Then make another line to the Y value
        }
        graphCtx.currentY = y; // Store the current Y value
    }

    graphCtx.strokeStyle = color;
    graphCtx.lineWidth = 1;
    graphCtx.stroke();
    delete graphCtx.currentY; // Clean up the stored Y value
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

function calculateYPosition(value, canvasHeight, maxValue) {
    const padding = 30;
    return canvasHeight - padding - (value / maxValue) * (canvasHeight - 2 * padding);
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

    zoomList[0] = Math.max(0, zoomList[0]);
    zoomList[1] = Math.min(elementWidth, zoomList[1]);
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
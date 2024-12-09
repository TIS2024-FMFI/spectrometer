// Slúži na priblíženie grafu na základe kliknutia na canvas
let zoomList = [];
// Sledovanie ID animácie
let animationId;
let showPeaks = false;
let smoothing = 0;
let minValue = 0;
let distance = 1;

function plotRGBLineFromCamera(videoElement, stripePosition = 0.5, stripeWidth = 1) {
    if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
    }

    const lineCanvas = document.createElement('canvas');
    lineCanvas.width = getElementWidth(videoElement);
    lineCanvas.height = stripeWidth;
    const ctx = lineCanvas.getContext('2d', { willReadFrequently: true });
    const graphCanvas = document.getElementById('graphCanvas');
    const graphCtx = graphCanvas.getContext('2d', { willReadFrequently: true });

    const width = graphCanvas.width;
    const height = graphCanvas.height;
    const padding = 30;
    videoElement.addEventListener('loadedmetadata', function() {
        document.getElementById('distanceRange').max = videoElement.videoWidth;
    });

    document.getElementById('smoothingRange').addEventListener('input', function() {
        smoothing = parseInt(this.value);
        document.getElementById('smoothingValue').textContent = smoothing;

    });

    document.getElementById('minValueRange').addEventListener('input', function() {
        minValue = parseInt(this.value, 10);
        document.getElementById('minValueValue').textContent = minValue;
    });

    document.getElementById('distanceRange').addEventListener('input', function() {
        distance = parseInt(this.value, 10);
        document.getElementById('distanceValue').textContent = distance;
    });

    function drawGraphLine() {
        if (videoElement.ended) return;

        const toggleCombined = document.getElementById('toggleCombined').checked;
        const toggleR = document.getElementById('toggleR').checked;
        const toggleG = document.getElementById('toggleG').checked;
        const toggleB = document.getElementById('toggleB').checked;

        const startY = getElementHeight(videoElement) * stripePosition - stripeWidth / 2;
        ctx.drawImage(videoElement, 0, startY, getElementWidth(videoElement), stripeWidth, 0, 0, getElementWidth(videoElement), stripeWidth);

        let pixels = ctx.getImageData(0, 0, getElementWidth(videoElement), stripeWidth).data;
        let pixelWidth = getElementWidth(videoElement);

        let zoomStart = 0;
        let zoomEnd = getElementWidth(videoElement);

        if (zoomList.length === 2) {
            [zoomStart, zoomEnd] = zoomList;
            pixels = pixels.slice(zoomStart * 4, zoomEnd * 4);
            pixelWidth = zoomEnd - zoomStart;
        }

        graphCtx.clearRect(0, 0, width, height);
        graphCtx.fillStyle = 'white';
        graphCtx.fillRect(0, 0, width, height);
        graphCtx.beginPath();

        graphCtx.strokeStyle = '#e0e0e0';
        graphCtx.lineWidth = 0.5;
        graphCtx.font = '10px Arial';
        graphCtx.fillStyle = 'black';

        const yRange = 255;
        const numOfYLabels = 20;

        for (let i = 0; i <= numOfYLabels; i++) {
            const y = padding + ((height - 2 * padding) / numOfYLabels) * i;
            graphCtx.moveTo(padding, y);
            graphCtx.lineTo(width - padding, y);
            const label = (255 - (i * (255 / numOfYLabels))).toFixed(0);
            let yOffset = 3;
            graphCtx.fillText(label, 5, y + yOffset);
        }

        const toggleXLabelsPx = document.getElementById('toggleXLabelsPx').checked;
        const numOfXLabels = 20;

        for (let i = 0; i <= numOfXLabels; i++) {
            const x = padding + ((width - 2 * padding) / numOfXLabels) * i;
            graphCtx.moveTo(x, padding);
            graphCtx.lineTo(x, height - padding);
            let label;
            if (!toggleXLabelsPx) {
                const pixelValue = zoomStart + (i * (zoomEnd - zoomStart) / numOfXLabels);
                label = getWaveLengthByPx(pixelValue).toFixed(0);
            } else {
                label = (zoomStart + (i * (zoomEnd - zoomStart) / numOfXLabels)).toFixed(0);
            }
            graphCtx.fillText(label, x - 10, height - 5);
        }

        graphCtx.stroke();

        function calculateAverageColor(x, colorOffset) {
            let sum = 0;
            for (let y = 0; y < stripeWidth; y++) {
                sum += pixels[(y * getElementWidth(videoElement) + x) * 4 + colorOffset];
            }
            return sum / stripeWidth;
        }

        function calculateMaxColor(x) {
            return Math.max(calculateAverageColor(x, 0), calculateAverageColor(x, 1), calculateAverageColor(x, 2));
        }

        function drawLine(color, colorOffset, smoothing = 1, minValue = 0, distance = 1) {
            graphCtx.beginPath();
            const maxima = []; // Store maxima after applying filters

            function smoothedValue(x, colorOffset) {
                let sum = 0;
                let count = 0;
                for (let offset = -smoothing; offset <= smoothing; offset++) {
                    const smoothedX = x + offset;
                    if (smoothedX >= 0 && smoothedX < pixelWidth) {
                        if (colorOffset === -1) {
                            sum += calculateMaxColor(smoothedX);
                        } else {
                            sum += calculateAverageColor(smoothedX, colorOffset);
                        }
                        count++;
                    }
                }
                return count > 0 ? sum / count : 0;
            }

            for (let x = 0; x < pixelWidth; x++) {
                let value = smoothedValue(x, colorOffset);

                const y = height - padding - (value / yRange) * (height - 2 * padding);
                const scaledX = padding + (x / pixelWidth) * (width - 2 * padding);

                if (x === 0) {
                    graphCtx.moveTo(scaledX, y);
                } else {
                    graphCtx.lineTo(scaledX, y);
                }

                if (colorOffset === -1 && showPeaks && value >= minValue &&
                    (x > 0 && x < pixelWidth - 1 &&
                            value > smoothedValue(x - 1, colorOffset) &&
                            value > smoothedValue(x + 1, colorOffset)))
                {
                    maxima.push({ x, value });
                }
            }

            graphCtx.strokeStyle = color;
            graphCtx.lineWidth = 1;
            graphCtx.stroke();

            if (colorOffset === -1 && showPeaks) {
                const filteredMaxima = [];
                for (let segmentStart = 0; segmentStart < pixelWidth; segmentStart += distance) {
                    const segmentEnd = segmentStart + distance;
                    let highestMaximum = null;

                    maxima.forEach((max) => {
                        if (max.x >= segmentStart && max.x < segmentEnd) {
                            if (!highestMaximum || max.value > highestMaximum.value) {
                                highestMaximum = max;
                            }
                        }
                    });

                    if (highestMaximum) {
                        filteredMaxima.push(highestMaximum);
                    }
                }

                filteredMaxima.forEach(({ x, value }) => {
                    const scaledX = padding + (x / pixelWidth) * (width - 2 * padding);
                    const scaledY = height - padding - (value / 255) * (height - 2 * padding);

                    graphCtx.beginPath();
                    graphCtx.arc(scaledX, scaledY, 3, 0, 2 * Math.PI, false);
                    graphCtx.fillStyle = 'magenta'; // Single color for maxima
                    graphCtx.fill();
                    graphCtx.strokeStyle = 'magenta';
                    graphCtx.stroke();
                });
            }
        }

        if (toggleCombined) {
            drawLine('black', -1, smoothing, minValue, distance);
        }
        if (toggleR) {
            drawLine('red', 0, smoothing, minValue, distance);
        }
        if (toggleG) {
            drawLine('green', 1, smoothing, minValue, distance);
        }
        if (toggleB) {
            drawLine('blue', 2, smoothing, minValue, distance);
        }

        if (videoElement instanceof HTMLImageElement) return;
        animationId = requestAnimationFrame(drawGraphLine);
    }
    /* disabled for now
    function togglePeaks(event) {
        showPeaks = event.target.checked;
        if (videoElement) {
            plotRGBLineFromCamera(videoElement, getYPercentage(), getStripeWidth());
        }
    }
    document.getElementById('togglePeaksCheckbox').addEventListener('change', togglePeaks);
    */

    drawGraphLine();
}

// Funkcia na pridanie hodnoty X do zoznamu zoomu
function addXValueToZoomList(x) {
    if (zoomList.length === 2) {
        return;
    }
    const graphCanvas = document.getElementById('graphCanvas');
    const videoElement = document.getElementById('videoMain');
    const index = Math.floor((x - 30) / (graphCanvas.width - 60) * videoElement.videoWidth); // Calculate the index based on the X position

    let insertIndex = zoomList.findIndex(value => value > index);
    if (insertIndex === -1) {
        zoomList.push(index);
    } else {
        zoomList.splice(insertIndex, 0, index);
    }
    console.log(zoomList);
}

// Event listener pre kliknutie na canvas
const graphCanvas = document.getElementById('graphCanvas');
graphCanvas.addEventListener('click', (event) => {
    const rect = graphCanvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    addXValueToZoomList(x);
});

// Event listener pre resetovanie zoomu
document.getElementById('resetZoomButton').addEventListener('click', () => {
    zoomList = [];
    console.log('Zoom list reset:', zoomList);
});

// Event listener pre zmenu šírky pásika
document.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
    checkbox.addEventListener('change', () => {
        if (videoElement) {
            plotRGBLineFromCamera(videoElement, getYPercentage(), getStripeWidth()); // getStripeWidth() musí byť funkcia, ktorá vráti požadovanú šírku pásika
        }
    });
});
// Slúži na priblíženie grafu na základe kliknutia na canvas
let zoomList = [];
// Sledovanie ID animácie
let animationId;

function plotRGBLineFromCamera(videoElement, stripePosition = 0.5, stripeWidth = 1) {
    // Zrušenie predchádzajúcej animácie, ak existuje
    if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null; // Resetovanie ID
    }

    const lineCanvas = document.createElement('canvas');
    lineCanvas.width = videoElement.videoWidth;
    lineCanvas.height = stripeWidth;
    const ctx = lineCanvas.getContext('2d', { willReadFrequently: true });
    const graphCanvas = document.getElementById('graphCanvas');
    const graphCtx = graphCanvas.getContext('2d', { willReadFrequently: true });

    const width = graphCanvas.width;
    const height = graphCanvas.height;
    const padding = 30; // Definujeme padding

    const toggleCombined = document.getElementById('toggleCombined').checked;
    const toggleR = document.getElementById('toggleR').checked;
    const toggleG = document.getElementById('toggleG').checked;
    const toggleB = document.getElementById('toggleB').checked;

    function drawGraphLine() {
        if (videoElement.ended) return;

        // Určíme počiatočnú pozíciu pásika
        const startY = videoElement.videoHeight * stripePosition - stripeWidth / 2;
        ctx.drawImage(videoElement, 0, startY, videoElement.videoWidth, stripeWidth, 0, 0, videoElement.videoWidth, stripeWidth);

        // Získame pixely pre zadaný pásik (s výškou stripeWidth)
        let pixels = ctx.getImageData(0, 0, videoElement.videoWidth, stripeWidth).data;
        let pixelWidth = videoElement.videoWidth;

        // Ak je zadaný zoom, tak zobrazíme len časť grafu
        let zoomStart = 0;
        let zoomEnd = videoElement.videoWidth;

        if (zoomList.length === 2) {
            [zoomStart, zoomEnd] = zoomList;
            pixels = pixels.slice(zoomStart * 4, zoomEnd * 4);
            pixelWidth = zoomEnd - zoomStart;
        }

        graphCtx.clearRect(0, 0, width, height);
        graphCtx.beginPath();

        // Vykreslenie mriežky a popisiek
        graphCtx.strokeStyle = '#e0e0e0';
        graphCtx.lineWidth = 0.5;
        graphCtx.font = '10px Arial';
        graphCtx.fillStyle = 'black';

        const yRange = 255; // Rozsah od 0 do 255
        const numOfYLabels = 20;

        for (let i = 0; i <= numOfYLabels; i++) {
            const y = padding + ((height - 2 * padding) / numOfYLabels) * i;
            graphCtx.moveTo(padding, y);
            graphCtx.lineTo(width - padding, y);
            const label = (255 - (i * (255 / numOfYLabels))).toFixed(0); // Popisky od 0 do 255
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
                label = getWaveLengthByPx(pixelValue).toFixed(0); // Convert pixel to nm
            } else {
                label = (zoomStart + (i * (zoomEnd - zoomStart) / numOfXLabels)).toFixed(0); // Pixel value
            }
            graphCtx.fillText(label, x - 10, height - 5);
        }

        graphCtx.stroke();

        function calculateAverageColor(x, colorOffset) {
            let sum = 0;
            for (let y = 0; y < stripeWidth; y++) {
                sum += pixels[(y * videoElement.videoWidth + x) * 4 + colorOffset];
            }
            return sum / stripeWidth;
        }

        // Funkcia na zistenie maximálnej farby pre kombinovaný graf
        function calculateMaxColor(x) {
            return Math.max(calculateAverageColor(x, 0), calculateAverageColor(x, 1), calculateAverageColor(x, 2));
        }

        // Funkcia na vykreslenie čiar
        function drawLine(color, colorOffset) {
            graphCtx.beginPath();
            for (let x = 0; x < pixelWidth; x++) {
                let value = calculateAverageColor(x, colorOffset);
                if (colorOffset === -1) {
                    value = calculateMaxColor(x);
                }
                const y = height - padding - (value / yRange) * (height - 2 * padding);
                const scaledX = padding + (x / pixelWidth) * (width - 2 * padding);

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

        // Vykreslenie čiar pre jednotlivé farby
        if (toggleCombined) {
            drawLine('black', -1);
        }
        if (toggleR) {
            drawLine('red', 0);
        }
        if (toggleG) {
            drawLine('green', 1);
        }
        if (toggleB) {
            drawLine('blue', 2);
        }

        animationId = requestAnimationFrame(drawGraphLine);
    }
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
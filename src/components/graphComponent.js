function plotRGBLineFromCamera(videoElement, stripePosition = 0.5, stripeWidth = 1) {
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
        if (videoElement.paused || videoElement.ended) return;

        // Určíme počiatočnú pozíciu pásika
        const startY = Math.floor(videoElement.videoHeight * stripePosition);
        ctx.drawImage(videoElement, 0, startY, videoElement.videoWidth, stripeWidth, 0, 0, videoElement.videoWidth, stripeWidth);

        // Získame pixely pre zadaný pásik (s výškou stripeWidth)
        const pixels = ctx.getImageData(0, 0, videoElement.videoWidth, stripeWidth).data;
        graphCtx.clearRect(0, 0, width, height);
        graphCtx.beginPath();

        // Vykreslenie mriežky a popisiek
        graphCtx.strokeStyle = '#e0e0e0';
        graphCtx.lineWidth = 0.5;
        graphCtx.font = '10px Arial';
        graphCtx.fillStyle = 'black';

        const yRange = 255; // Rozsah od 0 do 255
        for (let i = 0; i <= 10; i++) {
            const y = padding + ((height - 2 * padding) / 10) * i;
            graphCtx.moveTo(padding, y);
            graphCtx.lineTo(width - padding, y);
            const label = (255 - (i * (255 / 10))).toFixed(0); // Popisky od 0 do 255
            let yOffset = 3;
            graphCtx.fillText(label, 5, y + yOffset);
        }

        for (let i = 0; i <= 10; i++) {
            const x = padding + ((width - 2 * padding) / 10) * i;
            graphCtx.moveTo(x, padding);
            graphCtx.lineTo(x, height - padding);
            const label = ((i * videoElement.videoWidth) / 10).toFixed(0); // Dynamické popisky podľa šírky videa
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

        // Vykreslenie kombinovanej línie
        if (toggleCombined) {
            graphCtx.beginPath();
            for (let x = 0; x < videoElement.videoWidth; x++) {
                const r = calculateAverageColor(x, 0);
                const g = calculateAverageColor(x, 1);
                const b = calculateAverageColor(x, 2);
                const maxVal = Math.max(r, g, b);
                const y = height - padding - (maxVal / yRange) * (height - 2 * padding);

                if (x === 0) {
                    graphCtx.moveTo(padding + (x / videoElement.videoWidth) * (width - 2 * padding), y);
                } else {
                    graphCtx.lineTo(padding + (x / videoElement.videoWidth) * (width - 2 * padding), y);
                }
            }
            graphCtx.strokeStyle = 'black';
            graphCtx.lineWidth = 1;
            graphCtx.stroke();
        }

        // Vykreslenie červenej, zelenej a modrej línie
        if (toggleR) {
            graphCtx.beginPath();
            for (let x = 0; x < videoElement.videoWidth; x++) {
                const r = calculateAverageColor(x, 0);
                const y = height - padding - (r / yRange) * (height - 2 * padding);

                if (x === 0) {
                    graphCtx.moveTo(padding + (x / videoElement.videoWidth) * (width - 2 * padding), y);
                } else {
                    graphCtx.lineTo(padding + (x / videoElement.videoWidth) * (width - 2 * padding), y);
                }
            }
            graphCtx.strokeStyle = 'red';
            graphCtx.lineWidth = 1;
            graphCtx.stroke();
        }

        if (toggleG) {
            graphCtx.beginPath();
            for (let x = 0; x < videoElement.videoWidth; x++) {
                const g = calculateAverageColor(x, 1);
                const y = height - padding - (g / yRange) * (height - 2 * padding);

                if (x === 0) {
                    graphCtx.moveTo(padding + (x / videoElement.videoWidth) * (width - 2 * padding), y);
                } else {
                    graphCtx.lineTo(padding + (x / videoElement.videoWidth) * (width - 2 * padding), y);
                }
            }
            graphCtx.strokeStyle = 'green';
            graphCtx.lineWidth = 1;
            graphCtx.stroke();
        }

        if (toggleB) {
            graphCtx.beginPath();
            for (let x = 0; x < videoElement.videoWidth; x++) {
                const b = calculateAverageColor(x, 2);
                const y = height - padding - (b / yRange) * (height - 2 * padding);

                if (x === 0) {
                    graphCtx.moveTo(padding + (x / videoElement.videoWidth) * (width - 2 * padding), y);
                } else {
                    graphCtx.lineTo(padding + (x / videoElement.videoWidth) * (width - 2 * padding), y);
                }
            }
            graphCtx.strokeStyle = 'blue';
            graphCtx.lineWidth = 1;
            graphCtx.stroke();
        }

        requestAnimationFrame(drawGraphLine);
    }
    drawGraphLine();
}

document.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
    checkbox.addEventListener('change', () => {
        if (videoElement) {
            plotRGBLineFromCamera(videoElement, getYPercentage(), getStripeWidth()); // getStripeWidth() musí byť funkcia, ktorá vráti požadovanú šírku pásika
        }
    });
});
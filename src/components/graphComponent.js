export function plotRGBLineFromCamera(videoElement, stripePosition = 0.5) {
    const lineCanvas = document.createElement('canvas');
    lineCanvas.width = videoElement.videoWidth;
    lineCanvas.height = 1;
    const ctx = lineCanvas.getContext('2d');
    const graphCanvas = document.getElementById('graphCanvas');
    const graphCtx = graphCanvas.getContext('2d');
    const width = graphCanvas.width;
    const height = graphCanvas.height;
    const padding = 30; // Define padding

    const toggleCombined = document.getElementById('toggleCombined').checked;
    const toggleR = document.getElementById('toggleR').checked;
    const toggleG = document.getElementById('toggleG').checked;
    const toggleB = document.getElementById('toggleB').checked;

    function drawLine() {
        if (videoElement.paused || videoElement.ended) return;

        const yPos = Math.floor(videoElement.videoHeight * stripePosition);
        ctx.drawImage(videoElement, 0, yPos, videoElement.videoWidth, 1, 0, 0, videoElement.videoWidth, 1);

        const pixels = ctx.getImageData(0, 0, videoElement.videoWidth, 1).data;
        graphCtx.clearRect(0, 0, width, height);
        graphCtx.beginPath();

        // Draw grid lines and labels
        graphCtx.strokeStyle = '#e0e0e0';
        graphCtx.lineWidth = 0.5;
        graphCtx.font = '10px Arial';
        graphCtx.fillStyle = 'black';

        const yRange = 255; // Range from 0 to 255
        for (let i = 0; i <= 10; i++) {
            const y = padding + ((height - 2 * padding) / 10) * i;
            graphCtx.moveTo(padding, y);
            graphCtx.lineTo(width - padding, y);
            const label = (255 - (i * (255 / 10))).toFixed(0); // Labels from 0 to 255
            let yOffset = 3;
            graphCtx.fillText(label, 5, y + yOffset);
        }

        for (let i = 0; i <= 10; i++) {
            const x = padding + ((width - 2 * padding) / 10) * i;
            graphCtx.moveTo(x, padding);
            graphCtx.lineTo(x, height - padding);
            const label = ((i * videoElement.videoWidth) / 10).toFixed(0); // Dynamic labels based on video width
            graphCtx.fillText(label, x - 10, height - 5);
        }

        graphCtx.stroke();

        // Draw the combined light line
        if (toggleCombined) {
            graphCtx.beginPath();
            for (let x = 0; x < videoElement.videoWidth; x++) {
                const r = pixels[x * 4];
                const g = pixels[x * 4 + 1];
                const b = pixels[x * 4 + 2];
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

        // Draw the RGB lines
        if (toggleR) {
            graphCtx.beginPath();
            for (let x = 0; x < videoElement.videoWidth; x++) {
                const r = pixels[x * 4];
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
                const g = pixels[x * 4 + 1];
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
                const b = pixels[x * 4 + 2];
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

        requestAnimationFrame(drawLine);
    }
    drawLine();
}
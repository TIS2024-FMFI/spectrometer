/**
 * Display the camera selection above the graph
 */
function showSelectedStripe() {
    const stripeCanvas = document.getElementById('stripeCanvas');
    const graphCanvas = document.getElementById('graphCanvas');
    if (!stripeCanvas || !graphCanvas) {
        console.error('stripeCanvas or graphCanvas element not found');
        return;
    }

    const stripeCtx = stripeCanvas.getContext('2d');
    if (!stripeCtx) {
        console.error('Unable to get 2D context for stripeCanvas');
        return;
    }

    const stripeWidth = getStripeWidth();
    if (typeof stripeWidth !== 'number' || stripeWidth <= 0) {
        return;
    }

    if (!videoElement || getElementWidth(videoElement) <= 0 || getElementHeight(videoElement) <= 0) {
        return;
    }

    const videoWidth = getElementWidth(videoElement);
    const stripePosition = getElementHeight(videoElement) * getYPercentage() - stripeWidth / 2;

    const zoomStart = zoomList[0] || 0;
    const zoomEnd = zoomList[1] || videoWidth;

    stripeCtx.drawImage(videoElement, zoomStart, stripePosition, zoomEnd - zoomStart, stripeWidth, 0, 0, stripeCanvas.width, stripeCanvas.height);
}

/**
 * Updates the stripe continuously
 */
function updateStripeContinuously() {
    showSelectedStripe();
    requestAnimationFrame(updateStripeContinuously);
}

updateStripeContinuously();
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
        console.error('Invalid stripe width');
        return;
    }

    if (!videoElement || videoElement.videoWidth <= 0 || videoElement.videoHeight <= 0) {
        console.error('Invalid video element or dimensions');
        return;
    }

    const videoWidth = videoElement.videoWidth;
    const stripePosition = videoElement.videoHeight * getYPercentage() - stripeWidth / 2;

    stripeCanvas.width = graphCanvas.width;

    stripeCtx.drawImage(videoElement, 0, stripePosition, videoWidth, stripeWidth, 0, 0, stripeCanvas.width, stripeCanvas.height);
    console.log(stripePosition, videoWidth, stripeWidth);
}

function updateStripeContinuously() {
    showSelectedStripe();
    requestAnimationFrame(updateStripeContinuously);
}

updateStripeContinuously();
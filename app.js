const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

async function setupCamera() {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
    video.srcObject = stream;
    return new Promise(resolve => {
        video.onloadedmetadata = () => {
            resolve(video);
        };
    });
}

function isPointInRect(x, y, rect) {
    return x >= rect[0] && x <= rect[0] + rect[2] && y >= rect[1] && y <= rect[1] + rect[3];
}

async function fetchWikipediaSummary(title) {
    const response = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`);
    if (response.ok) {
        const data = await response.json();
        return data.extract;
    } else {
        return 'No summary available';
    }
}

canvas.addEventListener('click', async event => {
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    for (const prediction of currentPredictions) {
        if (isPointInRect(x, y, prediction.bbox)) {
            const summary = await fetchWikipediaSummary(prediction.class);
            const summaryBox = prediction.summaryBox;
            summaryBox.style.display = 'block';
            summaryBox.style.left = `${prediction.bbox[0] + prediction.bbox[2]}px`;
            summaryBox.style.top = `${prediction.bbox[1]}px`;
            summaryBox.textContent = summary;
            return;
        }
    }
});

async function detectObjects() {
    const model = await cocoSsd.load();
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    currentPredictions = [];

    while (true) {
        const predictions = await model.detect(video);
        currentPredictions = predictions;
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

        predictions.forEach(prediction => {
            if (!prediction.summaryBox) {
                const summaryBox = document.createElement('div');
                summaryBox.style.position = 'absolute';
                summaryBox.style.padding = '10px';
                summaryBox.style.backgroundColor = `rgba(0, 0, 0, ${prediction.score * 0.7})`;
                summaryBox.style.color = 'white';
                summaryBox.style.borderRadius = '5px';
                summaryBox.style.fontSize = '14px';
                summaryBox.style.maxWidth = '250px';
                summaryBox.style.display = 'none';
                document.body.appendChild(summaryBox);
                prediction.summaryBox = summaryBox;
            }

            ctx.strokeStyle = 'green';
            ctx.lineWidth = 4;
            ctx.strokeRect(...prediction.bbox);
        });

        await tf.nextFrame();
    }
}

(async function() {
    const videoElement = await setupCamera();
    videoElement.play();
    detectObjects();
})();

const videoInput = document.getElementById('videoInput');
const videoPlayer = document.getElementById('videoPlayer');
const uploadBtn = document.getElementById('uploadBtn');
const statusText = document.getElementById('status');
const boxExample = document.getElementById('boxExample');

// Khi người dùng chọn file
videoInput.addEventListener('change', function () {
    const file = this.files[0];
    if (file) {
        const url = URL.createObjectURL(file);
        videoPlayer.src = url;
        statusText.innerText = "Đã tải video: " + file.name;
    }
});

// Khi nhấn nút Upload (Giả lập)
uploadBtn.addEventListener('click', function () {
    if (!videoPlayer.src) {
        alert("Vui lòng chọn video trước!");
        return;
    }

    statusText.innerText = "Đang xử lý nhận diện...";
    videoPlayer.play();

    // Giả lập sau 2 giây hiện Bounding Box
    setTimeout(() => {
        boxExample.style.display = 'block';
        statusText.innerText = "Phát hiện: Xe cứu thương (Ambulance)";
    }, 2000);
});
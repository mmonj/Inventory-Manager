document.addEventListener("DOMContentLoaded", init_camera);

var scan_audio = new Audio(scan_sound_file);

function on_scan(decodedText, decodedResult) {
  console.log(decodedText, decodedResult);
  scan_audio.play();
}

function qrboxFunction(viewfinderWidth, viewfinderHeight) {
  let minEdgePercentage = 0.4; // 70%
  let minEdgeSize = Math.min(viewfinderWidth, viewfinderHeight);
  let qrboxSize = Math.floor(minEdgeSize * minEdgePercentage);
  return {
    width: qrboxSize,
    height: qrboxSize,
  };
}

function init_camera() {
  const scanner = new Html5Qrcode("reader");

  const config = { fps: 0.5, qrbox: qrboxFunction };
  scanner.start({ facingMode: "environment" }, config, on_scan);
}

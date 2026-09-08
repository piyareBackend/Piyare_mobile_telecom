/* PMT POS camera barcode scanner. Works in supported browsers and Android WebView. */
(function(){
  if(!/\/admin\/pos\.html$/i.test(location.pathname))return;
  function init(){
    var btn=document.getElementById('barcodeBtn'),video=document.getElementById('camera'),stop=document.getElementById('stopCamera'),msg=document.getElementById('cameraMsg'),search=document.getElementById('search');
    if(!btn||!video)return;
    var stream=null,timer=null,detector=null;
    function setMsg(t){if(msg)msg.textContent=t||''}
    function stopCamera(){if(timer){clearInterval(timer);timer=null}if(stream){stream.getTracks().forEach(function(t){t.stop()});stream=null}video.pause();video.srcObject=null;video.style.display='none';if(stop)stop.style.display='none';}
    async function start(){
      if(!window.isSecureContext||!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia){setMsg('Camera is unavailable here. Use a hardware scanner or enter the barcode.');return}
      if(!('BarcodeDetector' in window)){setMsg('This browser does not support camera barcode detection. Use a hardware scanner or enter the barcode.');return}
      try{
        if(!detector)detector=new BarcodeDetector({formats:['ean_13','ean_8','upc_a','upc_e','code_128','code_39','itf','qr_code']});
        stopCamera();stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'},width:{ideal:1280},height:{ideal:720}},audio:false});
        video.srcObject=stream;video.style.display='block';if(stop)stop.style.display='inline-block';await video.play();setMsg('Point the rear camera at the barcode…');
        timer=setInterval(async function(){if(!video.videoWidth)return;try{var codes=await detector.detect(video);if(codes&&codes.length){var value=String(codes[0].rawValue||'').trim();if(value){search.value=value;search.dispatchEvent(new Event('input',{bubbles:true}));setMsg('Scanned: '+value);stopCamera();}}}catch(e){}},220);
      }catch(e){stopCamera();setMsg(e&&e.name==='NotAllowedError'?'Camera permission was denied. Allow Camera for PMT Admin in Android/app settings.':'Could not open the camera: '+(e.message||e.name||'unknown error'));}
    }
    btn.addEventListener('click',function(e){e.preventDefault();start()});if(stop)stop.addEventListener('click',stopCamera);window.addEventListener('pagehide',stopCamera);window.PMT_STOP_BARCODE_CAMERA=stopCamera;
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();

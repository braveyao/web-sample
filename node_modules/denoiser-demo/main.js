'use strict';

/**
 * Step 1 - Import DenoiseProcessor from package
 */
import { DenoiseProcessor } from '@braveyao/denoiser';

const startButton = document.getElementById('startButton');
const callButton = document.getElementById('callButton');
const toggleButton = document.getElementById("toggleButton");
const hangupButton = document.getElementById('hangupButton');
callButton.disabled = true;
hangupButton.disabled = true;
toggleButton.disabled = true;
startButton.addEventListener('click', start);
callButton.addEventListener('click', call);
toggleButton.addEventListener("click", toggle);
hangupButton.addEventListener('click', hangup);

/**
 * Step 2 - Create AudioContext
 */
const audioContext = new AudioContext();
console.log('Audio context sample rate: ' + audioContext.sampleRate);
/**
 * Step 3 - Create DenoiseProcessor Instance
 */
let filterNode, source, destination;
const denoiseProcessor = new DenoiseProcessor({
      debugLogs: true,
      vadLogs: false
    });

let startTime;
const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');

localVideo.addEventListener('loadedmetadata', function() {
  console.log(`Local video videoWidth: ${this.videoWidth}px,  videoHeight: ${this.videoHeight}px`);
});

remoteVideo.addEventListener('loadedmetadata', function() {
  console.log(`Remote video videoWidth: ${this.videoWidth}px,  videoHeight: ${this.videoHeight}px`);
});

remoteVideo.addEventListener('resize', () => {
  console.log(`Remote video size changed to ${remoteVideo.videoWidth}x${remoteVideo.videoHeight} - Time since pageload ${performance.now().toFixed(0)}ms`);
  // We'll use the first onsize callback as an indication that video has started
  // playing out.
  if (startTime) {
    const elapsedTime = window.performance.now() - startTime;
    console.log('Setup time: ' + elapsedTime.toFixed(3) + 'ms');
    startTime = null;
  }
});

let localStream;
let pc1;
let pc2;
const offerOptions = {
  offerToReceiveAudio: 1,
  offerToReceiveVideo: 1
};

function getName(pc) {
  return (pc === pc1) ? 'pc1' : 'pc2';
}

function getOtherPc(pc) {
  return (pc === pc1) ? pc2 : pc1;
}

async function start() {
  console.log('Requesting local stream');
  startButton.disabled = true;
  try {
    /**
     * Step 4 - Get Stream From Browser
     * @description For the best result we suggest setting the audio stream echo cancellation enabled and noise suppression disabled.
     * NOTE: If device with 8000Hz sampling rate is going to be used also set autoGainControl enabled.
     * @property {boolean} audio.echoCancellation
     * @property {boolean} audio.noiseSuppression
     * @property {boolean} audio.autoGainControl
     */
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: false,
        autoGainControl: false,
      },
      video: true
    });
    console.log('Received local stream');

    localVideo.srcObject = stream;
    localStream = stream;
    callButton.disabled = false;

    /**
     * Step 5 - Resuming AudioContext after a user action
     */
    await audioContext.resume();

    /**
     * Step 6 - Init DenoiseProcessor, this will create a web worker and will start models load
     */
    /**
     * Step 7 - Create Audio Filter
     * @description this will create an audioworklet processor, and return AudioWorkletNode
     * @param {AudioContext} audioContext - Audio context instance
     * @param {AudioContext} readyCallback - When SDK ready for processing
     */
    filterNode = await denoiseProcessor.init(audioContext);
    toggleButton.disabled = false;
    console.log('Denoise processor initialized');
  } catch (e) {
    console.error('getUserMedia() error:', e);
    alert(`getUserMedia() error: ${e.name}`);
  }
}

async function call() {
  callButton.disabled = true;
  hangupButton.disabled = false;
  console.log('Starting call');
  startTime = window.performance.now();

  /**
   * Step 8 - Create source and destination
   */
  source = audioContext.createMediaStreamSource(localStream);
  destination = audioContext.createMediaStreamDestination();

  /**
   * Step 10 - Add video tracks to the destination stream
   */
  source.connect(filterNode);
  filterNode.connect(destination);

  /**
   * Step 10 - Add video tracks to the destination stream
   */
  for (const videoTrack of localStream.getVideoTracks()) {
    destination.stream.addTrack(videoTrack);
  }

  /**
   * Step 11 - Change the local stream with the newly created stream
   */
  localStream = destination.stream;

  const videoTracks = localStream.getVideoTracks();
  const audioTracks = localStream.getAudioTracks();
  if (videoTracks.length > 0) {
    console.log(`Using video device: ${videoTracks[0].label}`);
  }
  if (audioTracks.length > 0) {
    console.log(`Using audio device: ${audioTracks[0].label}`);
  }

  const configuration = {};
  console.log('RTCPeerConnection configuration:', configuration);
  pc1 = new RTCPeerConnection(configuration);
  console.log('Created local peer connection object pc1');
  pc1.addEventListener('icecandidate', e => onIceCandidate(pc1, e));
  pc2 = new RTCPeerConnection(configuration);
  console.log('Created remote peer connection object pc2');
  pc2.addEventListener('icecandidate', e => onIceCandidate(pc2, e));
  pc1.addEventListener('iceconnectionstatechange', e => onIceStateChange(pc1, e));
  pc2.addEventListener('iceconnectionstatechange', e => onIceStateChange(pc2, e));
  pc2.addEventListener('track', gotRemoteStream);

  localStream.getTracks().forEach(track => pc1.addTrack(track, localStream));
  console.log('Added local stream to pc1');

  try {
    console.log('pc1 createOffer start');
    const offer = await pc1.createOffer(offerOptions);
    await onCreateOfferSuccess(offer);
  } catch (e) {
    onCreateSessionDescriptionError(e);
  }
}

function toggle() {
  if (!filterNode) {
    return;
  }
  /**
   * Step 12 - Toggle Noise Cancellation
   */
  if (filterNode.isEnabled()) {
    filterNode.disable();
    toggleButton.innerText = "Toggle Denoiser ✗";
    toggleButton.classList.remove("btn-success");
    toggleButton.classList.add("btn-outline-primary");
  } else {
    filterNode.enable();
    toggleButton.innerText = "Toggle Denoiser ✓";
    toggleButton.classList.remove("btn-outline-primary");
    toggleButton.classList.add("btn-success");
  }
}

function onCreateSessionDescriptionError(error) {
  console.log(`Failed to create session description: ${error.toString()}`);
}

async function onCreateOfferSuccess(desc) {
  console.log(`Offer from pc1\n${desc.sdp}`);
  console.log('pc1 setLocalDescription start');
  try {
    await pc1.setLocalDescription(desc);
    onSetLocalSuccess(pc1);
  } catch (e) {
    onSetSessionDescriptionError();
  }

  console.log('pc2 setRemoteDescription start');
  try {
    await pc2.setRemoteDescription(desc);
    onSetRemoteSuccess(pc2);
  } catch (e) {
    onSetSessionDescriptionError();
  }

  console.log('pc2 createAnswer start');
  // Since the 'remote' side has no media stream we need
  // to pass in the right constraints in order for it to
  // accept the incoming offer of audio and video.
  try {
    const answer = await pc2.createAnswer();
    await onCreateAnswerSuccess(answer);
  } catch (e) {
    onCreateSessionDescriptionError(e);
  }
}

function onSetLocalSuccess(pc) {
  console.log(`${getName(pc)} setLocalDescription complete`);
}

function onSetRemoteSuccess(pc) {
  console.log(`${getName(pc)} setRemoteDescription complete`);
}

function onSetSessionDescriptionError(error) {
  console.log(`Failed to set session description: ${error.toString()}`);
}

function gotRemoteStream(e) {
  if (remoteVideo.srcObject !== e.streams[0]) {
    remoteVideo.srcObject = e.streams[0];
    console.log('pc2 received remote stream');
  }
}

async function onCreateAnswerSuccess(desc) {
  console.log(`Answer from pc2:\n${desc.sdp}`);
  console.log('pc2 setLocalDescription start');
  try {
    await pc2.setLocalDescription(desc);
    onSetLocalSuccess(pc2);
  } catch (e) {
    onSetSessionDescriptionError(e);
  }
  console.log('pc1 setRemoteDescription start');
  try {
    await pc1.setRemoteDescription(desc);
    onSetRemoteSuccess(pc1);
  } catch (e) {
    onSetSessionDescriptionError(e);
  }
}

async function onIceCandidate(pc, event) {
  try {
    await (getOtherPc(pc).addIceCandidate(event.candidate));
    onAddIceCandidateSuccess(pc);
  } catch (e) {
    onAddIceCandidateError(pc, e);
  }
  console.log(`${getName(pc)} ICE candidate:\n${event.candidate ? event.candidate.candidate : '(null)'}`);
}

function onAddIceCandidateSuccess(pc) {
  console.log(`${getName(pc)} addIceCandidate success`);
}

function onAddIceCandidateError(pc, error) {
  console.log(`${getName(pc)} failed to add ICE Candidate: ${error.toString()}`);
}

function onIceStateChange(pc, event) {
  if (pc) {
    console.log(`${getName(pc)} ICE state: ${pc.iceConnectionState}`);
    console.log('ICE state change event: ', event);
  }
}

async function hangup() {
  console.log('Ending call');
  pc1.close();
  pc2.close();
  pc1 = null;
  pc2 = null;

  /**
   * Step 13 - Disconnect source, destination and filterNode, stop all tracks
   */
  if (source) source.disconnect();
  if (destination) destination.disconnect();
  if (filterNode) filterNode.disconnect();
  if (localStream) localStream.getTracks().forEach((track) => track.stop());

  /**
   * Step 14 - Dispose filterNode, which will terminate worker
   */
  
  /**
   * Step 15 - Suspend audioContext
   */
   if (audioContext) await audioContext.suspend();

  /**
   * Step 16 - Dispose DenoiseProcessor
   */
  await denoiseProcessor.destroy();

  localStream = null;
  localVideo.srcObject = null;
  remoteVideo.srcObject = null;

  startButton.disabled = false;
  hangupButton.disabled = true;
  callButton.disabled = true;
  toggleButton.disabled = true;
  toggleButton.innerText = "Toggle Denoiser";
}

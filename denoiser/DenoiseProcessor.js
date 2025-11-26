var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var _a, _DenoiseProcessor_hasLoadedWorkModule;
export class DenoiseProcessor {
    constructor(options) {
        this.name = "denoise-filter";
        this.audioContext = undefined;
        this.filterOpts = options ?? { debugLogs: false, vadLogs: false };
        if (this.filterOpts.debugLogs) {
            console.log("DenoiseProcessor requested with options:", this.filterOpts);
        }
    }
    async init(audioContext) {
        return this._initInternal(audioContext, false);
    }
    async destroy() {
        if (this.filterOpts?.debugLogs) {
            console.log("Destroying DenoiseProcessor");
        }
        this._closeInternal();
    }
    async _initInternal(audioContext, restart) {
        if (restart) {
            this._closeInternal();
        }
        this.audioContext = audioContext;
        if (__classPrivateFieldGet(DenoiseProcessor, _a, "f", _DenoiseProcessor_hasLoadedWorkModule) === false) {
            // Load the worklet from the dist folder
            await this.audioContext.audioWorklet.addModule('./dist/DenoiseWorklet.js');
            __classPrivateFieldSet(DenoiseProcessor, _a, true, "f", _DenoiseProcessor_hasLoadedWorkModule);
        }
        // Process node
        // Currently we only denoise and send back one channel even to stereo inputs&outputs. And different
        // browsers have different behaviors regarding the number of channels in the input&output:
        // - Chrome/Edge will capture mic in mono by default and callback with stereo inputs&outputs always.
        // - Firefox will capture mic in stereo by default and callback with input&output with same channels.
        // - Safari probably capture mic in mono by default and callback with stereo inputs&outputs always.
        // If the second channel is not populated, the browser perhaps will have one silent channel at rendering.
        // There are two ways to work around this if we are not to do denoising both channels:
        // 1. Request mono audio only via getUserMedia() if Rnnoise is enabled.
        // 2. Request mono output to AudioWorkletNode. Browser will do the mixing for us.
        try {
            this.denoiseNode = new AudioWorkletNode(this.audioContext, "DenoiseWorklet", {
                // By default, there is only one Input/Output.
                outputChannelCount: [1],
                processorOptions: {
                    filterOpts: this.filterOpts,
                }
            });
        }
        catch (error) {
            throw new Error(`Failed to create DenoiseWorklet: ${error}. Make sure the worklet module is properly loaded.`);
        }
        return this.denoiseNode;
    }
    _closeInternal() {
        this.audioContext = undefined;
        __classPrivateFieldSet(DenoiseProcessor, _a, false, "f", _DenoiseProcessor_hasLoadedWorkModule);
    }
}
_a = DenoiseProcessor;
_DenoiseProcessor_hasLoadedWorkModule = { value: false };
//# sourceMappingURL=DenoiseProcessor.js.map
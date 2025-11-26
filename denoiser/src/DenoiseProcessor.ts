import { DenoiseOptions } from "./options"

// Read the DenoiseWorklet code for inlining
const DenoiseWorkletCode = process.env.DENOISER_WORKLET

export type DenoiseFilterOptions = DenoiseOptions

export class DenoiseProcessor {
    static #hasLoadedWorkModule: boolean = false;

    readonly name = "denoise-filter";
    processedTrack?: MediaStreamTrack | undefined;

    private audioContext?: AudioContext = undefined;
    private filterOpts?: DenoiseFilterOptions;
    private denoiseNode?: AudioWorkletNode | undefined;
    private enabled: boolean = true;

    constructor(options?: DenoiseFilterOptions) {
        this.filterOpts = options ?? {debugLogs: false, vadLogs: false};
        if (this.filterOpts.debugLogs) {
            console.log("DenoiseProcessor requested with options:", this.filterOpts);
        }
    }

    async init(audioContext: AudioContext) : Promise<AudioWorkletNode> {
        return this._initInternal(audioContext, false);
    }

    async destroy() : Promise<void> {
        if (this.filterOpts?.debugLogs) {
            console.log("Destroying DenoiseProcessor");
        }

        this._closeInternal();
    }

    async _initInternal(audioContext: AudioContext, restart: boolean): Promise<AudioWorkletNode> {
        if (restart) {
            this._closeInternal();
        }

        this.audioContext = audioContext;

        if (DenoiseProcessor.#hasLoadedWorkModule === false) {
            // Load the inlined worklet code
            const blob = new Blob([DenoiseWorkletCode || ''], { type: 'application/javascript' });
            await this.audioContext.audioWorklet.addModule(URL.createObjectURL(blob));

            DenoiseProcessor.#hasLoadedWorkModule = true;
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
                outputChannelCount: [1], // An array defining the number of channels for each output. 
                processorOptions: {
                    filterOpts: this.filterOpts,
                }
            });
        } catch (error) {
            throw new Error(`Failed to create DenoiseWorklet: ${error}. Make sure the worklet module is properly loaded.`);
        }

        // Add enable/disable methods to the node
        (this.denoiseNode as any).isEnabled = () => this.enabled;
        (this.denoiseNode as any).enable = () => {
            this.enabled = true;
            this.denoiseNode!.port.postMessage({ type: 'setEnabled', enabled: true });
        };
        (this.denoiseNode as any).disable = () => {
            this.enabled = false;
            this.denoiseNode!.port.postMessage({ type: 'setEnabled', enabled: false });
        };

        return this.denoiseNode
    }

    _closeInternal(): void {
        this.audioContext = undefined as any;

        DenoiseProcessor.#hasLoadedWorkModule = false;
    }
}

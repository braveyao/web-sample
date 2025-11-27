import { AudioDenoiser } from "../AudioDenoiser";
// @ts-ignore
import createRNNWasmModuleSync from './wasm/rnnoise-sync'

// Minimal EmscriptenModule type definition for compatibility, to succeed compiling.
interface EmscriptenModule {
    HEAPF32: Float32Array;
    _malloc: (size: number) => number;
    _free: (ptr: number) => void;
}

interface RnnoiseModule extends EmscriptenModule {
    _rnnoise_create: () => number;
    _rnnoise_destroy: (context: number) => void;
    _rnnoise_process_frame: (context: number, input: number, output: number) => number;}

/**
 * Constant. Rnnoise default sample size, samples of different size won't work.
 */
export const RNNOISE_SAMPLE_LENGTH = 480;

/**
 *  Constant. Rnnoise only takes inputs of 480 PCM float32 samples thus 480*4.
 */
const RNNOISE_BUFFER_SIZE: number = RNNOISE_SAMPLE_LENGTH * 4;

/**
 * Used to shift a 32 bit number by 16 bits.
 */
const SHIFT_16_BIT_NR = 32768;

export default class RnnoiseProcessor implements AudioDenoiser {
    /**
     * Rnnoise context object needed to perform the audio processing.
     */
    private context?: number;

    /**
     * State flag, check if the instance was destroyed.
     */
    private destroyed = false;

    /**
     * WASM interface through which calls to rnnoise are made.
     */
    private wasmInterface!: RnnoiseModule;

    /**
     * WASM dynamic memory buffer used as input for rnnoise processing method.
     */
    private wasmPcmInput!: number;

    /**
     * The Float32Array index representing the start point in the wasm heap of the wasmPcmInput buffer.
     */
    private wasmPcmInputF32Index!: number;

    /**
     * Constructor.
     */
    constructor() {
        // Considering that we deal with dynamic allocated memory employ exception safety strong guarantee
        // i.e. in case of exception there are no side effects.
        this.wasmInterface = createRNNWasmModuleSync();

        // For VAD score purposes only allocate the buffers once and reuse them
        this.wasmPcmInput = this.wasmInterface._malloc(RNNOISE_BUFFER_SIZE);
        this.wasmPcmInputF32Index = this.wasmPcmInput >> 2;
        if (!this.wasmPcmInput) {
            throw Error('Failed to create wasm input memory buffer!');
        }
    }

    /**
     * Initialize the processor in the AudioWorklet context.
     */
    async initialize(): Promise<void> {
        try {
            if (!this.wasmInterface) {
                throw new Error("WASM interface not initialized");
            }
            this.context = this.wasmInterface._rnnoise_create();
            if (!this.context) {
                throw new Error("Failed to create Rnnoise context");
            }
        } catch (error) {
            console.error("Rnnoise: Processor initialization failed:", error);
            this.destroy();
            throw error;
        }
    }

    /**
     * Release resources associated with the wasm context. If something goes downhill here
     * i.e. Exception is thrown, there is nothing much we can do.
     *
     * @returns {void}
     */
    private releaseWasmResources(): void {
        if (this.wasmPcmInput) {
            this.wasmInterface._free(this.wasmPcmInput);
        }

        if (this.context) {
            this.wasmInterface._rnnoise_destroy(this.context);
        }
    }

    /**
     * Rnnoise can only operate on a certain PCM array size.
     *
     * @returns {number} - The PCM sample array size as required by rnnoise.
     */
    getSampleLength(): number {
        return RNNOISE_SAMPLE_LENGTH;
    }

    /**
     * Release any resources required by the rnnoise context this needs to be called
     * before destroying any context that uses the processor.
     *
     * @returns {void}
     */
    destroy(): void {
        if (this.destroyed) {
            return;
        }

        this.releaseWasmResources();

        this.destroyed = true;
    }

    /**
     * Process an audio frame, optionally denoising the input pcmFrame and returning the Voice Activity Detection score
     * for a raw Float32 PCM sample Array.
     * The size of the array must be of exactly 480 samples, this constraint comes from the rnnoise library.
     *
     * @param {Float32Array} pcmFrame - Array containing 32 bit PCM samples. Parameter is also used as output.
     * @returns {Float} Contains VAD score in the interval 0 - 1 i.e. 0.90 .
     */
    processAudioFrame(pcmFrame: Float32Array): number {
        if (!this.context) {
            throw new Error("RnnoiseProcessor not initialized");
        }

        // Convert 32 bit Float PCM samples to 16 bit Float PCM samples as that's what rnnoise accepts as input
        for (let i = 0; i < RNNOISE_SAMPLE_LENGTH; i++) {
            this.wasmInterface.HEAPF32[this.wasmPcmInputF32Index + i] = pcmFrame[i] * SHIFT_16_BIT_NR;
        }

        // Use the same buffer for input/output, rnnoise supports this behavior
        const vadScore = this.wasmInterface._rnnoise_process_frame(
            this.context,
            this.wasmPcmInput,
            this.wasmPcmInput
        );

        // Convert back to 32 bit PCM
        for (let i = 0; i < RNNOISE_SAMPLE_LENGTH; i++) {
            pcmFrame[i] = this.wasmInterface.HEAPF32[this.wasmPcmInputF32Index + i] / SHIFT_16_BIT_NR;
        }

        return vadScore;
    }
}

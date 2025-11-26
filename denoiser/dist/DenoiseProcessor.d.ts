import { DenoiseOptions } from "./options";
export type DenoiseFilterOptions = DenoiseOptions;
export declare class DenoiseProcessor {
    #private;
    readonly name = "denoise-filter";
    processedTrack?: MediaStreamTrack | undefined;
    private audioContext?;
    private filterOpts?;
    private denoiseNode?;
    private enabled;
    constructor(options?: DenoiseFilterOptions);
    init(audioContext: AudioContext): Promise<AudioWorkletNode>;
    destroy(): Promise<void>;
    _initInternal(audioContext: AudioContext, restart: boolean): Promise<AudioWorkletNode>;
    _closeInternal(): void;
}
//# sourceMappingURL=DenoiseProcessor.d.ts.map
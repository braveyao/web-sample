export interface AudioDenoiser {
    
    initialize(): Promise<void>;

    processAudioFrame(pcmFrame: Float32Array): number

    getSampleLength(): number;
    
    destroy(): void;
}
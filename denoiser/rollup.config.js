import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import nodeResolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import replace from '@rollup/plugin-replace';
import terser from '@rollup/plugin-terser';

const packageJson = JSON.parse(readFileSync('./package.json', 'utf8'));

// Helper to read worklet code (will be available after first build)
function getWorkletCode() {
  const workletPath = resolve('dist/DenoiseWorklet.js');
  if (existsSync(workletPath)) {
    return readFileSync(workletPath, 'utf8');
  }
  return ''; // Empty string for initial build
}

export default (commandLineArgs) => {
  const isWorkletBuild = commandLineArgs.configWorklet;
  
  if (isWorkletBuild) {
    // First build: DenoiseWorklet only
    return {
      input: 'src/DenoiseWorklet.ts',
      output: {
        file: 'dist/DenoiseWorklet.js',
        format: 'es',
        sourcemap: true,
      },
      plugins: [
        nodeResolve(),
        commonjs(),
        typescript({
          tsconfig: 'tsconfig.json',
        }),
        terser(),
      ],
    };
  }
  
  // Second build: Main bundle with inlined worklet
  return {
    input: 'src/index.ts',
    output: {
      file: 'dist/index.js',
      format: 'es',
      name: 'DenoiseProcessor',
      sourcemap: true,
    },
    plugins: [
      nodeResolve(),
      commonjs(),
      typescript({
        tsconfig: 'tsconfig.json',
      }),
      replace({
        preventAssignment: true,
        'process.env.DENOISER_WORKLET': JSON.stringify(getWorkletCode()),
        'process.env.PACKAGE_NAME': JSON.stringify(packageJson.name),
      }),
      terser(),
    ],
  };
};

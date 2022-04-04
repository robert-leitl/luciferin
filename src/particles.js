
import computeFragmentShaderSource from './shader/compute.frag';
import computeVertexShaderSource from './shader/compute.vert';
import { createProgram, makeBuffer, makeTransformFeedback, makeVertexArray } from './utils/webgl-utils';

export class Particles {

    constructor(gl, count) {
        /** @type {WebGlRenderingContext} */
        const gl = gl;
        this.gl = gl;

        // setup programs
        this.program = createProgram(gl, [computeVertexShaderSource, computeFragmentShaderSource], ['t_newPosition', 't_newVelocity']);

        // find the locations
        this.locations = {
            a_oldPosition: gl.getAttribLocation(this.program, 'a_oldPosition'),
            a_oldVelocity: gl.getAttribLocation(this.program, 'a_oldVelocity'),
            u_deltaTime: gl.getUniformLocation(this.program, 'u_deltaTime'),
            u_frames: gl.getUniformLocation(this.program, 'u_frames')
        };

        // init the positions and velocities
        this.NUM_PARTICLES = count;
        const s = .1;
        const positions = new Float32Array(Array(this.NUM_PARTICLES).fill(0).map(_ => Array(3).fill(0).map(_ => (Math.random() * 2 - 1) * s)).flat());
        const velocities = new Float32Array(Array(this.NUM_PARTICLES).fill(0).map(_ => Array(3).fill(0).map(_ => (Math.random() * 2 - 1) * 0.001 )).flat());

        // make the buffers
        this.positionBuffers = [
            makeBuffer(gl, positions, this.gl.DYNAMIC_DRAW),
            makeBuffer(gl, positions, this.gl.DYNAMIC_DRAW)
        ];
        this.velocityBuffers = [
            makeBuffer(gl, velocities, this.gl.DYNAMIC_DRAW),
            makeBuffer(gl, velocities, this.gl.DYNAMIC_DRAW)
        ];

        // create the compute VAOs
        this.compute1VAO = makeVertexArray(gl, [
            [this.positionBuffers[0], this.locations.a_oldPosition, 3],
            [this.velocityBuffers[0], this.locations.a_oldVelocity, 3]
        ]);
        this.compute2VAO = makeVertexArray(gl, [
            [this.positionBuffers[1], this.locations.a_oldPosition, 3],
            [this.velocityBuffers[1], this.locations.a_oldVelocity, 3]
        ]);

        // make the transform feedbacks
        this.transformFeedback1 = makeTransformFeedback(gl, [this.positionBuffers[0], this.velocityBuffers[0]]);
        this.transformFeedback2 = makeTransformFeedback(gl, [this.positionBuffers[1], this.velocityBuffers[1]]);

        // unbind left over stuff
        gl.bindBuffer(this.gl.ARRAY_BUFFER, null);
        gl.bindBuffer(this.gl.TRANSFORM_FEEDBACK_BUFFER, null);

        // this are the render states
        this.currentRenderState = {
            resultPositionBufferIndex: 1,
            computeVAO: this.compute1VAO,
            transformFeedback: this.transformFeedback2
        };
        this.nextRenderState = {
            resultPositionBufferIndex: 0,
            computeVAO: this.compute2VAO,
            transformFeedback: this.transformFeedback1
        };

        this.positionBuffer = this.currentRenderState.resultPositionBuffer;
    }

    update(frames = 0, deltaTime = 0) {
        /** @type {WebGlRenderingContext} */
        const gl = this.gl;

        // compute
        gl.enable(gl.RASTERIZER_DISCARD);
        gl.useProgram(this.program);
        gl.bindVertexArray(this.currentRenderState.computeVAO);
        gl.uniform1f(this.locations.u_deltaTime, (deltaTime + 0.0001));
        gl.uniform1i(this.locations.u_frames, frames);
        gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, this.currentRenderState.transformFeedback);
        gl.beginTransformFeedback(gl.POINTS);
        gl.drawArrays(gl.POINTS, 0, this.NUM_PARTICLES);
        gl.endTransformFeedback();
        gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, null);
        gl.disable(gl.RASTERIZER_DISCARD);

        const resultPositionBufferIndex = this.currentRenderState.resultPositionBufferIndex;

        // swap the render states
        const currentState = this.currentRenderState;
        this.currentRenderState = this.nextRenderState;
        this.nextRenderState = currentState;

        return resultPositionBufferIndex;
    }
}

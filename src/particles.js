
import { vec3 } from 'gl-matrix';
import computeFragmentShaderSource from './shader/compute.frag';
import computeVertexShaderSource from './shader/compute.vert';
import { createProgram, makeBuffer, makeTransformFeedback, makeVertexArray } from './utils/webgl-utils';

export class Particles {

    settings = {
        velocity: 1,
        curl: 1,
        noise: 1
    }

    constructor(gl, count) {
        this.gl = gl;
        
        // setup programs
        this.program = createProgram(gl, [computeVertexShaderSource, computeFragmentShaderSource], ['t_newPosition', 't_newVelocity']);

        // find the locations
        this.locations = {
            a_oldPosition: gl.getAttribLocation(this.program, 'a_oldPosition'),
            a_oldVelocity: gl.getAttribLocation(this.program, 'a_oldVelocity'),
            u_deltaTime: gl.getUniformLocation(this.program, 'u_deltaTime'),
            u_frames: gl.getUniformLocation(this.program, 'u_frames'),
            u_velocity: gl.getUniformLocation(this.program, 'u_velocity'),
            u_noiseStrength: gl.getUniformLocation(this.program, 'u_noiseStrength'),
            u_curlStrength: gl.getUniformLocation(this.program, 'u_curlStrength')
        };

        // init the positions and velocities
        this.NUM_PARTICLES = count;
        const s = .5;
        const positions = new Float32Array(Array(this.NUM_PARTICLES).fill(0).map(_ => 
            Array.from(vec3.scale(
                vec3.create(),
                vec3.normalize(
                    vec3.create(), 
                    vec3.fromValues(
                        (Math.random() * 2 - 1),
                        (Math.random() * 2 - 1),
                        (Math.random() * 2 - 1)
                    )),
                s
            ))
        ).flat());
        const velocities = new Float32Array(Array(this.NUM_PARTICLES).fill(0).map(_ => Array(3).fill(0).map(_ => (Math.random() * 2 - 1) * 0.0003 )).flat());

        // make the buffers
        this.positionBuffers = [
            makeBuffer(gl, positions, gl.DYNAMIC_DRAW),
            makeBuffer(gl, positions, gl.DYNAMIC_DRAW)
        ];
        this.velocityBuffers = [
            makeBuffer(gl, velocities, gl.DYNAMIC_DRAW),
            makeBuffer(gl, velocities, gl.DYNAMIC_DRAW)
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
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        gl.bindBuffer(gl.TRANSFORM_FEEDBACK_BUFFER, null);

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
        gl.uniform1f(this.locations.u_velocity, this.settings.velocity);
        gl.uniform1f(this.locations.u_noiseStrength, this.settings.noise);
        gl.uniform1f(this.locations.u_curlStrength, this.settings.curl);
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

import { vec3 } from 'gl-matrix';

// Credits: https://github.com/pailhead/three-rounded-box/blob/master/index.js
export class RoundedBoxGeometry {

    constructor( 
        width, 
        height, 
        depth, 
        radius, 
        radiusSegments
    ) {
        //validate params ===================================
    
        radiusSegments = !isNaN( radiusSegments ) ? Math.max( 1, Math.floor( radiusSegments ) ) : 1 ;
    
        width =  !isNaN(width)  ? width  : 1;
        height = !isNaN(height) ? height : 1;
        depth =  !isNaN(depth)  ? depth  : 1;
    
        radius = !isNaN(radius) ? radius : .15;
    
        radius = Math.min( radius , Math.min( width , Math.min( height , Math.min( depth ) ) ) / 2 );
    
        const edgeHalfWidth =  width / 2 - radius;
        const edgeHalfHeight = height / 2 - radius;
        const edgeHalfDepth =  depth / 2 - radius;
    
        //calculate vertices count ==========================
    
        const rs1 =  radiusSegments + 1; //radius segments + 1 
    
        const totalVertexCount = ( rs1 * radiusSegments + 1 ) << 3; 
    
    
        //make buffers ======================================
    
        const positions = new Float32Array( totalVertexCount * 3 );
        
        const normals = new Float32Array( totalVertexCount * 3 );
        
    
        //some vars =========================================
    
        let 
            cornerVerts = [], 
            cornerNormals = [],
            normal = vec3.create(),
            vertex = vec3.create(),
            vertexPool = [],
            normalPool = [],
            indices = []
        ;
    
        let
            lastVertex = rs1 * radiusSegments,
            cornerVertNumber = rs1 * radiusSegments + 1
        ;
    
        //////////////////// VERTICES
    
        //corner offsets
        let cornerLayout = [
            vec3.fromValues(  1 ,  1 ,  1 ),
            vec3.fromValues(  1 ,  1 , -1 ),
            vec3.fromValues( -1 ,  1 , -1 ),
            vec3.fromValues( -1 ,  1 ,  1 ),
            vec3.fromValues(  1 , -1 ,  1 ),
            vec3.fromValues(  1 , -1 , -1 ),
            vec3.fromValues( -1 , -1 , -1 ),
            vec3.fromValues( -1 , -1 ,  1 )
        ];

        //corner holder 
        for ( let j = 0 ; j < 8 ; j ++ ){

            cornerVerts.push([]); 
            cornerNormals.push([]); 

        }

        //construct 1/8 sphere ==============================

        let PIhalf = Math.PI / 2;

        let cornerOffset = vec3.fromValues( edgeHalfWidth , edgeHalfHeight , edgeHalfDepth );

        for ( let y = 0; y <= radiusSegments; y ++ ) {

            let v = y / radiusSegments;

            let va = v * PIhalf; //arrange in 90 deg

            let cosVa = Math.cos( va ); //scale of vertical angle 

            let sinVa = Math.sin( va );

            if( y == radiusSegments ){

                vec3.set(vertex, 0, 1, 0);

                let vert = vec3.clone(vertex);
                vec3.scale(vert, vert, radius);
                vec3.add(vert, vert, cornerOffset);
                
                cornerVerts[0].push( vert );

                vertexPool.push( vert );
                
                let norm = vec3.normalize(vec3.create(), vertex);

                cornerNormals[0].push( norm );

                normalPool.push( norm );

                continue; //skip row loop
            
            } 	

            for ( let x = 0; x <= radiusSegments; x ++ ) {

                let u = x / radiusSegments;

                let ha = u * PIhalf;

                //make 1/8 sphere points
                vertex[0] = cosVa * Math.cos( ha );
                vertex[1] = sinVa;
                vertex[2] = cosVa * Math.sin( ha );

                //copy sphere point, scale by radius, offset by half whd
                let vert = vec3.clone(vertex);
                vec3.scale(vert, vert, radius);
                vec3.add(vert, vert, cornerOffset);

                cornerVerts[0].push( vert );

                vertexPool.push( vert );
                
                //sphere already normalized, just clone

                let norm = vec3.normalize(vec3.create(), vec3.clone(vertex));

                cornerNormals[0].push( norm );
                normalPool.push( norm );

            }

        }

        //distribute corner verts ===========================

        for ( let i = 1 ; i < 8 ; i ++ ){

            for( let j = 0 ; j < cornerVerts[0].length ; j ++ ){

                let vert = vec3.multiply(vec3.create(), cornerVerts[0][j], cornerLayout[i]);

                cornerVerts[i].push( vert );
                
                vertexPool.push( vert );

                let norm = vec3.multiply(vec3.create(), cornerNormals[0][j], cornerLayout[i]);

                cornerNormals[i].push( norm );

                normalPool.push( norm );

            }

        }	

        //////////////////// FACES

        //top
        let a = lastVertex;// + cornerVertNumber * 0;
        let b = lastVertex + cornerVertNumber;// * 1;
        let c = lastVertex + cornerVertNumber * 2;
        let d = lastVertex + cornerVertNumber * 3;

        indices.push( a );
        indices.push( b );
        indices.push( c );
        indices.push( a );
        indices.push( c );
        indices.push( d );

        //bottom
        a = lastVertex + cornerVertNumber * 4;// + cornerVertNumber * 0;
        b = lastVertex + cornerVertNumber * 5;// * 1;
        c = lastVertex + cornerVertNumber * 6;
        d = lastVertex + cornerVertNumber * 7;

        indices.push( a );
        indices.push( c );
        indices.push( b );
        indices.push( a );
        indices.push( d );
        indices.push( c );

        //left 
        a = 0;
        b = cornerVertNumber;
        c = cornerVertNumber * 4;
        d = cornerVertNumber * 5;

        indices.push( a );
        indices.push( c );
        indices.push( b );
        indices.push( b );
        indices.push( c );
        indices.push( d );

        //right 
        a = cornerVertNumber * 2;
        b = cornerVertNumber * 3;
        c = cornerVertNumber * 6;
        d = cornerVertNumber * 7;

        indices.push( a );
        indices.push( c );
        indices.push( b );
        indices.push( b );
        indices.push( c );
        indices.push( d );

        //front 
        a = radiusSegments;
        b = radiusSegments + cornerVertNumber * 3;
        c = radiusSegments + cornerVertNumber * 4;
        d = radiusSegments + cornerVertNumber * 7;

        indices.push( a );
        indices.push( b );
        indices.push( c );
        indices.push( b );
        indices.push( d );
        indices.push( c );

        //back 
        a = radiusSegments + cornerVertNumber;
        b = radiusSegments + cornerVertNumber * 2;
        c = radiusSegments + cornerVertNumber * 5;
        d = radiusSegments + cornerVertNumber * 6;

        indices.push( a );
        indices.push( c );
        indices.push( b );
        indices.push( b );
        indices.push( c );
        indices.push( d );
    
        //////////////////// CORNERS
        
        let indexInd = 0;


        let flips = [
            true,
            false,
            true,
            false,
            false,
            true,
            false,
            true
        ];

        let lastRowOffset = rs1 * ( radiusSegments - 1 );

        for ( let i = 0 ; i < 8 ; i ++ ){

            let cornerOffset = cornerVertNumber * i;

            for ( let v = 0 ; v < radiusSegments - 1 ; v ++ ){

                let r1 = v * rs1; 		//row offset
                let r2 = (v + 1) * rs1; //next row

                for ( let u = 0 ; u < radiusSegments ; u ++ ){

                    let u1 = u + 1;
                    let a = cornerOffset + r1 + u;
                    let b = cornerOffset + r1 + u1;
                    let c = cornerOffset + r2 + u;
                    let d = cornerOffset + r2 + u1;

                    if( !flips[i] ){

                        indices.push( a );
                        indices.push( b );
                        indices.push( c );

                        indices.push( b );
                        indices.push( d );
                        indices.push( c );

                    } else {

                        indices.push( a );
                        indices.push( c );
                        indices.push( b );

                        indices.push( b );
                        indices.push( c );
                        indices.push( d );

                    }

                }

            }
            
            for ( let u = 0 ; u < radiusSegments ; u ++ ){

                let a = cornerOffset + lastRowOffset + u;
                let b = cornerOffset + lastRowOffset + u + 1;
                let c = cornerOffset + lastVertex;

                if( !flips[i] ){

                    indices.push( a );
                    indices.push( b );
                    indices.push( c );

                } else {

                    indices.push( a );
                    indices.push( c );
                    indices.push( b );

                }

            }

        }
    
        //////////////////// HEIGHT EDGES

        for ( let i = 0 ; i < 4 ; i ++ ){

            let cOffset = i * cornerVertNumber;
            let cRowOffset = 4 * cornerVertNumber + cOffset;
            let needsFlip = i & 1 === 1;
            for ( let u = 0 ; u < radiusSegments ; u ++ ){

                let u1 = u + 1;
                let a = cOffset + u;
                let b = cOffset + u1;
                let c = cRowOffset + u;
                let d = cRowOffset + u1;

                if( !needsFlip ){

                    indices.push( a );
                    indices.push( b );
                    indices.push( c );
                    indices.push( b );
                    indices.push( d );
                    indices.push( c );

                } else {

                    indices.push( a );
                    indices.push( c );
                    indices.push( b );
                    indices.push( b );
                    indices.push( c );
                    indices.push( d );

                }

            }

        }

        //////////////////// WIDTH EDGES

        let end = radiusSegments - 1;

        let cStartsW = [ 0 , 1 , 4 , 5 ];
        let cEndsW =   [ 3 , 2 , 7 , 6 ];
        let needsFlip = [0,1,1,0];

        for ( let i = 0 ; i < 4 ; i ++ ){

            let cStart = cStartsW[i] * cornerVertNumber;
            let cEnd = cEndsW[i] * cornerVertNumber;
            

            for ( let u = 0 ; u <= end ; u ++ ){

                // let dInd = u != end ? radiusSegments + u * rs1 : cornerVertNumber - 1;

                let a = cStart + radiusSegments + u * rs1;
                let b = cStart + (u != end ? radiusSegments + (u + 1) * rs1 : cornerVertNumber - 1);

                let c = cEnd + radiusSegments + u * rs1;
                let d = cEnd + (u != end ? radiusSegments + (u + 1) * rs1 : cornerVertNumber - 1);

                if( !needsFlip[i] ){

                    indices.push( a );
                    indices.push( b );
                    indices.push( c );
                    indices.push( b );
                    indices.push( d );
                    indices.push( c );

                } 
                else {

                    indices.push( a );
                    indices.push( c );
                    indices.push( b );
                    indices.push( b );
                    indices.push( c );
                    indices.push( d );

                }

            }

        }

        //////////////////// DEPTH EDGES

        let cStartsD = [ 0 , 2 , 4 , 6 ];
        let cEndsD =   [ 1 , 3 , 5 , 7 ];
            
        for ( let i = 0 ; i < 4 ; i ++ ){

            let cStartD = cornerVertNumber * cStartsD[ i ];
            let cEndD =   cornerVertNumber * cEndsD[ i ];

            let needsFlip = 1 >= i;

            for ( let u = 0 ; u < radiusSegments ; u ++ ){

                let urs1 =  u * rs1;
                let u1rs1 = (u+1) * rs1;

                let a = cStartD + urs1;
                let b = cStartD + u1rs1;
                let c = cEndD + urs1;
                let d = cEndD + u1rs1

                if( needsFlip ){

                    indices.push( a );
                    indices.push( c );
                    indices.push( b );
                    indices.push( b );
                    indices.push( c );
                    indices.push( d );

                } else {

                    indices.push( a );
                    indices.push( b );
                    indices.push( c );
                    indices.push( b );
                    indices.push( d );
                    indices.push( c );

                }

            }

        }
    
        //fill buffers ======================================
    
        let index = 0;
    
        for ( let i = 0 ; i < vertexPool.length ; i ++ ){
    
            positions.set(vertexPool[i], index * 3);
    
            normals.set(normalPool[i], index * 3);
    
            index++;
    
        }
    
        this.vertices = positions;
        this.normals = normals;
        this.indices = indices;
        this.count = indices.length;
        
    };
}
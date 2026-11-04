(()=>{
'use strict';
// Original RedSails scene. Static buffers; particle motion and projection run on the GPU.
const projection=`
uniform vec4 uRotation;
uniform vec4 uViewport;
uniform vec2 uAnchor;
uniform vec3 uCamera;
uniform vec3 uFocus;
vec3 cameraPoint(vec3 p){
 p-=uFocus;
 float x=p.x*uRotation.x+p.z*uRotation.y;
 float z=-p.x*uRotation.y+p.z*uRotation.x;
 return vec3(x,p.y*uRotation.z-z*uRotation.w,p.y*uRotation.w+z*uRotation.z);
}
vec4 projectPoint(vec3 p){
 vec3 q=cameraPoint(p);
 float w=uCamera.x-q.z;
 vec2 centre=uAnchor*vec2(2.0,-2.0)+vec2(-1.0,1.0);
 vec2 xy=centre*w+q.xy*(2240.0*uViewport.z)/uViewport.xy;
 float z=((uCamera.z+uCamera.y)*w-2.0*uCamera.z*uCamera.y)/(uCamera.z-uCamera.y);
 return vec4(xy,z,w);
}
float pointScale(vec3 p){return uViewport.z*1120.0/max(uCamera.y,uCamera.x-cameraPoint(p).z);}
`;
const particleVertex=`
precision highp float;
attribute vec4 aSeed;
attribute vec3 aNoise;
uniform float uTime;
uniform float uActive;
uniform float uDensity;
${projection}
varying vec4 vColor;
void main(){
 float lane=aSeed.z;
 float travel=fract(aSeed.y+uTime*.025);
 float theta=travel*15.7+lane*2.094395+uTime*.105;
 float radius=212.0+24.0*sin(travel*12.56+lane*.7);
 vec3 p=vec3(cos(theta)*radius,(travel-.5)*540.0,sin(theta)*radius*.76);
 p+=aNoise*vec3(7.0,4.0,7.0);
 vec3 ink=lane<.5?vec3(.94,.25,.46):lane<1.5?vec3(.98,.72,.43):vec3(.78,.73,1.0);
 float glow=.6+.4*pow(.5+.5*sin(theta+uTime*.25),3.0);
 float alpha=(.58+.42*aSeed.w)*glow;
 float size=(1.25+2.2*aSeed.w)*uViewport.w;
 if(lane>2.5&&lane<3.5){
  float a=aSeed.x*6.283+uTime*.18;
  float b=aSeed.y*3.14159;
  p=vec3(cos(a)*sin(b),cos(b),sin(a)*sin(b))*(23.0+15.0*aSeed.w);
  ink=vec3(.97,.84,.95);alpha=.24+.45*aSeed.w;size*=1.15;
 }else if(lane>3.5){
  p=aNoise*vec3(570.0,370.0,420.0);
  ink=vec3(.82,.63,.79);alpha=.12+.15*aSeed.w;size=.8*uViewport.w;
 }else{
  alpha*=smoothstep(0.0,.045,travel)*smoothstep(0.0,.055,1.0-travel);
  ink=mix(ink,vec3(.97,.92,1.0),pow(.5+.5*cos(theta*1.25),8.0)*.7);
  if(abs(uActive-lane)<.2){alpha*=1.35;size*=1.1;}
 }
 float depthFade=clamp(pointScale(p)/max(uViewport.z,.01),.35,1.4);
 vColor=vec4(ink,alpha*depthFade*uDensity);
 gl_Position=projectPoint(p);
 gl_PointSize=clamp(size*clamp(pointScale(p),.65,1.8),1.0,8.0);
}
`;
const particleFragment=`
precision mediump float;
varying vec4 vColor;
void main(){
 vec2 p=gl_PointCoord*2.0-1.0;
 float r=dot(p,p);
 if(r>1.0)discard;
 float soft=exp(-r*2.8)*smoothstep(1.0,.25,r);
 gl_FragColor=vec4(vColor.rgb,vColor.a*soft);
}
`;
const lineVertex=`
precision highp float;
attribute vec3 aPosition;
attribute vec4 aColor;
${projection}
varying vec4 vColor;
void main(){vColor=aColor;if(aPosition.y< -270.0)vColor.a*=.12+.88*smoothstep(180.0,950.0,uCamera.x);gl_Position=projectPoint(aPosition);}
`;
const lineFragment=`precision mediump float;varying vec4 vColor;void main(){gl_FragColor=vColor;}`;
function create(canvas){
 let gl;try{gl=canvas.getContext('webgl',{alpha:true,antialias:false,depth:false,stencil:false,premultipliedAlpha:true,powerPreference:'high-performance',preserveDrawingBuffer:false});}catch{return null;}
 if(!gl)return null;
 const particleCount=10500,seeds=new Float32Array(particleCount*7),lines=[];
 let randomState=2027;
 function random(){randomState=(Math.imul(randomState,1664525)+1013904223)>>>0;return randomState/4294967296;}
 for(let i=0;i<particleCount;i++){const o=i*7,lane=i%23===0?4:i%17===0?3:i%3;seeds[o]=random();seeds[o+1]=random();seeds[o+2]=lane;seeds[o+3]=random();for(let j=4;j<7;j++)seeds[o+j]=(random()+random()+random()-1.5)*.9;}
 const addLine=(a,b,c)=>{lines.push(...a,...c,...b,...c);};
 const gridInk=[.51,.36,.53,.16];
 for(let i=-11;i<=11;i++){const q=i*64;addLine([q,-284,-720],[q,-284,720],gridInk);addLine([-720,-284,q],[720,-284,q],gridInk);}
 // Original floor hexagons add scale without textures or external assets.
 for(let i=0;i<32;i++){const x=(random()-.5)*1300,z=(random()-.5)*1150,r=11+random()*7;for(let j=0;j<6;j++){const a=j*Math.PI/3,b=(j+1)*Math.PI/3;addLine([x+Math.cos(a)*r,-282,z+Math.sin(a)*r],[x+Math.cos(b)*r,-282,z+Math.sin(b)*r],[.67,.44,.6,.21]);}}
 const points=[[0,70,0],[0,-70,0],[-65,0,0],[65,0,0],[0,0,65],[0,0,-65]],edgeInk=[.94,.68,.83,.47];
 for(const a of [0,1])for(const b of [2,3,4,5])addLine(points[a],points[b],edgeInk);for(const [a,b] of [[2,4],[4,3],[3,5],[5,2]])addLine(points[a],points[b],edgeInk);
 // Mandate spine and three distinct delivery connections.
 addLine([0,-280,0],[0,306,0],[.83,.68,.85,.20]);
 const anchors=[[-250,88,70],[250,50,-30],[15,-195,115]];
 anchors.forEach((p,i)=>{addLine([0,0,0],p,[.87,.65,.79,.28]);for(let j=0;j<48;j++){const a=j*Math.PI/24,b=(j+1)*Math.PI/24;addLine([p[0]+Math.cos(a)*25,p[1]+Math.sin(a)*25,p[2]],[p[0]+Math.cos(b)*25,p[1]+Math.sin(b)*25,p[2]],[.86,.64,.8,.37]);}});
 const lineData=new Float32Array(lines);let programs,buffers,lost=false,valid=false,width=1,height=1,dpr=1,count=particleCount,quality=0;
 const rotation=new Float32Array(4),viewport=new Float32Array(4),anchor=new Float32Array(2),camera=new Float32Array(3),focus=new Float32Array(3);
 const diagnostics={renderer:'webgl',particleCount,drawCalls:2,quality:'high',contextLost:false,initializationError:null};
 function shader(type,source){const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){const msg=gl.getShaderInfoLog(s);gl.deleteShader(s);throw Error(msg||'Shader compilation failed');}return s;}
 function program(vertex,fragment,attributes,extras=[]){const v=shader(gl.VERTEX_SHADER,vertex),f=shader(gl.FRAGMENT_SHADER,fragment),p=gl.createProgram();gl.attachShader(p,v);gl.attachShader(p,f);gl.linkProgram(p);gl.deleteShader(v);gl.deleteShader(f);if(!gl.getProgramParameter(p,gl.LINK_STATUS)){const msg=gl.getProgramInfoLog(p);gl.deleteProgram(p);throw Error(msg||'Shader link failed');}return {p,attributes:attributes.map(n=>gl.getAttribLocation(p,n)),uniforms:Object.fromEntries(['uRotation','uViewport','uAnchor','uCamera','uFocus',...extras].map(n=>[n,gl.getUniformLocation(p,n)]))};}
 function initialize(){try{programs={particles:program(particleVertex,particleFragment,['aSeed','aNoise'],['uTime','uActive','uDensity']),lines:program(lineVertex,lineFragment,['aPosition','aColor'])};buffers={particles:gl.createBuffer(),lines:gl.createBuffer()};gl.bindBuffer(gl.ARRAY_BUFFER,buffers.particles);gl.bufferData(gl.ARRAY_BUFFER,seeds,gl.STATIC_DRAW);gl.bindBuffer(gl.ARRAY_BUFFER,buffers.lines);gl.bufferData(gl.ARRAY_BUFFER,lineData,gl.STATIC_DRAW);gl.disable(gl.DEPTH_TEST);gl.disable(gl.CULL_FACE);gl.enable(gl.BLEND);gl.clearColor(0,0,0,0);gl.viewport(0,0,canvas.width,canvas.height);valid=true;lost=false;diagnostics.contextLost=false;return true;}catch(e){diagnostics.initializationError=String(e.message);valid=false;return false;}}
 function bind(p,buffer,sizes){gl.useProgram(p.p);gl.bindBuffer(gl.ARRAY_BUFFER,buffer);let offset=0;for(let i=0;i<sizes.length;i++){const a=p.attributes[i];if(a>=0){gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,sizes[i],gl.FLOAT,false,28,offset);}offset+=sizes[i]*4;}gl.uniform4fv(p.uniforms.uRotation,rotation);gl.uniform4fv(p.uniforms.uViewport,viewport);gl.uniform2fv(p.uniforms.uAnchor,anchor);gl.uniform3fv(p.uniforms.uCamera,camera);gl.uniform3fv(p.uniforms.uFocus,focus);}
 function setQuality(tier,mobile=false){quality=Math.max(0,Math.min(2,tier));count=(mobile?[6600,4200,2400]:[10500,6600,3300])[quality];diagnostics.particleCount=count;diagnostics.quality=['high','balanced','light'][quality];}
 function resize(w,h,pixelRatio){width=w;height=h;dpr=pixelRatio;canvas.width=Math.max(1,Math.round(w*dpr));canvas.height=Math.max(1,Math.round(h*dpr));if(valid&&!lost)gl.viewport(0,0,canvas.width,canvas.height);}
 function draw(view){if(!valid||lost)return false;rotation[0]=Math.cos(view.yaw);rotation[1]=Math.sin(view.yaw);rotation[2]=Math.cos(view.pitch);rotation[3]=Math.sin(view.pitch);viewport[0]=width;viewport[1]=height;viewport[2]=Math.min(width/(width<800?640:1120),height/800)*view.zoom;viewport[3]=dpr;anchor[0]=view.anchor;anchor[1]=view.anchorY??(width<800?.69:.51);camera.set([view.distance??1120,24,6000]);focus.set([view.focusX??0,view.focusY??0,view.focusZ??0]);gl.clear(gl.COLOR_BUFFER_BIT);
  bind(programs.lines,buffers.lines,[3,4]);gl.blendFuncSeparate(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA,gl.ONE,gl.ONE_MINUS_SRC_ALPHA);gl.drawArrays(gl.LINES,0,lineData.length/7);
  bind(programs.particles,buffers.particles,[4,3]);gl.uniform1f(programs.particles.uniforms.uTime,view.time);gl.uniform1f(programs.particles.uniforms.uActive,view.active);gl.uniform1f(programs.particles.uniforms.uDensity,quality===0?1:quality===1?1.12:1.24);gl.blendFuncSeparate(gl.SRC_ALPHA,gl.ONE,gl.ONE,gl.ONE_MINUS_SRC_ALPHA);gl.drawArrays(gl.POINTS,0,count);return true;
 }
 canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();lost=true;diagnostics.contextLost=true;});
 canvas.addEventListener('webglcontextrestored',()=>{initialize();document.dispatchEvent(new Event('redsails:scene-restored'));});
 if(!initialize())return {draw:()=>false,resize,setQuality,diagnostics};
 return {draw,resize,setQuality,diagnostics};
}
window.RedSailsParticleScene={create};
})();

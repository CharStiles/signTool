
let handpose;
let video;
let hands = [];
let lines = {};
let handPointInices = [0,4, 8, 12, 16, 20];
let handPointNames = ["wrist", "thumb", "index_finger_tip", "middle_finger_tip", "ring_finger_tip", "pinky_finger_tip"];
let textScreen;
let gui;
let maxTrailLength = 100;

// JS Object
let params = {
  easing: 0.3,
  lineThickness: 3,
  camOpacity: 150,
  trailSpeed: 10,
  trailLength: maxTrailLength,
  mirror: true,
  bgColor: "#000000", // dark gray
  rotateX: -0.1, 
  rotateY: 0.9,
  rotateZ: 0
};

class polylineWithVisibleData {
  constructor(){
    this.points = [];
    this.visible = [];
  }
  addPoint(x, y, visible){
    this.points.push(createVector(x, y, 0));
    this.visible.push(visible);

    // if we have more than maxTrailLength points, remove the first one
    if (this.points.length > maxTrailLength){
      this.points.shift();
      this.visible.shift();
    }
  }

  draw(){
      // draw as a series of line segments
      // only draw if both points are visible


      // copy the points array to a new array: 
      // to add smoothing
      let smoothedPoints = [];
      for (let i = 0; i < this.points.length; i++){
        smoothedPoints.push(createVector(this.points[i].x, this.points[i].y,this.points[i].z));
        this.points[i].z -= params.trailSpeed;
      }
      // smooth the points, but only smooth based on the visible points
      for (let i = 1; i < this.points.length - 1; i++){
        if (this.visible[i] && this.visible[i+1]){
          smoothedPoints[i].x = (smoothedPoints[i-1].x + smoothedPoints[i].x + smoothedPoints[i+1].x) / 3;
          smoothedPoints[i].y = (smoothedPoints[i-1].y + smoothedPoints[i].y + smoothedPoints[i+1].y) / 3;
        }
      }


      // set line width 
      strokeWeight(params.lineThickness);

      for (let i = (maxTrailLength-params.trailLength); i < this.points.length - 1; i++){
        // calculate the alpha value based on pct through the line
        let pct = i / this.points.length;
        let alpha = 255 * (1 - pct);
        stroke(255, 255,255, 255.-alpha);
        if (this.visible[i] && this.visible[i+1]){
          line(smoothedPoints[i].x, smoothedPoints[i].y,smoothedPoints[i].z, smoothedPoints[i+1].x, smoothedPoints[i+1].y,smoothedPoints[i+1].z);
        }
      }
  }
}



//--------------------------------------------------------------------------------
class fingerPoint {

  polyline = new polylineWithVisibleData();
  target = {};
  bGotTarget = false;
  
  constructor(x, y){

    
    this.x = x;
    this.y = y;
    this.nFramesSinceSeen = 0;
  }
  setup(){ 
    this.target = createVector(0,0);
  }
  increaseFramesSinceSeen(){
    this.nFramesSinceSeen++;
  }
  updateTarget(x, y){
    this.target.x = x;
    this.target.y = y;
    this.bGotTarget = true;
  }
  update(smoothing){

    if (this.bGotTarget){
      this.nFramesSinceSeen = 0;
      this.bGotTarget = false;
    }

    if (this.nFramesSinceSeen > 20){
      this.x = this.target.x;
      this.y = this.target.y;
    } else {
      this.x = smoothing * this.x + (1-smoothing) * this.target.x;
      this.y = smoothing * this.y + (1-smoothing) * this.target.y;
    }

    this.polyline.addPoint(this.x, this.y, this.nFramesSinceSeen < 10);

  }

  drawLine(){
    this.polyline.draw();
  }
}

//--------------------------------------------------------------------------------
class fingerPoints {
  constructor(){
    this.fingers = [];
    for (let i = 0; i < 6; i++){
      this.fingers.push(new fingerPoint(0,0));
    }
  }

  setup(){  
    for (let i = 0; i < 6; i++){
      this.fingers[i].setup();
    }
  }

  
  updateTarget( fingerIndex, x, y){
    this.fingers[fingerIndex].updateTarget(x, y);
  }
  
  update(smoothing){
    for (let i = 0; i < 6; i++){
      this.fingers[i].update(smoothing);
    }
  }

  increaseFramesSinceSeen(){
    for (let i = 0; i < 6; i++){
      this.fingers[i].increaseFramesSinceSeen();
    }
  }
  drawLines(){

    // 0 is the wrist, so skip it for now
    for (let i = 1; i < 6; i++){
      this.fingers[i].drawLine();
    }
  }
}

leftFingers = new fingerPoints();
rightFingers = new fingerPoints();
//--------------------------------------------------------------------------------


let fingersSmoothedLeft = [];
let fingersSmoothedRight = [];





function preload() {
  // Load the handpose model.
  handpose = ml5.handpose();
}

function setup() {
  //  easing: 0.3,
  // camOpacity: 150,
  // trailSpeed: 250,
  // trailLength: 50,
  // mirror: true,
  // bgColor: "#000000", // dark gray

  let gui = new dat.GUI();
  gui.add(params, "easing").min(0.01).max(1.0).step(0.01);
  gui.add(params, "lineThickness").min(0.1).max(4.0).step(0.01);
  gui.add(params, "camOpacity").min(0).max(255).step(1);
  gui.add(params, "trailSpeed").min(1).max(100).step(1);
  gui.add(params, "trailLength").min(1).max(maxTrailLength).step(1);
  gui.add(params, "mirror");
  gui.addColor(params, "bgColor");
  gui.add(params, "rotateX").min(0).max(PI).step(0.001);
  gui.add(params, "rotateY").min(0).max(PI).step(0.001);
  gui.add(params, "rotateZ").min(0).max(PI).step(0.001);

  frameRate(25);

  createCanvas(640*2, 480*2, WEBGL);
  // Create the webcam video and hide it
  video = createCapture(VIDEO);
  video.size(640, 480);
  video.hide();
  gl = this._renderer.GL;
  gl.disable(gl.DEPTH_TEST);
  // start detecting hands from the webcam video
  // what are options for detectStart?
  // 1. video: the webcam video
  // 2. a callback function: gotHands


  // const options = {
  //   flipHorizontal: false, // boolean value for if the video should be flipped, defaults to false
  //   maxContinuousChecks: Infinity, // How many frames to go without running the bounding box detector. Defaults to infinity, but try a lower value if the detector is consistently producing bad predictions.
  //   detectionConfidence: 0.8, // Threshold for discarding a prediction. Defaults to 0.8.
  //   scoreThreshold: 0.75, // A threshold for removing multiple (likely duplicate) detections based on a "non-maximum suppression" algorithm. Defaults to 0.75
  //   iouThreshold: 0.3, // A float representing the threshold for deciding whether boxes overlap too much in non-maximum suppression. Must be between [0, 1]. Defaults to 0.3.
  //   }

    

  handpose.detectStart(video, gotHands);
  
  console.log(handpose);

  leftFingers.setup();
  rightFingers.setup();

  // load a system font
 
  textScreen = createGraphics(400,400)
  ortho(-width/2, width/2, -height/2, height/2, 0.1, 10000);

}


function draw() {
  
  // assume we have not seen the fingers 
  leftFingers.increaseFramesSinceSeen();
  rightFingers.increaseFramesSinceSeen();

  
  for (i = 0; i < hands.length; i++){
    if (hands[i].handedness == "Left"){
      for (j = 0; j < 6; j++){
        leftFingers.updateTarget(j, hands[i].keypoints[handPointInices[j]].x-video.width/2, 
        hands[i].keypoints[handPointInices[j]].y-video.height/2); 
      }
    }
    if (hands[i].handedness == "Right"){
      for (j = 0; j < 6; j++){
        rightFingers.updateTarget(j, hands[i].keypoints[handPointInices[j]].x-video.width/2, 
        hands[i].keypoints[handPointInices[j]].y-video.height/2);
      }
    }
  }

  leftFingers.update(params.easing);
  rightFingers.update(params.easing);

  // print framerate to the canvas

  push();
  clear();
  background(params.bgColor);

  scale(1.4, 1.4, 1.4);


  rotateX(params.rotateX);
  rotateY(params.rotateY);
  rotateZ(params.rotateZ);
  //translate(200, 0, -200);
  push();
  if (params.mirror){
    scale(-1,1,1)
  }
  noStroke();

  fill(255, 0, 0, 50);
  tint(255, params.camOpacity);
  texture(video );
  plane(video.width, video.height);

  // Draw all left fingers
  // for (i = 0; i < 5; i++){
  //   fill(255, 0, 0);
  //   ellipse(leftFingers.fingers[i].x, leftFingers.fingers[i].y, 10, 10);
  // }

  stroke(255);
  leftFingers.drawLines();
  rightFingers.drawLines();


  pop(); // return to our original coordinate system

  // Draw the webcam video
  //image(video, 0, 0, width, height);
  push();
  if (params.mirror){
    scale(-1,1,1)
  }
  translate(-width / 2, -height / 2, 10);
  
  pop();
  pop();

  // clear textScreen
  textScreen.clear();

  // make a string with the frame rate that doesn't have a ton of decimal places
  let string = "" + frameRate();
  let n = string.indexOf(".");
  if (n != -1){
    string = string.substring(0, n+2);
  }

  
  // set font size for textScreen
  textScreen.textSize(32);
  textScreen.fill(255);
  textScreen.text("" + string, 30, 30);
  image(textScreen, 0 - width/2,0 - height/2) 
}

// Callback function for when handpose outputs data
function gotHands(results) {
  // save the output to the hands variable
  hands = results;

  //console.log(hands);
}


let handpose;
let video;
let hands = [];
let lines = {};
let handPointInices = [0,4, 8, 12, 16, 20];
let handPointNames = ["wrist", "thumb", "index_finger_tip", "middle_finger_tip", "ring_finger_tip", "pinky_finger_tip"];
let textScreen;
let gui;
let maxTrailLength = 100;
var easycam, gl;
var text; 
let recordButton, playButton, liveButton;
let recordState = 0;   // 0 = live, 1 = record, 2 = play

// JS Object
let params = {
  easing: 0.3,
  lineThickness: 5,
  camOpacity: 150,
  trailSpeedX: 0,
  trailSpeedY: 0,
  trailSpeedZ: -30,
  trailLength: maxTrailLength,
  drawAxis: false,
  mirror: true,
  frameRate: false,
  zoom: 1.4,
  useVel: false,
  velMin: 1,
  velMax: 10,
  backgroundColor: [0, 0, 0],
  lineColor: [255, 255, 255]

};


function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  easycam.setViewport([0,0,windowWidth, windowHeight]);
}


document.addEventListener("mousedown", onDocumentMouseDown); 

function onDocumentMouseDown(event) {
  // https://stackoverflow.com/a/11562933/1497139
  var target = event.target || event.srcElement;
  var tag = target.tagName;
  if (tag!='CANVAS')
    return;
  event.preventDefault();
}

function stringsToObject(stringList) {
  var obj = {};
  stringList.forEach(function(str) {
    obj[str] = true;
  });
  return obj;
}


class polylineWithVisibleData {


  constructor(){
    this.points = [];
    this.visible = [];
    this.velocity = [];

    this.recording = false;


    this.recordedPoints = [];
    this.recordedVisible = [];
    this.recordedVelocity = [];
    

    this.maxLength = 100;

    
  }

  clearRecordedData(){
    this.recordedPoints = [];
    this.recordedVisible = [];
    this.recordedVelocity = [];
  }


  addPoint(x, y, visible){
    this.points.push(createVector(x, y, 0));
    this.visible.push(visible);

    // calculate velocity
    if (this.points.length > 1 && this.visible[this.visible.length - 1] && this.visible[this.visible.length - 2]){
      let lastPoint = this.points[this.points.length - 2];
      let thisPoint = this.points[this.points.length - 1];
      let distance = p5.Vector.dist(thisPoint, lastPoint);

      // get previous velocity
      let lastVelocity = this.velocity[this.velocity.length - 1];
      // smooth new velocity with previous velocity
      let velocity = 0.8 * lastVelocity + 0.2 * distance;
      this.velocity.push(velocity);
    } else {
      this.velocity.push(0);
    }

    // if we have more than maxTrailLength points, remove the first one
    while (this.points.length > this.maxLength){
      this.points.shift();
      this.visible.shift();
      this.velocity.shift();
    }

    if (this.recording){
      this.recordedPoints.push(createVector(x, y, 0));
      this.recordedVisible.push(visible);
      this.recordedVelocity.push(this.velocity[this.velocity.length - 1]);
    }
  }

  drawRecordedData(){
      // do something! 

      //console.log("drawing recorded data " + this.recordedPoints.length);
      if (this.recordedPoints.length == 0) return;

      let smoothedPoints = [];
      for (let i = 0; i < this.recordedPoints.length; i++){
        smoothedPoints.push(createVector(this.recordedPoints[i].x, this.recordedPoints[i].y,this.recordedPoints[i].z));
      }
      // smooth the points, but only smooth based on the visible points
      for (let i = 1; i < this.recordedPoints.length - 1; i++){
        if (this.recordedVisible[i-1] && this.recordedVisible[i] && this.recordedVisible[i+1]){
          smoothedPoints[i].x = (smoothedPoints[i-1].x + smoothedPoints[i].x + smoothedPoints[i+1].x) / 3;
          smoothedPoints[i].y = (smoothedPoints[i-1].y + smoothedPoints[i].y + smoothedPoints[i+1].y) / 3;
        }
      }
      strokeWeight(params.lineThickness);
      beginShape();
      noFill();
      for (let i = 0; i < this.recordedPoints.length; i++){
        // calculate the alpha value based on pct through the line
        let pct = i / this.recordedPoints.length;
        let origPct = pct;
        if (params.useVel){
            pct *= map(this.recordedVelocity[i], params.velMin, params.velMax, 0.0, 1.0, true);
        }
        let alpha = 255 * (1 - pct);

        let scaleFactor = 1. / ( params.trailLength / max(this.recordedPoints.length, 1));

        let addX = (1-origPct) * params.trailSpeedX*10.*scaleFactor;
        let addY = (1-origPct) * params.trailSpeedY*10.*scaleFactor;
        let addZ = (1-origPct) * params.trailSpeedZ*10.*scaleFactor;
       
        if (this.recordedVisible[i]){
          //stroke(255, 255,255, 255.-alpha);
          stroke(params.lineColor[0], params.lineColor[1], params.lineColor[2], 255.-alpha);
          vertex(smoothedPoints[i].x + addX, smoothedPoints[i].y + addY,smoothedPoints[i].z + addZ);
        } else {
          endShape();
          beginShape();
        }
      }
      endShape();



  }

  draw(){
      // draw as a series of line segments
      // only draw if both points are visible


      // copy the points array to a new array: 
      // to add smoothing
      let smoothedPoints = [];
      for (let i = 0; i < this.points.length; i++){
        smoothedPoints.push(createVector(this.points[i].x, this.points[i].y,this.points[i].z));
        // TODO figure out more efficient way to do this
        // this.points[i].x += params.trailSpeedX/5.0;
        // this.points[i].y += params.trailSpeedY/5.0;
        // this.points[i].z += params.trailSpeedZ/5.0;
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

      // for (let i = 0; i < this.points.length - 1; i++){
      //   // calculate the alpha value based on pct through the line
      //   let pct = i / this.points.length;
      //   let alpha = 255 * (1 - pct);
      //   stroke(255, 255,255, 255.-alpha);
      //   if (this.visible[i] && this.visible[i+1]){
      //     line(smoothedPoints[i].x, smoothedPoints[i].y,smoothedPoints[i].z, smoothedPoints[i+1].x, smoothedPoints[i+1].y,smoothedPoints[i+1].z);
      //   }
      // }
      beginShape();
      noFill();
      for (let i = 0; i < this.points.length; i++){
        // calculate the alpha value based on pct through the line
        let pct = i / this.points.length;
        let origPct = pct;
        if (params.useVel){
            pct *= map(this.velocity[i], params.velMin, params.velMax, 0.0, 1.0, true);
        }
        let alpha = 255 * (1 - pct);
        let addX = (1-origPct) * params.trailSpeedX*10.;
        let addY = (1-origPct) * params.trailSpeedY*10.;
        let addZ = (1-origPct) * params.trailSpeedZ*10.;
       
        if (this.visible[i]){
          //stroke(255, 255,255, 255.-alpha);
          stroke(params.lineColor[0], params.lineColor[1], params.lineColor[2], 255.-alpha);

          vertex(smoothedPoints[i].x + addX, smoothedPoints[i].y + addY,smoothedPoints[i].z + addZ);
        } else {
          endShape();
          beginShape();
        }
      }
      endShape();
  }
}



//--------------------------------------------------------------------------------
class fingerPoint {

  polyline = new polylineWithVisibleData();
  target = {};
  bGotTarget = false;


  setRecordState(bRecording){
    this.polyline.recording = bRecording;
    if (bRecording){
      this.polyline.clearRecordedData();
    }
  }
  
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
  drawRecordedData(){
    this.polyline.drawRecordedData();
  }
}

//--------------------------------------------------------------------------------
class fingerPoints {
  constructor(){
    this.fingers = [];
    for (let i = 0; i < 6; i++){
      this.fingers.push(new fingerPoint(0,0));
    }
    this.handObj = {};
  }

  setRecordState(bRecording){
    for (let i = 0; i < 6; i++){
      this.fingers[i].setRecordState(bRecording);
    }
  }


  setup(){  
    for (let i = 0; i < 6; i++){
      this.fingers[i].setup();
    }
    this.handObj = stringsToObject(handPointNames);
  }

  setMaxTrailLength(maxLength){ 
    for (let i = 0; i < 6; i++){
      this.fingers[i].polyline.maxLength = maxLength;
    }
  } 

  
  updateTarget( fingerIndex, x, y){
    if(this.handObj[handPointNames[fingerIndex]]){
    this.fingers[fingerIndex].updateTarget(x, y);
    }
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
    for (let i = 0; i < 6; i++){
      
      this.fingers[i].drawLine();
      
    }
  }

  drawRecordedData(){
    for (let i = 0; i < 6; i++){
      this.fingers[i].drawRecordedData();
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

function record() {
  //("Recording");
  // make recording active
  recordState = 1;

  leftFingers.setRecordState(true);
  rightFingers.setRecordState(true);

  //recordButton.style('background-color', "#00FF00");
  
  // why does this not work?
  document.getElementById("recordButton").class = "recording"


  // find button with id recordButton

  console.log(document.getElementById("recordButton"));
 // recordButton.style.backgroundColor = "red";

}

function play() {

  leftFingers.setRecordState(false);
  rightFingers.setRecordState(false);
  

  // remove recording classname from record button
  document.getElementById("recordButton").class = "active"

  recordState = 2;
  console.log("Playing");
}

function live() {

  leftFingers.setRecordState(false);
  rightFingers.setRecordState(false);
  

  document.getElementById("recordButton").class = "active"

  recordState = 0;
  console.log("Live");
}

function setup() {

// add three buttons to the overall webpage, for record, play, and live

recordButton = createButton('Record');
recordButton.id("recordButton");
recordButton.position(19, 20);
recordButton.mousePressed(record);
liveButton = createButton('Live');
liveButton.id("liveButton");
liveButton.position(19, 80);
liveButton.mousePressed(live);
playButton = createButton('Play');
playButton.id("playButton");
playButton.position(19, 140);
playButton.mousePressed(play);


// set class of buttons




//console.log(document.getElementById("liveButton"));


  let gui = new dat.GUI();
  gui.add(params, "easing").min(0.01).max(1.0).step(0.01);
  gui.add(params, "lineThickness").min(0.1).max(8.0).step(0.01);
  gui.add(params, "camOpacity").min(0).max(255).step(1).name("Camera Opacity");
  gui.add(params, "trailSpeedX").min(-100).max(100).step(1);
  gui.add(params, "trailSpeedY").min(-100).max(100).step(1);
  gui.add(params, "trailSpeedZ").min(-100).max(100).step(1);
  gui.add(params, "trailLength").min(1).max(maxTrailLength).step(1);
  gui.add(params, "mirror");
  gui.add(params, "frameRate");
  gui.add(params, "drawAxis");
  

  gui.add(params, "zoom").min(0.1).max(2).step(0.001);
  gui.add(params, "useVel");
  gui.add(params, "velMin").min(0).max(30).step(0.1);
  gui.add(params, "velMax").min(0).max(30).step(0.1);

  // add color picker for background
  gui.addColor(params, "backgroundColor").name("backgroundColor");
  gui.addColor(params, "lineColor").name("lineColor");

  
  createCanvas(windowWidth, windowHeight, WEBGL);
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
  
  leftFingers.setup();
  rightFingers.setup();

  //TODO: firgure out why hands seem switched?
  var rHand = gui.addFolder('Left Hand');
  var lHand = gui.addFolder('Right Hand');
  for (n in handPointNames){
    rHand.add(rightFingers.handObj, handPointNames[n]);
    lHand.add(leftFingers.handObj, handPointNames[n] );
  }
  

  // load a system font
  textScreen = createGraphics(400,400)
  pixelDensity(1.0);
	setAttributes('antialias', true);

  easycam = createEasyCam({distance : 1400}); 
  easycam.setRotationScale(0.0003);
	console.log(easycam.INFO.toString());
  
  document.oncontextmenu = function() { return false; }
  document.onmousedown   = function() { return false; }
  //perspective(60 * PI/180, width/height, 1, 5000);
  
  ortho(-width/2, width/2, -height/2, height/2, 0.1, 100000);

  text = createDiv('Frame Rate');
  text.position(50, 50);
  text.style("font-family", "monospace");
  text.style("color", "#FFFFFF");
  text.style("font-size", "18pt");
  text.style("padding", "10px");
}


function draw() {
  


  // if we are live: 
  if (recordState == 0){ 
    document.getElementById("recordButton").className = "active";
    document.getElementById("liveButton").className = "disabled";
    document.getElementById("playButton").className = "disabled";

    document.getElementById("recordButton"). disabled = false;
    document.getElementById("liveButton"). disabled = true;
    document.getElementById("playButton"). disabled = true;

   

    }
  // if we are recording: 
  if (recordState == 1){
    document.getElementById("recordButton").className = "recording";
    document.getElementById("liveButton").className = "active";
    document.getElementById("playButton").className = "active";

    document.getElementById("recordButton"). disabled = true;
    document.getElementById("liveButton"). disabled = false;
    document.getElementById("playButton"). disabled = false;

  
  }   
  // if we are playing:
  if (recordState == 2){
    document.getElementById("recordButton").className = "disabled";
    document.getElementById("liveButton").className = "active";
    document.getElementById("playButton").className = "playing";

    document.getElementById("recordButton"). disabled = true;
    document.getElementById("liveButton"). disabled = false;
    document.getElementById("playButton"). disabled = false;

  } 

  
  // assume we have not seen the fingers 
  leftFingers.increaseFramesSinceSeen();
  rightFingers.increaseFramesSinceSeen();

  leftFingers.setMaxTrailLength(params.trailLength);
  rightFingers.setMaxTrailLength(params.trailLength);

  
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

  background(params.backgroundColor[0], params.backgroundColor[1], params.backgroundColor[2]);
  

  push();
  scale(params.zoom, params.zoom, params.zoom);


  //translate(200, 0, -200);
  push();
  if (params.mirror){
    scale(-1,1,1)
  }
  noStroke();



  noStroke();
  

  fill(255, 0, 0, 50);
  tint(255, params.camOpacity);

  if (recordState != 2){
  texture(video );
  plane(video.width, video.height);


  leftFingers.drawLines();
  rightFingers.drawLines();
} else if (recordState == 2){

  leftFingers.drawRecordedData();
  rightFingers.drawRecordedData();

}


  // blend mode additive
  //blendMode(ADD);

  // reset blend mode
  //blendMode(BLEND);

  if (params.drawAxis){
    stroke(255, 0, 0);
    line(0, 0, 0, 100, 0, 0);
    stroke(0, 255, 0);
    line(0, 0, 0, 0, 100, 0);
    stroke(0, 0, 255);
    line(0, 0, 0, 0, 0, 100);
  }
  // Draw all left fingers
  // for (i = 0; i < 5; i++){
  //   fill(255, 0, 0);
  //   ellipse(leftFingers.fingers[i].x, leftFingers.fingers[i].y, 10, 10);
  // }

  stroke(255);
 

  pop(); // return to our original coordinate system

  // Draw the webcam video
  //image(video, 0, 0, width, height);

  pop();

if(!params.frameRate){
  text.html("")
  return;
}
  push();
  scale(params.zoom, params.zoom, params.zoom);

  // clear textScreen
  textScreen.clear();

  let string = "" + frameRate();
  let n = string.indexOf(".");
  if (n != -1){
    string = string.substring(0, n+2);
  }
  //draw element over canvas
  text.html(string)
  pop();
  
}


function sleep(ms) {
  clearInterval(sleepSetTimeout_ctrl);
  return new Promise(resolve => sleepSetTimeout_ctrl = setTimeout(resolve, ms));
}
// Callback function for when handpose outputs data
function gotHands(results) {
  // save the output to the hands variable
  hands = results;

  //await new Promise(r => setTimeout(r, 200));
  //console.log(hands);
}

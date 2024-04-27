
let handpose;
let video;
let hands = [];
let lines = {};
let handPointInices = [0,4, 8, 12, 16, 20];
let handPointNames = ["wrist", "thumb", "index_finger_tip", "middle_finger_tip", "ring_finger_tip", "pinky_finger_tip"];
let textScreen;
let gui;

var easycam, gl;
var text; 
var text2; 
var recordButton;
var exportButton;
var clearButton;

var recordState = false;
var startRecordTime = 0;


let svgHeader = '<?xml version="1.0" standalone="no"?>\n' +
    '<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" ' +
    '"http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">\n' +
    '<svg width="640" height="480" version="1.1" xmlns="http://www.w3.org/2000/svg">\n';
let svgFooter = '</svg>';



// JS Object
let params = {
  countdown: 5, 
  duration: 10, 
  easing: 0.3,
  lineThickness: 5,
  camOpacity: 150,

  drawAxis: false,
  mirror: true,
  frameRate: false,
  zoom: 1.4,
};


function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
 
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

    

    this.maxLength = 100;

    
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
    // while (this.points.length > this.maxLength){
    //   this.points.shift();
    //   this.visible.shift();
    //   this.velocity.shift();
    // }

  
  }


  draw(){


    if (params.record){
      bRecording = true;
      // set the gui to not recording
      
    }

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
      
        let alpha = 255 * (1 - pct);
     
       
        if (this.visible[i]){
          //stroke(255, 255,255, 255.-alpha);
          stroke(255,255,255, 255.);

          vertex(smoothedPoints[i].x , smoothedPoints[i].y ,smoothedPoints[i].z );
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

    if (recordState == true && (millis() - startRecordTime) / 1000 > params.countdown){
        this.polyline.addPoint(this.x, this.y, this.nFramesSinceSeen < 10);
    }
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
    this.handObj = {};
  }

 
  clear(){
    for (let i = 0; i < 6; i++){
      this.fingers[i].polyline.points = [];
      this.fingers[i].polyline.visible = [];
    }
  }


  setup(){  
    for (let i = 0; i < 6; i++){
      this.fingers[i].setup();
    }
    this.handObj = stringsToObject(handPointNames);
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

// add three buttons to the overall webpage, for record, play, and live
recordButton = createButton('Record');
recordButton.position(50, 50);


exportButton = createButton('Export');
exportButton.position(50, 110);
exportButton.style('display', 'none');
// hide export button

clearButton = createButton('Clear');
clearButton.position(50, 170);
clearButton.style('display', 'none');
clearButton.mousePressed(function() {
  leftFingers.clear();
  rightFingers.clear();
  exportButton.style('display', 'none');
  clearButton.style('display', 'none');
});

exportButton.mousePressed(function() {
  // I'd like to export the finget points to SVG here: 

  
    // create SVG object
    var svg = "";
    svg += svgHeader;

    // make the background of the svg black
    svg += "<rect width='100%' height='100%' fill='black'/>\n";

   
    // for (let i = 0; i < leftFingers.fingers[0].polyline.points.length; i++){
      
    //   if (params.mirror == true){
    //     svg += video.width -leftFingers.fingers[0].polyline.points[i].x + "," + leftFingers.fingers[0].polyline.points[i].y + " ";
    //   } else {
    //      svg += leftFingers.fingers[0].polyline.points[i].x + "," + leftFingers.fingers[0].polyline.points[i].y + " ";
    //   }
    // }

    for (index in leftFingers.fingers){
   
      let smoothedPoints = [];
      let visiblePoints = [];
      for (let i = 0; i < leftFingers.fingers[index].polyline.points.length; i++){
        smoothedPoints.push(createVector(leftFingers.fingers[index].polyline.points[i].x, leftFingers.fingers[index].polyline.points[i].y, leftFingers.fingers[index].polyline.points[i].z));
        visiblePoints.push(leftFingers.fingers[index].polyline.visible[i]);
      }
      // smooth the points, but only smooth based on the visible points
      for (let i = 1; i < leftFingers.fingers[index].polyline.points.length - 1; i++){
        if (leftFingers.fingers[index].polyline.visible[i-1] && 
            leftFingers.fingers[index].polyline.visible[i] && leftFingers.fingers[index].polyline.visible[i+1]){
          smoothedPoints[i].x = (smoothedPoints[i-1].x + smoothedPoints[i].x + smoothedPoints[i+1].x) / 3;
          smoothedPoints[i].y = (smoothedPoints[i-1].y + smoothedPoints[i].y + smoothedPoints[i+1].y) / 3;
        }
      }
      // save to SVG
      svg += "<g stroke='white' stroke-width='1' fill='none'>\n";
      svg += "<polyline points='";
      let visibleCount = 0;
      for (let i = 0; i < smoothedPoints.length; i++){
        if (visiblePoints[i]){
          visibleCount++;
          if (params.mirror == true){
            svg += (video.width - smoothedPoints[i].x -320.) + "," + (smoothedPoints[i].y +240.) + " ";
          } else {
            svg += (smoothedPoints[i].x+320.) + "," + (smoothedPoints[i].y+240.) + " ";
          }
        } else {
          if (visibleCount > 0){
            svg += "'/>\n";
            svg += "</g>\n";
            svg += "<g stroke='white' stroke-width='1' fill='none'>\n";
            svg += "<polyline points='";
            visibleCount = 0;
          }
        }
      } 
      svg += "'/>\n";
      svg += "</g>\n";


      // beginShape();
      // noFill();
      // for (let i = 0; i < this.points.length; i++){
      //   // calculate the alpha value based on pct through the line
      //   let pct = i / this.points.length;
      //   let origPct = pct;
      
      //   let alpha = 255 * (1 - pct);
     
       
      //   if (this.visible[i]){
      //     //stroke(255, 255,255, 255.-alpha);
      //     stroke(255,255,255, 255.);

      //     vertex(smoothedPoints[i].x , smoothedPoints[i].y ,smoothedPoints[i].z );
      //   } else {
      //     endShape();
      //     beginShape();
      //   }
      // }
      // endShape();

    
    }

    smoothedPoints = [];
    for (index in rightFingers.fingers){
     
       visiblePoints = [];
       smoothedPoints = [];
      for (let i = 0; i < rightFingers.fingers[index].polyline.points.length; i++){
        smoothedPoints.push(createVector(rightFingers.fingers[index].polyline.points[i].x, rightFingers.fingers[index].polyline.points[i].y, rightFingers.fingers[index].polyline.points[i].z));
      
        visiblePoints.push(rightFingers.fingers[index].polyline.visible[i]);
      }
      // smooth the points, but only smooth based on the visible points
      for (let i = 1; i < rightFingers.fingers[index].polyline.points.length - 1; i++){
        if (rightFingers.fingers[index].polyline.visible[i] && rightFingers.fingers[index].polyline.visible[i] && rightFingers.fingers[index].polyline.visible[i+1]){
          smoothedPoints[i].x = (smoothedPoints[i-1].x + smoothedPoints[i].x + smoothedPoints[i+1].x) / 3;
          smoothedPoints[i].y = (smoothedPoints[i-1].y + smoothedPoints[i].y + smoothedPoints[i+1].y) / 3;
        }
      }
      // save to SVG
      svg += "<g stroke='white' stroke-width='1' fill='none'>\n";
      svg += "<polyline points='";
      let visibleCount = 0;
      for (let i = 0; i < smoothedPoints.length; i++){
        if (visiblePoints[i]){
          visibleCount++;
          if (params.mirror == true){
            svg += (video.width - smoothedPoints[i].x -320.) + "," + (smoothedPoints[i].y +240.) + " ";
          } else {
            svg += (smoothedPoints[i].x+320.) + "," + (smoothedPoints[i].y+240.) + " ";
          }
        } else {
          if (visibleCount > 0){
            svg += "'/>\n";
            svg += "</g>\n";
            svg += "<g stroke='white' stroke-width='1' fill='none'>\n";
            svg += "<polyline points='";
            visibleCount = 0;
          }
        }
      } 
      svg += "'/>\n";
      svg += "</g>\n";


    }

    
    svg += svgFooter;
    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(svg));
    let timestampstring = new Date().toISOString().replace(/:/g, "-");
    element.setAttribute('download', timestampstring + '.svg');
    //element.setAttribute('download', 'fingers.svg');
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  
});


recordButton.mousePressed(function() {
  recordState = true;
  startRecordTime = millis();

  // clear the finger points

  leftFingers.clear();
  rightFingers.clear();

  clearButton.style('display', 'none');
  exportButton.style('display', 'none');


  //alert("Recording...");

  // params.record = !params.record;
  // if (params.record){
  //   recordButton.html('Stop Recording');
  // } else {
  //   recordButton.html('Record');
  // }
});


// set class of buttons




//console.log(document.getElementById("liveButton"));


  let gui = new dat.GUI();
  gui.add(params, "countdown").min(0.01).max(20.0).step(0.1);
  gui.add(params, "duration").min(0.01).max(30.0).step(0.1);

  gui.add(params, "easing").min(0.01).max(1.0).step(0.01);
  gui.add(params, "lineThickness").min(0.1).max(8.0).step(0.01);
  gui.add(params, "camOpacity").min(0).max(255).step(1).name("Camera Opacity");

  gui.add(params, "mirror");
  gui.add(params, "frameRate");


  gui.add(params, "zoom").min(0.1).max(2).step(0.001);

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

  
  document.oncontextmenu = function() { return false; }
  document.onmousedown   = function() { return false; }
  //perspective(60 * PI/180, width/height, 1, 5000);
  
  ortho(-width/2, width/2, -height/2, height/2, 0.1, 100000);

  text = createDiv('Frame Rate');
  text.position(200, 80);
  text.style("font-family", "monospace");
  text.style("color", "#FFFFFF");
  text.style("font-size", "18pt");
  text.style("padding", "10px");

  text2 = createDiv('');
  text2.position(200, 50);
  text2.style("font-family", "monospace");
  text2.style("color", "#FFFFFF");
  text2.style("font-size", "18pt");
  text2.style("padding", "10px");
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

  background(0,0,0);
  

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


  texture(video );
  plane(video.width, video.height);


  leftFingers.drawLines();
  rightFingers.drawLines();



  // blend mode additive
  //blendMode(ADD);

  // reset blend mode
  //blendMode(BLEND);


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
  //return;
  
}

if (recordState == true){
  text2.html("Recording...")


  // check the time 
  let currentTime = millis();
  let elapsedTime = (currentTime - startRecordTime) / 1000;
  if (elapsedTime > params.duration + params.countdown && recordState == true){
     recordState = false;
    
     // make export visible 
    exportButton.style('display', 'block');

     clearButton.style('display', 'block');
    //text2.html("Recording Complete")
  }

  if (elapsedTime < params.countdown){
    text2.html("Recording in " + (params.countdown - elapsedTime).toFixed(2) + " seconds")
  }

  if (elapsedTime > params.countdown && elapsedTime < params.duration + params.countdown){
   var pctRecorded = (elapsedTime - params.countdown) / params.duration;
   text2.html("Recording... " + (pctRecorded*100.).toFixed(1) + "%");
   // text2.html("Recording... " + (elapsedTime - params.countdown).toFixed(2) + " of " + params.duration.toFixed(2) + "seconds")
  }


} else {
  text2.html("");
}
  push();
  scale(params.zoom, params.zoom, params.zoom);

  

  let string = "" + frameRate();
  let n = string.indexOf(".");
  if (n != -1){
    string = string.substring(0, n+2);
  }
  //draw element over canvas

  if(params.frameRate){
    text.html(string)
  }
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

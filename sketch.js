// Copyright (c) 2023 ml5
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

let handpose;
let video;
let hands = [];
let maxLineLen = 200;
let lineLen = 150;
let lines = {};
let easing = 0.945;
let d = 200;
let indx = 0;
let startIdx = 0;
let gui;
var defaulType = [47, 100, 49, 43];
var features = ["Easing","Cam Opacity", "Trail Speed", "Trail Length", "Mirror"
];

let fingersSmoothedLeft = [];
let fingersSmoothedRight = [];
let sliders = [];
let checkboxes =[];
var f;

function preload() {
  // Load the handpose model.
  handpose = ml5.handpose();
  f = loadFont(
    "https://cdnjs.cloudflare.com/ajax/libs/topcoat/0.8.0/font/SourceCodePro-Bold.otf"
  );
}

function pushEmptyPt(arry, idx) {
  arry[idx] = [];
  for (i = 0; i < 5; i++) {
    let pt = {};
    pt.x = 0;
    pt.y = 0;
    pt.z = -9999; // css gives me bad habits
    pt.nFramesSinceSeen = 100;
    arry[idx].push(pt);
  }
}

function setup() {
  createCanvas(640, 480, WEBGL);
  textFont(f);
  // Create the webcam video and hide it
  video = createCapture(VIDEO);
  video.size(width, height);
  video.hide();
  gl = this._renderer.GL;
  gl.disable(gl.DEPTH_TEST);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  // start detecting hands from the webcam video
  handpose.detectStart(video, gotHands);

  for (var j = 0; j < lineLen; j++) {
    pushEmptyPt(fingersSmoothedLeft, j);
    pushEmptyPt(fingersSmoothedRight, j);
  }

  // slider setup
  let xs = 410;
  oneSlider = createSlider(0, 100, defaulType[0]);
  oneSlider.position(120 + xs, 20);
  oneSlider.style("width", "100px");
  twoSlider = createSlider(0, 100, defaulType[1]);
  twoSlider.position(120 + xs, 50);
  twoSlider.style("width", "100px");
  threeSlider = createSlider(0, 100, defaulType[2]);
  threeSlider.position(120 + xs, 80);
  threeSlider.style("width", "100px");
  fourSlider = createSlider(0, 100, defaulType[3]);
  fourSlider.position(120 + xs, 110);
  fourSlider.style("width", "100px");

  checkbox = createCheckbox('', true);

  checkbox.position(120 + xs, 140);
  checkbox.style("width", "100px");
  sliders = [oneSlider, twoSlider, threeSlider, fourSlider,checkbox];
  checkboxes= [checkbox]
}

function updateData(handedness, arry) {
  if (hands.length == 0) {
    pushEmptyPt(arry, startIdx);
  }

  for (let i = 0; i < hands.length; i++) {
    if (hands[i].handedness == handedness) {
      let hand = hands[i];
      let fingerIdx = 0;
      for (let h = 0; h < hand.keypoints.length; h++) {
        if (h == 8 || h == 4 || h == 12 || h == 16 || h == 20) {
          let keypoint = hand.keypoints[h];
          if (arry[0][fingerIdx].nFramesSinceSeen > 10) {
            arry[startIdx][fingerIdx].x = keypoint.x;
            arry[startIdx][fingerIdx].y = keypoint.y;
            // onsole.log(arry[startIdx][fingerIdx].x);
          } else {
            if (arry[startIdx - 1]) {
              arry[startIdx][fingerIdx].x =
                easing * arry[startIdx - 1][fingerIdx].x +
                (1 - easing) * keypoint.x;
              arry[startIdx][fingerIdx].y =
                easing * arry[startIdx - 1][fingerIdx].y +
                (1 - easing) * keypoint.y;
            } else {
              arry[startIdx][fingerIdx].x =
                easing * arry[arry.length - 1][fingerIdx].x +
                (1 - easing) * keypoint.x;
              arry[startIdx][fingerIdx].y =
                easing * arry[arry.length - 1][fingerIdx].y +
                (1 - easing) * keypoint.y;
            }
          }
          arry[startIdx][fingerIdx].z = 10;
          fingerIdx++;
        }
      }
    for (j = 0; j < 5; j++) {
      arry[0][j].nFramesSinceSeen = 0;
    }
    } else if (hands.length == 1) {
      pushEmptyPt(arry, startIdx);
    }
  }
}


function updategui() {
  push();
  translate(50, -height / 2 - 10);
  //textFont('Verdana');
  for (var i = 0; i < sliders.length; i++) {
    // fill(255,150);
    fill("white");
  
    text(features[i], 55, 35 + i*30);
    // text(sliders[i].value() + '%', sliders[i].x + 20 + sliders[i].width, 35 + i*30);
    // text(features[i][0], sliders[i].x + 55 + sliders[i].width, 35 + i*30);
    // // highlight in black
    // fill(255);
    // if ( sliders[i].value() < 50) {
    //   text((100-sliders[i].value()) + '%', 20, 35 + i*30);
    //   //text(features[i][1], 55, 35 + i*30);
    // } else {
    //   text(sliders[i].value() + '%', sliders[i].x + 20 + sliders[i].width, 35 + i*30);
    //   text(features[i][0], sliders[i].x + 55 + sliders[i].width, 35 + i*30);
    // }
  }
  pop();
}

function drawLines(arry) {
  for (var l = 0; l < lineLen; l++) {
    let normIndex = (l + startIdx) % lineLen;
    for (let tips = 0; tips < arry[startIdx].length; tips++) {
      var lx = arry[normIndex][tips].x;
      var ly = arry[normIndex][tips].y;
      var lz = arry[normIndex][tips].z;
      var _lx = lx;
      var _ly = ly;
      var _lz = lz;

      if (arry[normIndex + 1]) {
        _lx = arry[normIndex + 1][tips].x;
        _ly = arry[normIndex + 1][tips].y;
        _lz = arry[normIndex + 1][tips].z;
      } else {
        end = 0;
        _lx = arry[end][tips].x;
        _ly = arry[end][tips].y;
        _lz = arry[end][tips].z;
      }

      if (_lx !== undefined && _ly !== undefined && _lz !== undefined) {
        let di = dist(lx, ly, lz, _lx, _ly, _lz);

        if (di < d) {
          let zfade = constrain(1 - lz / 50, 0, 1);
          stroke(255 * zfade, 255 * zfade, 255 * zfade);
          line(lx, ly, lz, _lx, _ly, _lz);
        }
      }
      // move z index back
      arry[normIndex][tips].z -= ((sliders[2].value())/100.) * 30.;
    }
  }
}


function draw() {
//  clear();
  startIdx = startIdx + 1;
  startIdx = startIdx % lineLen;

  //update slider values
  easing = 0.9*(sliders[0].value()/100.0)
   //lineLen = (sliders[0].value()/100.0)* maxLineLen
  background(0)
  
  for (let i = 0; i < 5; i++) {
    fingersSmoothedLeft[0][i].nFramesSinceSeen++;
    fingersSmoothedRight[0][i].nFramesSinceSeen++;
  }

  //orbitControl();
  push();
 
  rotateY(70);
  translate(200, 0, -200);
  push();
     if (checkboxes[0].checked()){
    scale(-1,1,1)
  }

  noStroke();

  fill(255, 0, 0, 50);
   tint(255, ((sliders[1].value())/100.0) * 255.0)
  texture(video);
  plane(width, height);
  pop(); // return to our original coordinate system

  // Draw the webcam video
  push();
     if (checkboxes[0].checked()){
    scale(-1,1,1)
    console.log("FLIPS!")
  }
  translate(-width / 2, -height / 2, 10);

  updateData("Left", fingersSmoothedLeft);
  updateData("Right", fingersSmoothedRight);

  // // Draw all the tracked hand points'
  // for (j = 0; j < 5; j++) {
  //   circle(
  //     fingersSmoothedLeft[startIdx][j].x,
  //     fingersSmoothedLeft[startIdx][j].y,
  //     20
  //   );
  //   circle(
  //     fingersSmoothedRight[startIdx][j].x,
  //     fingersSmoothedRight[startIdx][j].y,
  //     20
  //   );
  // }
  drawLines(fingersSmoothedRight);
  drawLines(fingersSmoothedLeft);
  pop();
  pop();
  updategui();
}

// Callback function for when handpose outputs data
function gotHands(results) {
  // save the output to the hands variable
  hands = results;
}

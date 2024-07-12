// Author: Hiro Lilley
// Date: May 12, 2024 

let lastTick;
let lastTickLineErase;
let tickSpeedMs;
let tickSpeedLineEraseMs;
let now;
const BLOCK_W = 32;
const BLOCK_H = 32;
const GRID_W = 10;
const GRID_H = 20;

const BOARD_X = 32;
const BOARD_Y = 0;

let board;
let blocks;

let currentBlock; // number of the current block
let currentBlockState; // number of the current block's state
let currentX;
let currentY;
let nextBlock;

let currentCompletedLines;
let eraseStartMs;
let eraseLenMs;
let eraseStepLenMs;
let eraseCurStepStartMs;
let eraseCurStep;

let gameMode;
const GAME_MODE_NEW_GAME = 1;
const GAME_MODE_PLAYING = 2;
const GAME_MODE_GAME_OVER = 4;

let erasingLines;

let imgScreenPlay;
let sndMusic;
let sndLose;
let sndStart;
let gameFont;

function preload() {
  soundFormats("mp3");
  imgScreenPlay = loadImage('screen.png');
  gameFont = loadFont('game.ttf');
  sndMusic = createAudio('gamemusic.mp3');
  sndLose = loadSound('gameover.mp3');
  sndStart = loadSound('neogeo.mp3');
}

function setup() {
  createCanvas(640, 640);
  lastTick = millis();
  tickSpeedMs = 300;
  tickSpeedLineEraseMs = 100;
  
  initBlocks();
  setGameMode(GAME_MODE_NEW_GAME);
  //setGameMode(GAME_MODE_PLAYING);
}

function draw() {
  if (gameMode == GAME_MODE_PLAYING) {
    background(0);
    image(imgScreenPlay, 0, 0);   
    drawBoard();
    drawNextBlock();
    let now = millis();
    if (erasingLines == false) {
      if (now - lastTick >= tickSpeedMs) {
        tickPlaying();
        lastTick = now;
      }
    } else {
      updateEraseLines();
    }
    drawBlock(currentBlock, currentBlockState, currentX, currentY);
    
  } else if (gameMode == GAME_MODE_GAME_OVER) {
    background(0);
    image(imgScreenPlay, 0, 0);
    
  } else if (gameMode == GAME_MODE_NEW_GAME) {
    background(0);
    image(imgScreenPlay, 0, 0);
    
    fill('white');
    textFont(gameFont);
    textSize(35);
    text('START?', 100, 310);
  }
}

function setGameMode(mode) {
  if (mode == GAME_MODE_NEW_GAME) {
    sndMusic.stop();
    sndStart.play();
    gameMode = GAME_MODE_NEW_GAME;
  } else if (mode == GAME_MODE_PLAYING) {
    erasingLines = false;
    sndMusic.loop();
    newGame();
    chooseNextBlock();
    newBlock();
    gameMode = GAME_MODE_PLAYING;
  } else if (mode == GAME_MODE_GAME_OVER) {
    sndMusic.stop();
    sndLose.play();
    gameMode = GAME_MODE_GAME_OVER;
  }
}

function drawNextBlock() {
  drawBlockPixels(nextBlock, 0, 462, 347);
}
    
function drawBlock(block, state, x, y) {
  drawBlockPixels(block, state, x * BLOCK_W + BOARD_X, y * BLOCK_H + BOARD_Y);
}

function drawBlockPixels(block, state, xPixel, yPixel) {
  noStroke();
  blockState = blocks[block].states[state]; 
  for (let i = 0; i < blockState.length; i++) {
    drawBlockSquarePixels(block, xPixel + blockState[i].x * BLOCK_W, yPixel + blockState[i].y * BLOCK_H);
  }
}

function drawBlockSquare(block, x, y) {
  drawBlockSquarePixels(block, x * BLOCK_W + BOARD_X, y * BLOCK_H + BOARD_Y);
}

function drawBlockSquarePixels(block, xPixel, yPixel) {
  fill(blocks[block].color1);
  rect(xPixel + 1, yPixel + 1, BLOCK_W - 2, BLOCK_H - 2);

  fill(blocks[block].color2);
  rect(xPixel + 5, yPixel + 5, BLOCK_W - 10, BLOCK_H - 10);
}

function drawBoard() {
  for(let y = 0; y < GRID_H; y++) {
    for(let x = 0; x < GRID_W; x++) {
      let block = board[boardIndex(x, y)]
      if (block != -1) {
        drawBlockSquare(block, x, y);
      }
    }
  }
}

function newBlock() {
  currentBlock = nextBlock;
  currentBlockState = 0;
  currentX = 5;
  currentY = 0;
  chooseNextBlock();
}

function chooseNextBlock() {
  let tmp = getRandomInt(0, blocks.length);
  if (tmp == nextBlock) {
    nextBlock = getRandomInt(0, blocks.length);
  } else {
    nextBlock = tmp;
  }
}

function newGame() {
  board = Array(GRID_W * GRID_H).fill(-1);
}
   
function tickPlaying() {
  if (canMoveTo(currentX, currentY + 1, currentBlockState)) {
    currentY = currentY + 1;
  } else {
    fixShape(currentBlock, currentBlockState, currentX, currentY);
    lineCheck();
    newBlock();
  }
}

function startEraseLines() {
  eraseStartMs = millis();
  eraseLenMs = tickSpeedMs*2;
  eraseStepLenMs = eraseLenMs / 5;
  eraseCurStepStartMs = eraseStartMs;
  eraseCurStep = 0;
  erasingLines = true;
}

function updateEraseLines() {
  let now = millis();
  if (eraseCurStep == 0) {
    for (let i = 0; i < currentCompletedLines.length; i++) {
      board[boardIndex(4, currentCompletedLines[i])] = -1;
      board[boardIndex(5, currentCompletedLines[i])] = -1;    
    }
    eraseCurStep++;
  } else if (now - eraseCurStepStartMs > eraseStepLenMs) {
    eraseCurStepStartMs = now;
    for (let i = 0; i < currentCompletedLines.length; i++) {
      board[boardIndex(4 - eraseCurStep, currentCompletedLines[i])] = -1;
      board[boardIndex(5 + eraseCurStep, currentCompletedLines[i])] = -1;        
    }
    eraseCurStep++;
  }
  if (eraseCurStep == 5) {
    erasingLines = false;
    collapseLines(currentCompletedLines);
    lastTick = millis();
  }
}

// if fromLine is 14 then topLine could be 13..-1
function getTopLine(fromLine) {
  for (let y = fromLine - 1; y >= 0; y--) {
    if (isLineBlank(y)) {
      return y;
    }
  }
  return -1;
}

function isLineBlank(y) {
  for (let x = 0; x < GRID_W; x++) {
    if (board[boardIndex(x, y)] != -1) {
      return false;
    }
  }
  return true;
}

// if y == 14 the line 14 will be copied into 15
// if y == 0 then line 0 will be copied into 1
// if y == 19 then line 19 will be copied into 20 (bang! there is no line 20)
function copyLineDown(y) {
  if (y < 0 || y > 18) {
    console.log ("ERROR: can't copyDown line " + y);
  }
  for (let x = 0; x < GRID_W; x++) {
    board[boardIndex(x, y + 1)] = board[boardIndex(x, y)];
  }
}

function collapseLines(completedLines) {
  console.log(completedLines);
  for (let i = 0; i < completedLines.length; i++) {
    for (let y = completedLines[i] - 1; y > -1; y--) {
      copyLineDown(y);
    }
    for (let x = 0; x < GRID_W; x++) {
      board[boardIndex(x, 0)] = -1;
    }
  }
}

function lineCheck() {
  let completedRows = [];
  for (let y = 0; y < GRID_H; y++) {
    let completed = true;
    for (let x = 0; x < GRID_W; x++) {
      if (board[boardIndex(x,y)] == -1) {
        completed = false;
        break;
      }
    }
    if (completed == true) {
      completedRows.push(y);
    }
  }
  if (completedRows.length > 0) {
    currentCompletedLines = completedRows;
    startEraseLines();    
  }
}


function fixShape(block, state, x, y) {
  for(let i = 0; i < blocks[block].states[state].length; i++) {
    let shape = blocks[block].states[state];
    board[boardIndex(x + shape[i].x, y + shape[i].y)] = block;
  }
}

function boardIndex(x, y) {
  return y * GRID_W + x;
}

function keyPressed() {
  if (gameMode == GAME_MODE_PLAYING) {
    if (keyCode == DOWN_ARROW) {
      if (canMoveTo(currentX, currentY + 1, currentBlockState)) {
        currentY = currentY + 1;
      }
    } else if (keyCode == LEFT_ARROW) {
      if (canMoveTo(currentX - 1, currentY, currentBlockState)) {
        currentX = currentX - 1;
      }

    } else if (keyCode == RIGHT_ARROW) {
      if (canMoveTo(currentX + 1, currentY, currentBlockState)) {
        currentX = currentX + 1;
      }
    } else if (key === 'a') {
      let newState = currentBlockState + 1;
        if (newState == blocks[currentBlock].states.length) {
          newState = 0;
        }
      if (canMoveTo(currentX, currentY, newState)) {
        currentBlockState = newState;
      }
    } else if (key === 'd') {
      let newState = currentBlockState - 1;
      if (newState == -1) {
        newState = blocks[currentBlock].states.length - 1;
      }
      if (canMoveTo(currentX, currentY, newState)) {
        currentBlockState = newState;
      }
    }
  } else if (gameMode == GAME_MODE_NEW_GAME) {
    if (key === ' ') {
      setGameMode(GAME_MODE_PLAYING);
    }
  }
}

function canMoveTo(x, y, state) {
  let shapeState = blocks[currentBlock].states[state];
  let shapeStateLength = shapeState.length;
  
  for (let i = 0; i < shapeStateLength; i++) {
    let squareX = x + shapeState[i].x;
    let squareY = y + shapeState[i].y;
    
    // are any sqaures out of bounds?
    if (squareX < 0 || squareX > GRID_W - 1 || squareY > GRID_H - 1) {
      return false;
    }
    
    // are any squares over occupied grid cells?
    if (board[boardIndex(squareX, squareY)] != -1) {
      return false;
    }
  }
  
  return true;
}

function initBlocks() {
  blocks = [
    { // T (0)
      color1: color(0, 0, 255), 
      color2: color(128, 128, 255), 
      states: [ 
        [ // _|_
          {x: -1, y: 0},
          {x:  0, y: 0},
          {x:  1, y: 0},
          {x:  0, y:-1},
        ],
        [ // |-
          {x:  0, y: 1},
          {x:  0, y: 0},
          {x:  0, y:-1},
          {x:  1, y: 0},
        ],
        [ // -,-
          {x: -1, y: 0},
          {x:  0, y: 0},
          {x:  1, y: 0},
          {x:  0, y: 1},
        ],
        [ // -|
          {x:  0, y: 1},
          {x:  0, y: 0},
          {x:  0, y:-1},
          {x: -1, y: 0},
        ]
      ],
    },
    { // BL (1)
      color1: color(0, 255, 0), 
      color2: color(128, 255, 128), 
      states: [ 
        [ // --,
          {x:-1, y: 0}, 
          {x: 0, y: 0},
          {x: 1, y: 0},
          {x: 1, y: 1},
        ],
        [ // _|
          {x:-1, y: 1},
          {x: 0, y: 1},
          {x: 0, y: 0},
          {x: 0, y:-1},
        ],
        [ // |__
          {x:-1, y:-1},
          {x:-1, y: 0},
          {x: 0, y: 0},
          {x: 1, y: 0},
        ],
        [ // |'
          {x: 0, y:-1},
          {x: 1, y:-1},
          {x: 0, y: 0},
          {x: 0, y: 1},
        ]
      ],
    },
    { // Z (2)
      color1: color(255, 0, 0), 
      color2: color(255, 128, 128), 
      states: [ 
        [ // Z,
          {x:-1, y:-1}, 
          {x: 0, y:-1},
          {x: 0, y: 0},
          {x: 1, y: 0},
        ],
        [ // ,-'
          {x: 0, y: 0},
          {x: 0, y:-1},
          {x: 1, y:-1},
          {x: 1, y:-2},
        ],
      ],
    },
    { // [] (3)
      color1: color(255, 255, 0), 
      color2: color(255, 255, 255), 
      states: [ 
        [ // []
          {x: 0, y: 0}, 
          {x: 1, y: 0},
          {x: 0, y:-1},
          {x: 1, y:-1},
        ],
      ],
    },
    { // S (4)
      color1: color(0, 255, 255), 
      color2: color(255, 255, 255), 
      states: [ 
        [ // S,
          {x: 0, y: 0}, 
          {x: 1, y: 0},
          {x: 0, y: 1},
          {x:-1, y: 1},
        ],
        [ // '-,
          {x: 0, y: 0},
          {x: 0, y:-1},
          {x: 1, y: 0},
          {x: 1, y: 1},
        ],
      ],
    },
    { // L (5)
      color1: color(255, 0, 255), 
      color2: color(255, 128, 128), 
      states: [ 
        [ // ,--
          {x: 0, y: 0}, 
          {x: 1, y: 0},
          {x:-1, y: 0},
          {x:-1, y: 1},
        ],
        [ // '|
          {x: 0, y: 0},
          {x: 0, y: 1},
          {x: 0, y:-1},
          {x:-1, y:-1},
        ],
        [ // __|
          {x: 0, y: 0},
          {x:-1, y: 0},
          {x: 1, y: 0},
          {x: 1, y:-1},
        ],
        [ // L
          {x: 0, y: 0},
          {x: 0, y:-1},
          {x: 0, y: 1},
          {x: 1, y: 1},
        ]
      ],
    },
    { // --- (6)
      color1: color(255, 128, 0), 
      color2: color(255, 200, 0), 
      states: [ 
        [ // ---,
          {x: 0, y: 0}, 
          {x: 1, y: 0},
          {x:-1, y: 0},
          {x:-2, y: 0},
        ],
        [ // |
          {x: 0, y: 0},
          {x: 0, y: 1},
          {x: 0, y:-1},
          {x: 0, y:-2},
        ],
      ],
    },
  ];
}

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min) + min);
  // The maximum is exclusive and the minimum is inclusive
}
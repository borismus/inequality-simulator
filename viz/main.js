window.addEventListener('load', init);
window.addEventListener('keydown', onKey);
window.addEventListener('resize', onResize);
window.addEventListener('WebComponentsReady', onResize);

// Hook up buttons
document.querySelector('paper-button#five').addEventListener('click', doFiveSteps);
document.querySelector('paper-button#one').addEventListener('click', doOneStep);
document.querySelector('paper-button#reset').addEventListener('click', doReset);

var stats = new Stats();
stats.setMode(0); // 0: fps, 1: ms

// align bottom-left
stats.domElement.style.position = 'absolute';
stats.domElement.style.left = '0px';
stats.domElement.style.bottom = '0px';

if (Util.getQueryParameter('debug')) {
  document.body.appendChild(stats.domElement);
}

var renderer = new Renderer({stackCount: 10});

function init() {
  Util.loadScript(Util.getQueryParameter('model'), function() {
    createGui();
    updateGuiStep();
    document.querySelector('#title').innerHTML = window.title;
  });
}


function loop(timestamp) {
  stats.begin();
  renderer.render(timestamp);
  stats.end();
  requestAnimationFrame(loop);
}


loop();


  
function onKey(e) {
  if (e.keyCode == 65) { // a
    renderer.add(0);
  } else if (e.keyCode == 90) { // z
    renderer.remove(0);
  } else if (e.keyCode == 83) { // s
    renderer.add(1);
  } else if (e.keyCode == 88) { // x
    renderer.remove(1);
  } else if (e.keyCode == 32) { // Space
    simulation.step();
    updateVisualization();
    updateGuiStep();
  }
};

function onResize() {
  renderer.resize();
}

var lastTotals = [];
var remainders = [];
function updateVisualization() {
  for (var i = 0; i < simulation.actors.length; i++) {
    // Make sure last total is initialized.
    if (!lastTotals[i]) {
      lastTotals[i] = 0;
    }
    if (!remainders[i]) {
      remainders[i] = 0;
    }

    // How much has this actor's total value changed?
    var total = simulation.actors[i].total;
    var lastTotal = lastTotals[i];
    var delta = total - lastTotal + remainders[i];

    var sign = delta >= 0 ? 1 : -1;
    var absDelta = Math.abs(delta);
    // How many total blocks to add or remove.
    var blockCount = Math.floor(absDelta);
    // What is the remainder.
    var remainder = absDelta - blockCount;
    console.log('sign: %d, blockCount: %d, remainder: %f', sign, blockCount, remainder);

    // If at least one block was added, show the animation.
    if (blockCount >= 1 && sign == 1) {
      //repeatFunction(function() { renderer.add(i); }, blockCount)
      renderer.add(i, blockCount);
    }

    // If at least one block was removed, show the animation.
    if (blockCount >= 1 && sign == -1) {
      //repeatFunction(function() { renderer.remove(i); }, blockCount);
      renderer.remove(i, blockCount);
    }

    // If no blocks were added, but there was a remainder.
    if (blockCount == 0 && remainder != 0) {
      if (sign > 0) {
        renderer.addShadow(i);
      } else if (sign < 0) {
        renderer.removeShadow(i);
      }
    }

    lastTotals[i] = total;
    remainders[i] = remainder * sign;
  }

  renderer.updateCamera();
}

function repeatFunction(func, count) {
  for (var i = 0; i < count; i++) {
    func();
  }
}

SPECIAL_PROPERTIES = 'total';

function createGui() {
  var allRulesEl = document.querySelector('#rule-list');
  var allPropsEl = document.querySelector('#prop-list');

  // A place for all unique properties.
  var properties = [];

  // First, rules.
  simulation.rules.forEach(function(rule) {
    var ruleEl = document.createElement('ineq-item');
    // TODO: Extract whether or not this is a positive or a negative rule.
    ruleEl.setAttribute('color', 'green');
    ruleEl.setAttribute('title', rule.label);
    ruleEl.setAttribute('subtitle', rule.action.value);
    allRulesEl.appendChild(ruleEl);
  });

  // Next, properties.
  simulation.properties.forEach(function(prop) {
    var propEl = document.createElement('ineq-item');
    propEl.setAttribute('color', 'orange');
    propEl.setAttribute('title', prop);
    propEl.setAttribute('no-subtitle', true);
    allPropsEl.appendChild(propEl);
  });
}

function updateGuiStep() {
  var ruleList = document.querySelector('#rule-list');
  var rules = ruleList.querySelectorAll('ineq-item');

  // Select the right item in the GUI.
  for (var i = 0; i < rules.length; i++) {
    var rule = rules[i];
    if (i == simulation.currentRule) {
      rule.setAttribute('selected', true);
    } else {
      rule.removeAttribute('selected');
    }

    if (simulation.previousRule == 0) {
      rule.removeAttribute('executed');
    }
  }

  if (simulation.previousRule !== undefined && simulation.didPreviousRuleExecute) {
    // Indicate that the previous rule just ran.
    rules[simulation.previousRule].setAttribute('executed', true);
  }

  // Update the UI.
  var gini = Util.calculateGini(simulation);
  document.querySelector('#gini').innerHTML = gini ? gini.toFixed(2) : 'unknown';
  document.querySelector('#iteration').innerHTML = simulation.currentStep;
}

function doFiveSteps() {
  for (var i = 0; i < 50; i++) {
    doOneStepHelper();
  }
  updateVisualization();
  updateGuiStep();
}

function doOneStep() {
  doOneStepHelper();
  updateVisualization();
  updateGuiStep();
}

function doReset() {
  window.location.reload();
}

function doOneStepHelper() {
  // Keep stepping until we get to the next one.
  var startStep = simulation.currentStep;
  while (startStep == simulation.currentStep) {
    simulation.step();
  }
}

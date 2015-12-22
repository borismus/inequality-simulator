window.addEventListener('load', init);
window.addEventListener('keydown', onKey);
window.addEventListener('resize', onResize);
window.addEventListener('WebComponentsReady', onResize);

var stats = new Stats();
stats.setMode(0); // 0: fps, 1: ms

// align bottom-left
stats.domElement.style.position = 'absolute';
stats.domElement.style.left = '0px';
stats.domElement.style.bottom = '0px';

document.body.appendChild(stats.domElement);

var renderer = new Renderer({stackCount: 10});

function init() {
  createGui();
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
  } else if (e.keyCode == 88) { // w
    renderer.remove(1);
  } else if (e.keyCode == 32) { // Space
    simulation.step();
    updateVisualization();
    updateGuiStep();

    var gini = Util.calculateGini(simulation);
    console.log('Gini coefficient: %f', gini);
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
      repeatFunction(function() { renderer.add(i); }, blockCount)
    }

    // If at least one block was removed, show the animation.
    if (blockCount >= 1 && sign == -1) {
      repeatFunction(function() { renderer.remove(i); }, blockCount);
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
  // Select the right item in the GUI.
  var ruleList = document.querySelector('#rule-list');
  var rules = ruleList.querySelectorAll('ineq-item');

  for (var i = 0; i < rules.length; i++) {
    var rule = rules[i];
    if (i == simulation.previousRule) {
      rule.setAttribute('selected', true);
    } else {
      rule.removeAttribute('selected');
    }
  }
}

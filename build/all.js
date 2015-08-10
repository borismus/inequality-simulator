(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({"/Users/smus/Projects/inequality/emitter.js":[function(require,module,exports){
function Emitter() {
  this.initEmitter();
}

Emitter.prototype.initEmitter = function() {
  this.callbacks = {};
};

Emitter.prototype.fire = function(eventName) {
  var callbacks = this.callbacks[eventName];
  if (!callbacks) {
    console.log('No valid callback specified for %s.', eventName);
    return;
  }
  var args = [].slice.call(arguments)
  // Eliminate the first param (the callback).
  args.shift();
  for (var i = 0; i < callbacks.length; i++) {
    callbacks[i].apply(this, args);
  }
};

Emitter.prototype.on = function(eventName, callback) {
  if (eventName in this.callbacks) {
    this.callbacks[eventName].push(callback);
  } else {
    this.callbacks[eventName] = [callback];
  }
};

module.exports = Emitter;

},{}],"/Users/smus/Projects/inequality/household.js":[function(require,module,exports){
var Emitter = require('./emitter.js');

/**
 * A simple model for households.
 *
 * Households are defined by discretionaryIncome and investmentAbility.
 *
 * Households are driven by a schedule, and an internal clock.
 * - Every year, events happen:
 *   - get discretionaryIncome
 *   - invest and get a return based on investmentAbility
 */
function Household(opt_params) {
  var params = opt_params || {};
  // Household annual income.
  this.discretionaryIncome = params.discretionaryIncome ||
      simulation.getValue('discretionaryIncome');
  // Investment ability as a return rate.
  this.investmentAbility = params.investmentAbility ||
      simulation.getValue('investmentAbility');

  // The schedule of a household.
  this.yearlySchedule = [
    this.earn,
    this.invest,
    this.payTax,
    this.inflate
  ];

  // State variables we actually want to track over time.
  this.generation = 0;
  this.netWorth = 0;

  this.initEmitter();
}
Household.prototype = new Emitter();

/**
 * Performs a time step.
 */
Household.prototype.tick = function(year) {
  // Run through the yearly schedule.
  for (var i = 0; i < this.yearlySchedule.length; i++) {
    var action = this.yearlySchedule[i];
    action.bind(this)();
  }
};

/**
 * The tasks that a household can perform.
 */
Household.prototype.earn = function() {
  this.netWorth += this.discretionaryIncome;

  this.fire('earn', {
    household: this,
    amount: this.discretionaryIncome
  });
};

Household.prototype.invest = function() {
  // Gain must be positive (ie. if no net worth, you shouldn't lose money).
  var gain = Math.max(0, this.netWorth * this.investmentAbility);
  this.netWorth += gain;

  this.fire('invest', {
    household: this,
    amount: gain
  });
};

Household.prototype.payTax = function() {
  if (this.netWorth > simulation.wealthTaxThreshold) {
    var taxAmount = this.netWorth * simulation.wealthTaxRate;
    this.netWorth -= taxAmount;
    // This will distribute the taxed amount to all other houses.
    if (simulation.isSocialist) {
      simulation.payTax(this, taxAmount);
    }
  }
};

Household.prototype.inflate = function() {
  this.netWorth -= this.netWorth * simulation.inflationRate;
};

module.exports = Household;

},{"./emitter.js":"/Users/smus/Projects/inequality/emitter.js"}],"/Users/smus/Projects/inequality/main.js":[function(require,module,exports){
var Simulation = require('./simulation.js');
var Household = require('./household.js');

var MAX_ROWS = 30;
var TICK_FPS = 30;

window.simulation = new Simulation();

// Discretionary incomes from http://goo.gl/Wak8Mc.
var poor = new Household({
  discretionaryIncome: 20,
  investmentAbility: 0.03
});
var average = new Household({
  discretionaryIncome: 20,
  investmentAbility: 0.03
});
var rich = new Household({
  discretionaryIncome: 20,
  investmentAbility: 0.03
});

simulation.households = [poor, average, rich];

// For debugging, give each household a name and attach events.
poor.label = 'poor';
average.label = 'average';
rich.label = 'rich';

var hh = simulation.households;
for (var i = 0; i < hh.length; i++) {
  hh[i].on('earn', onEarn);
  hh[i].on('invest', onInvest);
}
simulation.on('tick', onTick);

setInterval(function() {
  simulation.tick();
}, 1000/TICK_FPS);

function onEarn(e) {
  //console.log('%s earned $%d', e.household.label, e.amount);
}

function onInvest(e) {
  //console.log('%s got $%d from investment income', e.household.label, e.amount);
}

function onTick(e) {
  draw();
}

function getPercentages(houses) {
  var out = [];
  var totalNetWorth = 0;
  for (var i = 0; i < houses.length; i++) {
    totalNetWorth += houses[i].netWorth;
  }
  for (var i = 0; i < houses.length; i++) {
    var h = houses[i];
    out.push(h.netWorth / totalNetWorth);
  }
  return out;
}

function draw() {
  var houses = simulation.households;
  var percents = getPercentages(houses);
  for (var i = 0; i < houses.length; i++) {
    houses[i].percent = percents[i];
  }
  drawRow(houses);
}

var history = document.querySelector('#history');
function drawRow(houses) {
  var table = document.createElement('table');
  var row = document.createElement('tr');
  for (var i = 0; i < houses.length; i++) {
    var h = houses[i];
    var col = document.createElement('th');
    col.className = h.label;
    col.width = (h.percent * 100) + '%';
    row.appendChild(col);
  }
  table.appendChild(row);
  history.insertBefore(table, history.firstChild);

  if (history.children.length > MAX_ROWS) {
    history.removeChild(history.children[MAX_ROWS]);
  }
}


function createGui() {
  // Make a DAT.gui for changing parameters of each household.
  var gui = new dat.GUI();
  gui.add(simulation, 'wealthTaxRate', 0, 0.1);
  gui.add(simulation, 'wealthTaxThreshold', 0, 10000);
  gui.add(simulation, 'isSocialist');

  var hh = simulation.households;
  for (var i = 0; i < hh.length; i++) {
    var h = hh[i];
    var folder = gui.addFolder(h.label);
    folder.add(h, 'discretionaryIncome', 0, 200);
    folder.add(h, 'investmentAbility', 0, 0.1);
  }
}

createGui();

},{"./household.js":"/Users/smus/Projects/inequality/household.js","./simulation.js":"/Users/smus/Projects/inequality/simulation.js"}],"/Users/smus/Projects/inequality/simulation.js":[function(require,module,exports){
var Household = require('./household.js');
var Emitter = require('./emitter.js');
var Util = require('./util.js');
/**
 * A set of constants that define the world of the model, for example: tax
 * rates, market returns. Also defines the distributions that drive households.
 */
function Simulation() {
  // Who to consider wealthy.
  this.wealthTaxThreshold = 1000;
  // How much taxes to subject the wealthy to.
  this.wealthTaxRate = 0.0001;
  // Whether or not taxes paid by the wealthy get redistributed to the poor
  // directly.
  this.isSocialist = false;

  // Parameters that drive household distributions.
  this.discretionaryIncomeDist = {
    mean: 50000,
    sd: 10000
  };
  this.investmentAbilityDist = {
    mean: 0.05,
    sd: 0.03
  };

  // Just to keep the numbers a bit down, otherwise everybody becomes a
  // millionaire in like 100 iterations.
  this.inflationRate = 0.03;

  this.households = [];
}
Simulation.prototype = new Emitter();

Simulation.prototype.tick = function(year) {
  var worths = [];
  this.households.forEach(function(h) {
    h.tick(year);
    worths.push(h.netWorth);
  });
  this.fire('tick', {netWorths: worths});
};

Simulation.prototype.getValue = function(valueName) {
  var distName = valueName + 'Dist';
  var dist = this[distName];
  return Util.getRandomNormal(dist.mean, dist.sd);
};

Simulation.prototype.payTax = function(donorHousehold, amount) {
  // Split wealth evenly between all other households except itself.
  var houses = this.households;
  var amountPerHousehold = amount / (houses.length - 1);

  for (var i = 0; i < houses.length; i++) {
    var h = houses[i];
    if (h != donorHousehold) {
    }
    h.netWorth += amountPerHousehold;

    this.fire('welfare', {
      household: h,
      amount: amountPerHousehold
    });
  }
};

module.exports = Simulation;

},{"./emitter.js":"/Users/smus/Projects/inequality/emitter.js","./household.js":"/Users/smus/Projects/inequality/household.js","./util.js":"/Users/smus/Projects/inequality/util.js"}],"/Users/smus/Projects/inequality/util.js":[function(require,module,exports){
var Util = {};

/**
 * Normal distribution implementation. Polar form of the Box-Muller
 * transformation.
 */
Util.getRandomNormal = function(mean, sd) {
  return mean + (this.gaussRandom_() * sd);
};

/*
 * Returns random number in normal distribution centering on 0.
 * ~95% of numbers returned should fall between -2 and 2
 *
 * From http://stackoverflow.com/questions/75677/converting-a-uniform-distribution-to-a-normal-distribution?rq=1
 */
Util.gaussRandom_ = function() {
    var u = 2*Math.random()-1;
    var v = 2*Math.random()-1;
    var r = u*u + v*v;
    /*if outside interval [0,1] start over*/
    if(r == 0 || r > 1) return this.gaussRandom_();

    var c = Math.sqrt(-2*Math.log(r)/r);
    return u*c;

    /* todo: optimize this algorithm by caching (v*c) 
     * and returning next time gaussRandom() is called.
     * left out for simplicity */
};


module.exports = Util;

},{}]},{},["/Users/smus/Projects/inequality/main.js"])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL3Vzci9sb2NhbC9saWIvbm9kZV9tb2R1bGVzL3dhdGNoaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvc211cy9Qcm9qZWN0cy9pbmVxdWFsaXR5L2VtaXR0ZXIuanMiLCIvVXNlcnMvc211cy9Qcm9qZWN0cy9pbmVxdWFsaXR5L2hvdXNlaG9sZC5qcyIsIi9Vc2Vycy9zbXVzL1Byb2plY3RzL2luZXF1YWxpdHkvbWFpbi5qcyIsIi9Vc2Vycy9zbXVzL1Byb2plY3RzL2luZXF1YWxpdHkvc2ltdWxhdGlvbi5qcyIsIi9Vc2Vycy9zbXVzL1Byb2plY3RzL2luZXF1YWxpdHkvdXRpbC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJmdW5jdGlvbiBFbWl0dGVyKCkge1xuICB0aGlzLmluaXRFbWl0dGVyKCk7XG59XG5cbkVtaXR0ZXIucHJvdG90eXBlLmluaXRFbWl0dGVyID0gZnVuY3Rpb24oKSB7XG4gIHRoaXMuY2FsbGJhY2tzID0ge307XG59O1xuXG5FbWl0dGVyLnByb3RvdHlwZS5maXJlID0gZnVuY3Rpb24oZXZlbnROYW1lKSB7XG4gIHZhciBjYWxsYmFja3MgPSB0aGlzLmNhbGxiYWNrc1tldmVudE5hbWVdO1xuICBpZiAoIWNhbGxiYWNrcykge1xuICAgIGNvbnNvbGUubG9nKCdObyB2YWxpZCBjYWxsYmFjayBzcGVjaWZpZWQgZm9yICVzLicsIGV2ZW50TmFtZSk7XG4gICAgcmV0dXJuO1xuICB9XG4gIHZhciBhcmdzID0gW10uc2xpY2UuY2FsbChhcmd1bWVudHMpXG4gIC8vIEVsaW1pbmF0ZSB0aGUgZmlyc3QgcGFyYW0gKHRoZSBjYWxsYmFjaykuXG4gIGFyZ3Muc2hpZnQoKTtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBjYWxsYmFja3MubGVuZ3RoOyBpKyspIHtcbiAgICBjYWxsYmFja3NbaV0uYXBwbHkodGhpcywgYXJncyk7XG4gIH1cbn07XG5cbkVtaXR0ZXIucHJvdG90eXBlLm9uID0gZnVuY3Rpb24oZXZlbnROYW1lLCBjYWxsYmFjaykge1xuICBpZiAoZXZlbnROYW1lIGluIHRoaXMuY2FsbGJhY2tzKSB7XG4gICAgdGhpcy5jYWxsYmFja3NbZXZlbnROYW1lXS5wdXNoKGNhbGxiYWNrKTtcbiAgfSBlbHNlIHtcbiAgICB0aGlzLmNhbGxiYWNrc1tldmVudE5hbWVdID0gW2NhbGxiYWNrXTtcbiAgfVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBFbWl0dGVyO1xuIiwidmFyIEVtaXR0ZXIgPSByZXF1aXJlKCcuL2VtaXR0ZXIuanMnKTtcblxuLyoqXG4gKiBBIHNpbXBsZSBtb2RlbCBmb3IgaG91c2Vob2xkcy5cbiAqXG4gKiBIb3VzZWhvbGRzIGFyZSBkZWZpbmVkIGJ5IGRpc2NyZXRpb25hcnlJbmNvbWUgYW5kIGludmVzdG1lbnRBYmlsaXR5LlxuICpcbiAqIEhvdXNlaG9sZHMgYXJlIGRyaXZlbiBieSBhIHNjaGVkdWxlLCBhbmQgYW4gaW50ZXJuYWwgY2xvY2suXG4gKiAtIEV2ZXJ5IHllYXIsIGV2ZW50cyBoYXBwZW46XG4gKiAgIC0gZ2V0IGRpc2NyZXRpb25hcnlJbmNvbWVcbiAqICAgLSBpbnZlc3QgYW5kIGdldCBhIHJldHVybiBiYXNlZCBvbiBpbnZlc3RtZW50QWJpbGl0eVxuICovXG5mdW5jdGlvbiBIb3VzZWhvbGQob3B0X3BhcmFtcykge1xuICB2YXIgcGFyYW1zID0gb3B0X3BhcmFtcyB8fCB7fTtcbiAgLy8gSG91c2Vob2xkIGFubnVhbCBpbmNvbWUuXG4gIHRoaXMuZGlzY3JldGlvbmFyeUluY29tZSA9IHBhcmFtcy5kaXNjcmV0aW9uYXJ5SW5jb21lIHx8XG4gICAgICBzaW11bGF0aW9uLmdldFZhbHVlKCdkaXNjcmV0aW9uYXJ5SW5jb21lJyk7XG4gIC8vIEludmVzdG1lbnQgYWJpbGl0eSBhcyBhIHJldHVybiByYXRlLlxuICB0aGlzLmludmVzdG1lbnRBYmlsaXR5ID0gcGFyYW1zLmludmVzdG1lbnRBYmlsaXR5IHx8XG4gICAgICBzaW11bGF0aW9uLmdldFZhbHVlKCdpbnZlc3RtZW50QWJpbGl0eScpO1xuXG4gIC8vIFRoZSBzY2hlZHVsZSBvZiBhIGhvdXNlaG9sZC5cbiAgdGhpcy55ZWFybHlTY2hlZHVsZSA9IFtcbiAgICB0aGlzLmVhcm4sXG4gICAgdGhpcy5pbnZlc3QsXG4gICAgdGhpcy5wYXlUYXgsXG4gICAgdGhpcy5pbmZsYXRlXG4gIF07XG5cbiAgLy8gU3RhdGUgdmFyaWFibGVzIHdlIGFjdHVhbGx5IHdhbnQgdG8gdHJhY2sgb3ZlciB0aW1lLlxuICB0aGlzLmdlbmVyYXRpb24gPSAwO1xuICB0aGlzLm5ldFdvcnRoID0gMDtcblxuICB0aGlzLmluaXRFbWl0dGVyKCk7XG59XG5Ib3VzZWhvbGQucHJvdG90eXBlID0gbmV3IEVtaXR0ZXIoKTtcblxuLyoqXG4gKiBQZXJmb3JtcyBhIHRpbWUgc3RlcC5cbiAqL1xuSG91c2Vob2xkLnByb3RvdHlwZS50aWNrID0gZnVuY3Rpb24oeWVhcikge1xuICAvLyBSdW4gdGhyb3VnaCB0aGUgeWVhcmx5IHNjaGVkdWxlLlxuICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMueWVhcmx5U2NoZWR1bGUubGVuZ3RoOyBpKyspIHtcbiAgICB2YXIgYWN0aW9uID0gdGhpcy55ZWFybHlTY2hlZHVsZVtpXTtcbiAgICBhY3Rpb24uYmluZCh0aGlzKSgpO1xuICB9XG59O1xuXG4vKipcbiAqIFRoZSB0YXNrcyB0aGF0IGEgaG91c2Vob2xkIGNhbiBwZXJmb3JtLlxuICovXG5Ib3VzZWhvbGQucHJvdG90eXBlLmVhcm4gPSBmdW5jdGlvbigpIHtcbiAgdGhpcy5uZXRXb3J0aCArPSB0aGlzLmRpc2NyZXRpb25hcnlJbmNvbWU7XG5cbiAgdGhpcy5maXJlKCdlYXJuJywge1xuICAgIGhvdXNlaG9sZDogdGhpcyxcbiAgICBhbW91bnQ6IHRoaXMuZGlzY3JldGlvbmFyeUluY29tZVxuICB9KTtcbn07XG5cbkhvdXNlaG9sZC5wcm90b3R5cGUuaW52ZXN0ID0gZnVuY3Rpb24oKSB7XG4gIC8vIEdhaW4gbXVzdCBiZSBwb3NpdGl2ZSAoaWUuIGlmIG5vIG5ldCB3b3J0aCwgeW91IHNob3VsZG4ndCBsb3NlIG1vbmV5KS5cbiAgdmFyIGdhaW4gPSBNYXRoLm1heCgwLCB0aGlzLm5ldFdvcnRoICogdGhpcy5pbnZlc3RtZW50QWJpbGl0eSk7XG4gIHRoaXMubmV0V29ydGggKz0gZ2FpbjtcblxuICB0aGlzLmZpcmUoJ2ludmVzdCcsIHtcbiAgICBob3VzZWhvbGQ6IHRoaXMsXG4gICAgYW1vdW50OiBnYWluXG4gIH0pO1xufTtcblxuSG91c2Vob2xkLnByb3RvdHlwZS5wYXlUYXggPSBmdW5jdGlvbigpIHtcbiAgaWYgKHRoaXMubmV0V29ydGggPiBzaW11bGF0aW9uLndlYWx0aFRheFRocmVzaG9sZCkge1xuICAgIHZhciB0YXhBbW91bnQgPSB0aGlzLm5ldFdvcnRoICogc2ltdWxhdGlvbi53ZWFsdGhUYXhSYXRlO1xuICAgIHRoaXMubmV0V29ydGggLT0gdGF4QW1vdW50O1xuICAgIC8vIFRoaXMgd2lsbCBkaXN0cmlidXRlIHRoZSB0YXhlZCBhbW91bnQgdG8gYWxsIG90aGVyIGhvdXNlcy5cbiAgICBpZiAoc2ltdWxhdGlvbi5pc1NvY2lhbGlzdCkge1xuICAgICAgc2ltdWxhdGlvbi5wYXlUYXgodGhpcywgdGF4QW1vdW50KTtcbiAgICB9XG4gIH1cbn07XG5cbkhvdXNlaG9sZC5wcm90b3R5cGUuaW5mbGF0ZSA9IGZ1bmN0aW9uKCkge1xuICB0aGlzLm5ldFdvcnRoIC09IHRoaXMubmV0V29ydGggKiBzaW11bGF0aW9uLmluZmxhdGlvblJhdGU7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IEhvdXNlaG9sZDtcbiIsInZhciBTaW11bGF0aW9uID0gcmVxdWlyZSgnLi9zaW11bGF0aW9uLmpzJyk7XG52YXIgSG91c2Vob2xkID0gcmVxdWlyZSgnLi9ob3VzZWhvbGQuanMnKTtcblxudmFyIE1BWF9ST1dTID0gMzA7XG52YXIgVElDS19GUFMgPSAzMDtcblxud2luZG93LnNpbXVsYXRpb24gPSBuZXcgU2ltdWxhdGlvbigpO1xuXG4vLyBEaXNjcmV0aW9uYXJ5IGluY29tZXMgZnJvbSBodHRwOi8vZ29vLmdsL1dhazhNYy5cbnZhciBwb29yID0gbmV3IEhvdXNlaG9sZCh7XG4gIGRpc2NyZXRpb25hcnlJbmNvbWU6IDIwLFxuICBpbnZlc3RtZW50QWJpbGl0eTogMC4wM1xufSk7XG52YXIgYXZlcmFnZSA9IG5ldyBIb3VzZWhvbGQoe1xuICBkaXNjcmV0aW9uYXJ5SW5jb21lOiAyMCxcbiAgaW52ZXN0bWVudEFiaWxpdHk6IDAuMDNcbn0pO1xudmFyIHJpY2ggPSBuZXcgSG91c2Vob2xkKHtcbiAgZGlzY3JldGlvbmFyeUluY29tZTogMjAsXG4gIGludmVzdG1lbnRBYmlsaXR5OiAwLjAzXG59KTtcblxuc2ltdWxhdGlvbi5ob3VzZWhvbGRzID0gW3Bvb3IsIGF2ZXJhZ2UsIHJpY2hdO1xuXG4vLyBGb3IgZGVidWdnaW5nLCBnaXZlIGVhY2ggaG91c2Vob2xkIGEgbmFtZSBhbmQgYXR0YWNoIGV2ZW50cy5cbnBvb3IubGFiZWwgPSAncG9vcic7XG5hdmVyYWdlLmxhYmVsID0gJ2F2ZXJhZ2UnO1xucmljaC5sYWJlbCA9ICdyaWNoJztcblxudmFyIGhoID0gc2ltdWxhdGlvbi5ob3VzZWhvbGRzO1xuZm9yICh2YXIgaSA9IDA7IGkgPCBoaC5sZW5ndGg7IGkrKykge1xuICBoaFtpXS5vbignZWFybicsIG9uRWFybik7XG4gIGhoW2ldLm9uKCdpbnZlc3QnLCBvbkludmVzdCk7XG59XG5zaW11bGF0aW9uLm9uKCd0aWNrJywgb25UaWNrKTtcblxuc2V0SW50ZXJ2YWwoZnVuY3Rpb24oKSB7XG4gIHNpbXVsYXRpb24udGljaygpO1xufSwgMTAwMC9USUNLX0ZQUyk7XG5cbmZ1bmN0aW9uIG9uRWFybihlKSB7XG4gIC8vY29uc29sZS5sb2coJyVzIGVhcm5lZCAkJWQnLCBlLmhvdXNlaG9sZC5sYWJlbCwgZS5hbW91bnQpO1xufVxuXG5mdW5jdGlvbiBvbkludmVzdChlKSB7XG4gIC8vY29uc29sZS5sb2coJyVzIGdvdCAkJWQgZnJvbSBpbnZlc3RtZW50IGluY29tZScsIGUuaG91c2Vob2xkLmxhYmVsLCBlLmFtb3VudCk7XG59XG5cbmZ1bmN0aW9uIG9uVGljayhlKSB7XG4gIGRyYXcoKTtcbn1cblxuZnVuY3Rpb24gZ2V0UGVyY2VudGFnZXMoaG91c2VzKSB7XG4gIHZhciBvdXQgPSBbXTtcbiAgdmFyIHRvdGFsTmV0V29ydGggPSAwO1xuICBmb3IgKHZhciBpID0gMDsgaSA8IGhvdXNlcy5sZW5ndGg7IGkrKykge1xuICAgIHRvdGFsTmV0V29ydGggKz0gaG91c2VzW2ldLm5ldFdvcnRoO1xuICB9XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgaG91c2VzLmxlbmd0aDsgaSsrKSB7XG4gICAgdmFyIGggPSBob3VzZXNbaV07XG4gICAgb3V0LnB1c2goaC5uZXRXb3J0aCAvIHRvdGFsTmV0V29ydGgpO1xuICB9XG4gIHJldHVybiBvdXQ7XG59XG5cbmZ1bmN0aW9uIGRyYXcoKSB7XG4gIHZhciBob3VzZXMgPSBzaW11bGF0aW9uLmhvdXNlaG9sZHM7XG4gIHZhciBwZXJjZW50cyA9IGdldFBlcmNlbnRhZ2VzKGhvdXNlcyk7XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgaG91c2VzLmxlbmd0aDsgaSsrKSB7XG4gICAgaG91c2VzW2ldLnBlcmNlbnQgPSBwZXJjZW50c1tpXTtcbiAgfVxuICBkcmF3Um93KGhvdXNlcyk7XG59XG5cbnZhciBoaXN0b3J5ID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignI2hpc3RvcnknKTtcbmZ1bmN0aW9uIGRyYXdSb3coaG91c2VzKSB7XG4gIHZhciB0YWJsZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3RhYmxlJyk7XG4gIHZhciByb3cgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCd0cicpO1xuICBmb3IgKHZhciBpID0gMDsgaSA8IGhvdXNlcy5sZW5ndGg7IGkrKykge1xuICAgIHZhciBoID0gaG91c2VzW2ldO1xuICAgIHZhciBjb2wgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCd0aCcpO1xuICAgIGNvbC5jbGFzc05hbWUgPSBoLmxhYmVsO1xuICAgIGNvbC53aWR0aCA9IChoLnBlcmNlbnQgKiAxMDApICsgJyUnO1xuICAgIHJvdy5hcHBlbmRDaGlsZChjb2wpO1xuICB9XG4gIHRhYmxlLmFwcGVuZENoaWxkKHJvdyk7XG4gIGhpc3RvcnkuaW5zZXJ0QmVmb3JlKHRhYmxlLCBoaXN0b3J5LmZpcnN0Q2hpbGQpO1xuXG4gIGlmIChoaXN0b3J5LmNoaWxkcmVuLmxlbmd0aCA+IE1BWF9ST1dTKSB7XG4gICAgaGlzdG9yeS5yZW1vdmVDaGlsZChoaXN0b3J5LmNoaWxkcmVuW01BWF9ST1dTXSk7XG4gIH1cbn1cblxuXG5mdW5jdGlvbiBjcmVhdGVHdWkoKSB7XG4gIC8vIE1ha2UgYSBEQVQuZ3VpIGZvciBjaGFuZ2luZyBwYXJhbWV0ZXJzIG9mIGVhY2ggaG91c2Vob2xkLlxuICB2YXIgZ3VpID0gbmV3IGRhdC5HVUkoKTtcbiAgZ3VpLmFkZChzaW11bGF0aW9uLCAnd2VhbHRoVGF4UmF0ZScsIDAsIDAuMSk7XG4gIGd1aS5hZGQoc2ltdWxhdGlvbiwgJ3dlYWx0aFRheFRocmVzaG9sZCcsIDAsIDEwMDAwKTtcbiAgZ3VpLmFkZChzaW11bGF0aW9uLCAnaXNTb2NpYWxpc3QnKTtcblxuICB2YXIgaGggPSBzaW11bGF0aW9uLmhvdXNlaG9sZHM7XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgaGgubGVuZ3RoOyBpKyspIHtcbiAgICB2YXIgaCA9IGhoW2ldO1xuICAgIHZhciBmb2xkZXIgPSBndWkuYWRkRm9sZGVyKGgubGFiZWwpO1xuICAgIGZvbGRlci5hZGQoaCwgJ2Rpc2NyZXRpb25hcnlJbmNvbWUnLCAwLCAyMDApO1xuICAgIGZvbGRlci5hZGQoaCwgJ2ludmVzdG1lbnRBYmlsaXR5JywgMCwgMC4xKTtcbiAgfVxufVxuXG5jcmVhdGVHdWkoKTtcbiIsInZhciBIb3VzZWhvbGQgPSByZXF1aXJlKCcuL2hvdXNlaG9sZC5qcycpO1xudmFyIEVtaXR0ZXIgPSByZXF1aXJlKCcuL2VtaXR0ZXIuanMnKTtcbnZhciBVdGlsID0gcmVxdWlyZSgnLi91dGlsLmpzJyk7XG4vKipcbiAqIEEgc2V0IG9mIGNvbnN0YW50cyB0aGF0IGRlZmluZSB0aGUgd29ybGQgb2YgdGhlIG1vZGVsLCBmb3IgZXhhbXBsZTogdGF4XG4gKiByYXRlcywgbWFya2V0IHJldHVybnMuIEFsc28gZGVmaW5lcyB0aGUgZGlzdHJpYnV0aW9ucyB0aGF0IGRyaXZlIGhvdXNlaG9sZHMuXG4gKi9cbmZ1bmN0aW9uIFNpbXVsYXRpb24oKSB7XG4gIC8vIFdobyB0byBjb25zaWRlciB3ZWFsdGh5LlxuICB0aGlzLndlYWx0aFRheFRocmVzaG9sZCA9IDEwMDA7XG4gIC8vIEhvdyBtdWNoIHRheGVzIHRvIHN1YmplY3QgdGhlIHdlYWx0aHkgdG8uXG4gIHRoaXMud2VhbHRoVGF4UmF0ZSA9IDAuMDAwMTtcbiAgLy8gV2hldGhlciBvciBub3QgdGF4ZXMgcGFpZCBieSB0aGUgd2VhbHRoeSBnZXQgcmVkaXN0cmlidXRlZCB0byB0aGUgcG9vclxuICAvLyBkaXJlY3RseS5cbiAgdGhpcy5pc1NvY2lhbGlzdCA9IGZhbHNlO1xuXG4gIC8vIFBhcmFtZXRlcnMgdGhhdCBkcml2ZSBob3VzZWhvbGQgZGlzdHJpYnV0aW9ucy5cbiAgdGhpcy5kaXNjcmV0aW9uYXJ5SW5jb21lRGlzdCA9IHtcbiAgICBtZWFuOiA1MDAwMCxcbiAgICBzZDogMTAwMDBcbiAgfTtcbiAgdGhpcy5pbnZlc3RtZW50QWJpbGl0eURpc3QgPSB7XG4gICAgbWVhbjogMC4wNSxcbiAgICBzZDogMC4wM1xuICB9O1xuXG4gIC8vIEp1c3QgdG8ga2VlcCB0aGUgbnVtYmVycyBhIGJpdCBkb3duLCBvdGhlcndpc2UgZXZlcnlib2R5IGJlY29tZXMgYVxuICAvLyBtaWxsaW9uYWlyZSBpbiBsaWtlIDEwMCBpdGVyYXRpb25zLlxuICB0aGlzLmluZmxhdGlvblJhdGUgPSAwLjAzO1xuXG4gIHRoaXMuaG91c2Vob2xkcyA9IFtdO1xufVxuU2ltdWxhdGlvbi5wcm90b3R5cGUgPSBuZXcgRW1pdHRlcigpO1xuXG5TaW11bGF0aW9uLnByb3RvdHlwZS50aWNrID0gZnVuY3Rpb24oeWVhcikge1xuICB2YXIgd29ydGhzID0gW107XG4gIHRoaXMuaG91c2Vob2xkcy5mb3JFYWNoKGZ1bmN0aW9uKGgpIHtcbiAgICBoLnRpY2soeWVhcik7XG4gICAgd29ydGhzLnB1c2goaC5uZXRXb3J0aCk7XG4gIH0pO1xuICB0aGlzLmZpcmUoJ3RpY2snLCB7bmV0V29ydGhzOiB3b3J0aHN9KTtcbn07XG5cblNpbXVsYXRpb24ucHJvdG90eXBlLmdldFZhbHVlID0gZnVuY3Rpb24odmFsdWVOYW1lKSB7XG4gIHZhciBkaXN0TmFtZSA9IHZhbHVlTmFtZSArICdEaXN0JztcbiAgdmFyIGRpc3QgPSB0aGlzW2Rpc3ROYW1lXTtcbiAgcmV0dXJuIFV0aWwuZ2V0UmFuZG9tTm9ybWFsKGRpc3QubWVhbiwgZGlzdC5zZCk7XG59O1xuXG5TaW11bGF0aW9uLnByb3RvdHlwZS5wYXlUYXggPSBmdW5jdGlvbihkb25vckhvdXNlaG9sZCwgYW1vdW50KSB7XG4gIC8vIFNwbGl0IHdlYWx0aCBldmVubHkgYmV0d2VlbiBhbGwgb3RoZXIgaG91c2Vob2xkcyBleGNlcHQgaXRzZWxmLlxuICB2YXIgaG91c2VzID0gdGhpcy5ob3VzZWhvbGRzO1xuICB2YXIgYW1vdW50UGVySG91c2Vob2xkID0gYW1vdW50IC8gKGhvdXNlcy5sZW5ndGggLSAxKTtcblxuICBmb3IgKHZhciBpID0gMDsgaSA8IGhvdXNlcy5sZW5ndGg7IGkrKykge1xuICAgIHZhciBoID0gaG91c2VzW2ldO1xuICAgIGlmIChoICE9IGRvbm9ySG91c2Vob2xkKSB7XG4gICAgfVxuICAgIGgubmV0V29ydGggKz0gYW1vdW50UGVySG91c2Vob2xkO1xuXG4gICAgdGhpcy5maXJlKCd3ZWxmYXJlJywge1xuICAgICAgaG91c2Vob2xkOiBoLFxuICAgICAgYW1vdW50OiBhbW91bnRQZXJIb3VzZWhvbGRcbiAgICB9KTtcbiAgfVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBTaW11bGF0aW9uO1xuIiwidmFyIFV0aWwgPSB7fTtcblxuLyoqXG4gKiBOb3JtYWwgZGlzdHJpYnV0aW9uIGltcGxlbWVudGF0aW9uLiBQb2xhciBmb3JtIG9mIHRoZSBCb3gtTXVsbGVyXG4gKiB0cmFuc2Zvcm1hdGlvbi5cbiAqL1xuVXRpbC5nZXRSYW5kb21Ob3JtYWwgPSBmdW5jdGlvbihtZWFuLCBzZCkge1xuICByZXR1cm4gbWVhbiArICh0aGlzLmdhdXNzUmFuZG9tXygpICogc2QpO1xufTtcblxuLypcbiAqIFJldHVybnMgcmFuZG9tIG51bWJlciBpbiBub3JtYWwgZGlzdHJpYnV0aW9uIGNlbnRlcmluZyBvbiAwLlxuICogfjk1JSBvZiBudW1iZXJzIHJldHVybmVkIHNob3VsZCBmYWxsIGJldHdlZW4gLTIgYW5kIDJcbiAqXG4gKiBGcm9tIGh0dHA6Ly9zdGFja292ZXJmbG93LmNvbS9xdWVzdGlvbnMvNzU2NzcvY29udmVydGluZy1hLXVuaWZvcm0tZGlzdHJpYnV0aW9uLXRvLWEtbm9ybWFsLWRpc3RyaWJ1dGlvbj9ycT0xXG4gKi9cblV0aWwuZ2F1c3NSYW5kb21fID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHUgPSAyKk1hdGgucmFuZG9tKCktMTtcbiAgICB2YXIgdiA9IDIqTWF0aC5yYW5kb20oKS0xO1xuICAgIHZhciByID0gdSp1ICsgdip2O1xuICAgIC8qaWYgb3V0c2lkZSBpbnRlcnZhbCBbMCwxXSBzdGFydCBvdmVyKi9cbiAgICBpZihyID09IDAgfHwgciA+IDEpIHJldHVybiB0aGlzLmdhdXNzUmFuZG9tXygpO1xuXG4gICAgdmFyIGMgPSBNYXRoLnNxcnQoLTIqTWF0aC5sb2cocikvcik7XG4gICAgcmV0dXJuIHUqYztcblxuICAgIC8qIHRvZG86IG9wdGltaXplIHRoaXMgYWxnb3JpdGhtIGJ5IGNhY2hpbmcgKHYqYykgXG4gICAgICogYW5kIHJldHVybmluZyBuZXh0IHRpbWUgZ2F1c3NSYW5kb20oKSBpcyBjYWxsZWQuXG4gICAgICogbGVmdCBvdXQgZm9yIHNpbXBsaWNpdHkgKi9cbn07XG5cblxubW9kdWxlLmV4cG9ydHMgPSBVdGlsO1xuIl19

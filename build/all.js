(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
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

},{}],2:[function(require,module,exports){
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

},{"./emitter.js":1}],3:[function(require,module,exports){
var Simulation = require('./simulation.js');
var Household = require('./household.js');

var MAX_ROWS = 30;
var TICK_FPS = 3;

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
  gui.add(simulation, 'wealthTaxThreshold', 0, 5000);
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

},{"./household.js":2,"./simulation.js":4}],4:[function(require,module,exports){
var Household = require('./household.js');
var Emitter = require('./emitter.js');
var Util = require('./util.js');
/**
 * A set of constants that define the world of the model, for example: tax
 * rates, market returns. Also defines the distributions that drive households.
 */
function Simulation() {
  // Who to consider wealthy.
  this.wealthTaxThreshold = 500;
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

},{"./emitter.js":1,"./household.js":2,"./util.js":5}],5:[function(require,module,exports){
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

},{}]},{},[3])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL2hvbWVicmV3L2xpYi9ub2RlX21vZHVsZXMvd2F0Y2hpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsImVtaXR0ZXIuanMiLCJob3VzZWhvbGQuanMiLCJtYWluLmpzIiwic2ltdWxhdGlvbi5qcyIsInV0aWwuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0dBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiZnVuY3Rpb24gRW1pdHRlcigpIHtcbiAgdGhpcy5pbml0RW1pdHRlcigpO1xufVxuXG5FbWl0dGVyLnByb3RvdHlwZS5pbml0RW1pdHRlciA9IGZ1bmN0aW9uKCkge1xuICB0aGlzLmNhbGxiYWNrcyA9IHt9O1xufTtcblxuRW1pdHRlci5wcm90b3R5cGUuZmlyZSA9IGZ1bmN0aW9uKGV2ZW50TmFtZSkge1xuICB2YXIgY2FsbGJhY2tzID0gdGhpcy5jYWxsYmFja3NbZXZlbnROYW1lXTtcbiAgaWYgKCFjYWxsYmFja3MpIHtcbiAgICBjb25zb2xlLmxvZygnTm8gdmFsaWQgY2FsbGJhY2sgc3BlY2lmaWVkIGZvciAlcy4nLCBldmVudE5hbWUpO1xuICAgIHJldHVybjtcbiAgfVxuICB2YXIgYXJncyA9IFtdLnNsaWNlLmNhbGwoYXJndW1lbnRzKVxuICAvLyBFbGltaW5hdGUgdGhlIGZpcnN0IHBhcmFtICh0aGUgY2FsbGJhY2spLlxuICBhcmdzLnNoaWZ0KCk7XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgY2FsbGJhY2tzLmxlbmd0aDsgaSsrKSB7XG4gICAgY2FsbGJhY2tzW2ldLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICB9XG59O1xuXG5FbWl0dGVyLnByb3RvdHlwZS5vbiA9IGZ1bmN0aW9uKGV2ZW50TmFtZSwgY2FsbGJhY2spIHtcbiAgaWYgKGV2ZW50TmFtZSBpbiB0aGlzLmNhbGxiYWNrcykge1xuICAgIHRoaXMuY2FsbGJhY2tzW2V2ZW50TmFtZV0ucHVzaChjYWxsYmFjayk7XG4gIH0gZWxzZSB7XG4gICAgdGhpcy5jYWxsYmFja3NbZXZlbnROYW1lXSA9IFtjYWxsYmFja107XG4gIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gRW1pdHRlcjtcbiIsInZhciBFbWl0dGVyID0gcmVxdWlyZSgnLi9lbWl0dGVyLmpzJyk7XG5cbi8qKlxuICogQSBzaW1wbGUgbW9kZWwgZm9yIGhvdXNlaG9sZHMuXG4gKlxuICogSG91c2Vob2xkcyBhcmUgZGVmaW5lZCBieSBkaXNjcmV0aW9uYXJ5SW5jb21lIGFuZCBpbnZlc3RtZW50QWJpbGl0eS5cbiAqXG4gKiBIb3VzZWhvbGRzIGFyZSBkcml2ZW4gYnkgYSBzY2hlZHVsZSwgYW5kIGFuIGludGVybmFsIGNsb2NrLlxuICogLSBFdmVyeSB5ZWFyLCBldmVudHMgaGFwcGVuOlxuICogICAtIGdldCBkaXNjcmV0aW9uYXJ5SW5jb21lXG4gKiAgIC0gaW52ZXN0IGFuZCBnZXQgYSByZXR1cm4gYmFzZWQgb24gaW52ZXN0bWVudEFiaWxpdHlcbiAqL1xuZnVuY3Rpb24gSG91c2Vob2xkKG9wdF9wYXJhbXMpIHtcbiAgdmFyIHBhcmFtcyA9IG9wdF9wYXJhbXMgfHwge307XG4gIC8vIEhvdXNlaG9sZCBhbm51YWwgaW5jb21lLlxuICB0aGlzLmRpc2NyZXRpb25hcnlJbmNvbWUgPSBwYXJhbXMuZGlzY3JldGlvbmFyeUluY29tZSB8fFxuICAgICAgc2ltdWxhdGlvbi5nZXRWYWx1ZSgnZGlzY3JldGlvbmFyeUluY29tZScpO1xuICAvLyBJbnZlc3RtZW50IGFiaWxpdHkgYXMgYSByZXR1cm4gcmF0ZS5cbiAgdGhpcy5pbnZlc3RtZW50QWJpbGl0eSA9IHBhcmFtcy5pbnZlc3RtZW50QWJpbGl0eSB8fFxuICAgICAgc2ltdWxhdGlvbi5nZXRWYWx1ZSgnaW52ZXN0bWVudEFiaWxpdHknKTtcblxuICAvLyBUaGUgc2NoZWR1bGUgb2YgYSBob3VzZWhvbGQuXG4gIHRoaXMueWVhcmx5U2NoZWR1bGUgPSBbXG4gICAgdGhpcy5lYXJuLFxuICAgIHRoaXMuaW52ZXN0LFxuICAgIHRoaXMucGF5VGF4LFxuICAgIHRoaXMuaW5mbGF0ZVxuICBdO1xuXG4gIC8vIFN0YXRlIHZhcmlhYmxlcyB3ZSBhY3R1YWxseSB3YW50IHRvIHRyYWNrIG92ZXIgdGltZS5cbiAgdGhpcy5nZW5lcmF0aW9uID0gMDtcbiAgdGhpcy5uZXRXb3J0aCA9IDA7XG5cbiAgdGhpcy5pbml0RW1pdHRlcigpO1xufVxuSG91c2Vob2xkLnByb3RvdHlwZSA9IG5ldyBFbWl0dGVyKCk7XG5cbi8qKlxuICogUGVyZm9ybXMgYSB0aW1lIHN0ZXAuXG4gKi9cbkhvdXNlaG9sZC5wcm90b3R5cGUudGljayA9IGZ1bmN0aW9uKHllYXIpIHtcbiAgLy8gUnVuIHRocm91Z2ggdGhlIHllYXJseSBzY2hlZHVsZS5cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLnllYXJseVNjaGVkdWxlLmxlbmd0aDsgaSsrKSB7XG4gICAgdmFyIGFjdGlvbiA9IHRoaXMueWVhcmx5U2NoZWR1bGVbaV07XG4gICAgYWN0aW9uLmJpbmQodGhpcykoKTtcbiAgfVxufTtcblxuLyoqXG4gKiBUaGUgdGFza3MgdGhhdCBhIGhvdXNlaG9sZCBjYW4gcGVyZm9ybS5cbiAqL1xuSG91c2Vob2xkLnByb3RvdHlwZS5lYXJuID0gZnVuY3Rpb24oKSB7XG4gIHRoaXMubmV0V29ydGggKz0gdGhpcy5kaXNjcmV0aW9uYXJ5SW5jb21lO1xuXG4gIHRoaXMuZmlyZSgnZWFybicsIHtcbiAgICBob3VzZWhvbGQ6IHRoaXMsXG4gICAgYW1vdW50OiB0aGlzLmRpc2NyZXRpb25hcnlJbmNvbWVcbiAgfSk7XG59O1xuXG5Ib3VzZWhvbGQucHJvdG90eXBlLmludmVzdCA9IGZ1bmN0aW9uKCkge1xuICAvLyBHYWluIG11c3QgYmUgcG9zaXRpdmUgKGllLiBpZiBubyBuZXQgd29ydGgsIHlvdSBzaG91bGRuJ3QgbG9zZSBtb25leSkuXG4gIHZhciBnYWluID0gTWF0aC5tYXgoMCwgdGhpcy5uZXRXb3J0aCAqIHRoaXMuaW52ZXN0bWVudEFiaWxpdHkpO1xuICB0aGlzLm5ldFdvcnRoICs9IGdhaW47XG5cbiAgdGhpcy5maXJlKCdpbnZlc3QnLCB7XG4gICAgaG91c2Vob2xkOiB0aGlzLFxuICAgIGFtb3VudDogZ2FpblxuICB9KTtcbn07XG5cbkhvdXNlaG9sZC5wcm90b3R5cGUucGF5VGF4ID0gZnVuY3Rpb24oKSB7XG4gIGlmICh0aGlzLm5ldFdvcnRoID4gc2ltdWxhdGlvbi53ZWFsdGhUYXhUaHJlc2hvbGQpIHtcbiAgICB2YXIgdGF4QW1vdW50ID0gdGhpcy5uZXRXb3J0aCAqIHNpbXVsYXRpb24ud2VhbHRoVGF4UmF0ZTtcbiAgICB0aGlzLm5ldFdvcnRoIC09IHRheEFtb3VudDtcbiAgICAvLyBUaGlzIHdpbGwgZGlzdHJpYnV0ZSB0aGUgdGF4ZWQgYW1vdW50IHRvIGFsbCBvdGhlciBob3VzZXMuXG4gICAgaWYgKHNpbXVsYXRpb24uaXNTb2NpYWxpc3QpIHtcbiAgICAgIHNpbXVsYXRpb24ucGF5VGF4KHRoaXMsIHRheEFtb3VudCk7XG4gICAgfVxuICB9XG59O1xuXG5Ib3VzZWhvbGQucHJvdG90eXBlLmluZmxhdGUgPSBmdW5jdGlvbigpIHtcbiAgdGhpcy5uZXRXb3J0aCAtPSB0aGlzLm5ldFdvcnRoICogc2ltdWxhdGlvbi5pbmZsYXRpb25SYXRlO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBIb3VzZWhvbGQ7XG4iLCJ2YXIgU2ltdWxhdGlvbiA9IHJlcXVpcmUoJy4vc2ltdWxhdGlvbi5qcycpO1xudmFyIEhvdXNlaG9sZCA9IHJlcXVpcmUoJy4vaG91c2Vob2xkLmpzJyk7XG5cbnZhciBNQVhfUk9XUyA9IDMwO1xudmFyIFRJQ0tfRlBTID0gMztcblxud2luZG93LnNpbXVsYXRpb24gPSBuZXcgU2ltdWxhdGlvbigpO1xuXG4vLyBEaXNjcmV0aW9uYXJ5IGluY29tZXMgZnJvbSBodHRwOi8vZ29vLmdsL1dhazhNYy5cbnZhciBwb29yID0gbmV3IEhvdXNlaG9sZCh7XG4gIGRpc2NyZXRpb25hcnlJbmNvbWU6IDIwLFxuICBpbnZlc3RtZW50QWJpbGl0eTogMC4wM1xufSk7XG52YXIgYXZlcmFnZSA9IG5ldyBIb3VzZWhvbGQoe1xuICBkaXNjcmV0aW9uYXJ5SW5jb21lOiAyMCxcbiAgaW52ZXN0bWVudEFiaWxpdHk6IDAuMDNcbn0pO1xudmFyIHJpY2ggPSBuZXcgSG91c2Vob2xkKHtcbiAgZGlzY3JldGlvbmFyeUluY29tZTogMjAsXG4gIGludmVzdG1lbnRBYmlsaXR5OiAwLjAzXG59KTtcblxuc2ltdWxhdGlvbi5ob3VzZWhvbGRzID0gW3Bvb3IsIGF2ZXJhZ2UsIHJpY2hdO1xuXG4vLyBGb3IgZGVidWdnaW5nLCBnaXZlIGVhY2ggaG91c2Vob2xkIGEgbmFtZSBhbmQgYXR0YWNoIGV2ZW50cy5cbnBvb3IubGFiZWwgPSAncG9vcic7XG5hdmVyYWdlLmxhYmVsID0gJ2F2ZXJhZ2UnO1xucmljaC5sYWJlbCA9ICdyaWNoJztcblxudmFyIGhoID0gc2ltdWxhdGlvbi5ob3VzZWhvbGRzO1xuZm9yICh2YXIgaSA9IDA7IGkgPCBoaC5sZW5ndGg7IGkrKykge1xuICBoaFtpXS5vbignZWFybicsIG9uRWFybik7XG4gIGhoW2ldLm9uKCdpbnZlc3QnLCBvbkludmVzdCk7XG59XG5zaW11bGF0aW9uLm9uKCd0aWNrJywgb25UaWNrKTtcblxuc2V0SW50ZXJ2YWwoZnVuY3Rpb24oKSB7XG4gIHNpbXVsYXRpb24udGljaygpO1xufSwgMTAwMC9USUNLX0ZQUyk7XG5cbmZ1bmN0aW9uIG9uRWFybihlKSB7XG4gIC8vY29uc29sZS5sb2coJyVzIGVhcm5lZCAkJWQnLCBlLmhvdXNlaG9sZC5sYWJlbCwgZS5hbW91bnQpO1xufVxuXG5mdW5jdGlvbiBvbkludmVzdChlKSB7XG4gIC8vY29uc29sZS5sb2coJyVzIGdvdCAkJWQgZnJvbSBpbnZlc3RtZW50IGluY29tZScsIGUuaG91c2Vob2xkLmxhYmVsLCBlLmFtb3VudCk7XG59XG5cbmZ1bmN0aW9uIG9uVGljayhlKSB7XG4gIGRyYXcoKTtcbn1cblxuZnVuY3Rpb24gZ2V0UGVyY2VudGFnZXMoaG91c2VzKSB7XG4gIHZhciBvdXQgPSBbXTtcbiAgdmFyIHRvdGFsTmV0V29ydGggPSAwO1xuICBmb3IgKHZhciBpID0gMDsgaSA8IGhvdXNlcy5sZW5ndGg7IGkrKykge1xuICAgIHRvdGFsTmV0V29ydGggKz0gaG91c2VzW2ldLm5ldFdvcnRoO1xuICB9XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgaG91c2VzLmxlbmd0aDsgaSsrKSB7XG4gICAgdmFyIGggPSBob3VzZXNbaV07XG4gICAgb3V0LnB1c2goaC5uZXRXb3J0aCAvIHRvdGFsTmV0V29ydGgpO1xuICB9XG4gIHJldHVybiBvdXQ7XG59XG5cbmZ1bmN0aW9uIGRyYXcoKSB7XG4gIHZhciBob3VzZXMgPSBzaW11bGF0aW9uLmhvdXNlaG9sZHM7XG4gIHZhciBwZXJjZW50cyA9IGdldFBlcmNlbnRhZ2VzKGhvdXNlcyk7XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgaG91c2VzLmxlbmd0aDsgaSsrKSB7XG4gICAgaG91c2VzW2ldLnBlcmNlbnQgPSBwZXJjZW50c1tpXTtcbiAgfVxuICBkcmF3Um93KGhvdXNlcyk7XG59XG5cbnZhciBoaXN0b3J5ID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignI2hpc3RvcnknKTtcbmZ1bmN0aW9uIGRyYXdSb3coaG91c2VzKSB7XG4gIHZhciB0YWJsZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3RhYmxlJyk7XG4gIHZhciByb3cgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCd0cicpO1xuICBmb3IgKHZhciBpID0gMDsgaSA8IGhvdXNlcy5sZW5ndGg7IGkrKykge1xuICAgIHZhciBoID0gaG91c2VzW2ldO1xuICAgIHZhciBjb2wgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCd0aCcpO1xuICAgIGNvbC5jbGFzc05hbWUgPSBoLmxhYmVsO1xuICAgIGNvbC53aWR0aCA9IChoLnBlcmNlbnQgKiAxMDApICsgJyUnO1xuICAgIHJvdy5hcHBlbmRDaGlsZChjb2wpO1xuICB9XG4gIHRhYmxlLmFwcGVuZENoaWxkKHJvdyk7XG4gIGhpc3RvcnkuaW5zZXJ0QmVmb3JlKHRhYmxlLCBoaXN0b3J5LmZpcnN0Q2hpbGQpO1xuXG4gIGlmIChoaXN0b3J5LmNoaWxkcmVuLmxlbmd0aCA+IE1BWF9ST1dTKSB7XG4gICAgaGlzdG9yeS5yZW1vdmVDaGlsZChoaXN0b3J5LmNoaWxkcmVuW01BWF9ST1dTXSk7XG4gIH1cbn1cblxuXG5mdW5jdGlvbiBjcmVhdGVHdWkoKSB7XG4gIC8vIE1ha2UgYSBEQVQuZ3VpIGZvciBjaGFuZ2luZyBwYXJhbWV0ZXJzIG9mIGVhY2ggaG91c2Vob2xkLlxuICB2YXIgZ3VpID0gbmV3IGRhdC5HVUkoKTtcbiAgZ3VpLmFkZChzaW11bGF0aW9uLCAnd2VhbHRoVGF4UmF0ZScsIDAsIDAuMSk7XG4gIGd1aS5hZGQoc2ltdWxhdGlvbiwgJ3dlYWx0aFRheFRocmVzaG9sZCcsIDAsIDUwMDApO1xuICBndWkuYWRkKHNpbXVsYXRpb24sICdpc1NvY2lhbGlzdCcpO1xuXG4gIHZhciBoaCA9IHNpbXVsYXRpb24uaG91c2Vob2xkcztcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBoaC5sZW5ndGg7IGkrKykge1xuICAgIHZhciBoID0gaGhbaV07XG4gICAgdmFyIGZvbGRlciA9IGd1aS5hZGRGb2xkZXIoaC5sYWJlbCk7XG4gICAgZm9sZGVyLmFkZChoLCAnZGlzY3JldGlvbmFyeUluY29tZScsIDAsIDIwMCk7XG4gICAgZm9sZGVyLmFkZChoLCAnaW52ZXN0bWVudEFiaWxpdHknLCAwLCAwLjEpO1xuICB9XG59XG5cbmNyZWF0ZUd1aSgpO1xuIiwidmFyIEhvdXNlaG9sZCA9IHJlcXVpcmUoJy4vaG91c2Vob2xkLmpzJyk7XG52YXIgRW1pdHRlciA9IHJlcXVpcmUoJy4vZW1pdHRlci5qcycpO1xudmFyIFV0aWwgPSByZXF1aXJlKCcuL3V0aWwuanMnKTtcbi8qKlxuICogQSBzZXQgb2YgY29uc3RhbnRzIHRoYXQgZGVmaW5lIHRoZSB3b3JsZCBvZiB0aGUgbW9kZWwsIGZvciBleGFtcGxlOiB0YXhcbiAqIHJhdGVzLCBtYXJrZXQgcmV0dXJucy4gQWxzbyBkZWZpbmVzIHRoZSBkaXN0cmlidXRpb25zIHRoYXQgZHJpdmUgaG91c2Vob2xkcy5cbiAqL1xuZnVuY3Rpb24gU2ltdWxhdGlvbigpIHtcbiAgLy8gV2hvIHRvIGNvbnNpZGVyIHdlYWx0aHkuXG4gIHRoaXMud2VhbHRoVGF4VGhyZXNob2xkID0gNTAwO1xuICAvLyBIb3cgbXVjaCB0YXhlcyB0byBzdWJqZWN0IHRoZSB3ZWFsdGh5IHRvLlxuICB0aGlzLndlYWx0aFRheFJhdGUgPSAwLjAwMDE7XG4gIC8vIFdoZXRoZXIgb3Igbm90IHRheGVzIHBhaWQgYnkgdGhlIHdlYWx0aHkgZ2V0IHJlZGlzdHJpYnV0ZWQgdG8gdGhlIHBvb3JcbiAgLy8gZGlyZWN0bHkuXG4gIHRoaXMuaXNTb2NpYWxpc3QgPSBmYWxzZTtcblxuICAvLyBQYXJhbWV0ZXJzIHRoYXQgZHJpdmUgaG91c2Vob2xkIGRpc3RyaWJ1dGlvbnMuXG4gIHRoaXMuZGlzY3JldGlvbmFyeUluY29tZURpc3QgPSB7XG4gICAgbWVhbjogNTAwMDAsXG4gICAgc2Q6IDEwMDAwXG4gIH07XG4gIHRoaXMuaW52ZXN0bWVudEFiaWxpdHlEaXN0ID0ge1xuICAgIG1lYW46IDAuMDUsXG4gICAgc2Q6IDAuMDNcbiAgfTtcblxuICAvLyBKdXN0IHRvIGtlZXAgdGhlIG51bWJlcnMgYSBiaXQgZG93biwgb3RoZXJ3aXNlIGV2ZXJ5Ym9keSBiZWNvbWVzIGFcbiAgLy8gbWlsbGlvbmFpcmUgaW4gbGlrZSAxMDAgaXRlcmF0aW9ucy5cbiAgdGhpcy5pbmZsYXRpb25SYXRlID0gMC4wMztcblxuICB0aGlzLmhvdXNlaG9sZHMgPSBbXTtcbn1cblNpbXVsYXRpb24ucHJvdG90eXBlID0gbmV3IEVtaXR0ZXIoKTtcblxuU2ltdWxhdGlvbi5wcm90b3R5cGUudGljayA9IGZ1bmN0aW9uKHllYXIpIHtcbiAgdmFyIHdvcnRocyA9IFtdO1xuICB0aGlzLmhvdXNlaG9sZHMuZm9yRWFjaChmdW5jdGlvbihoKSB7XG4gICAgaC50aWNrKHllYXIpO1xuICAgIHdvcnRocy5wdXNoKGgubmV0V29ydGgpO1xuICB9KTtcbiAgdGhpcy5maXJlKCd0aWNrJywge25ldFdvcnRoczogd29ydGhzfSk7XG59O1xuXG5TaW11bGF0aW9uLnByb3RvdHlwZS5nZXRWYWx1ZSA9IGZ1bmN0aW9uKHZhbHVlTmFtZSkge1xuICB2YXIgZGlzdE5hbWUgPSB2YWx1ZU5hbWUgKyAnRGlzdCc7XG4gIHZhciBkaXN0ID0gdGhpc1tkaXN0TmFtZV07XG4gIHJldHVybiBVdGlsLmdldFJhbmRvbU5vcm1hbChkaXN0Lm1lYW4sIGRpc3Quc2QpO1xufTtcblxuU2ltdWxhdGlvbi5wcm90b3R5cGUucGF5VGF4ID0gZnVuY3Rpb24oZG9ub3JIb3VzZWhvbGQsIGFtb3VudCkge1xuICAvLyBTcGxpdCB3ZWFsdGggZXZlbmx5IGJldHdlZW4gYWxsIG90aGVyIGhvdXNlaG9sZHMgZXhjZXB0IGl0c2VsZi5cbiAgdmFyIGhvdXNlcyA9IHRoaXMuaG91c2Vob2xkcztcbiAgdmFyIGFtb3VudFBlckhvdXNlaG9sZCA9IGFtb3VudCAvIChob3VzZXMubGVuZ3RoIC0gMSk7XG5cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBob3VzZXMubGVuZ3RoOyBpKyspIHtcbiAgICB2YXIgaCA9IGhvdXNlc1tpXTtcbiAgICBpZiAoaCAhPSBkb25vckhvdXNlaG9sZCkge1xuICAgIH1cbiAgICBoLm5ldFdvcnRoICs9IGFtb3VudFBlckhvdXNlaG9sZDtcblxuICAgIHRoaXMuZmlyZSgnd2VsZmFyZScsIHtcbiAgICAgIGhvdXNlaG9sZDogaCxcbiAgICAgIGFtb3VudDogYW1vdW50UGVySG91c2Vob2xkXG4gICAgfSk7XG4gIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gU2ltdWxhdGlvbjtcbiIsInZhciBVdGlsID0ge307XG5cbi8qKlxuICogTm9ybWFsIGRpc3RyaWJ1dGlvbiBpbXBsZW1lbnRhdGlvbi4gUG9sYXIgZm9ybSBvZiB0aGUgQm94LU11bGxlclxuICogdHJhbnNmb3JtYXRpb24uXG4gKi9cblV0aWwuZ2V0UmFuZG9tTm9ybWFsID0gZnVuY3Rpb24obWVhbiwgc2QpIHtcbiAgcmV0dXJuIG1lYW4gKyAodGhpcy5nYXVzc1JhbmRvbV8oKSAqIHNkKTtcbn07XG5cbi8qXG4gKiBSZXR1cm5zIHJhbmRvbSBudW1iZXIgaW4gbm9ybWFsIGRpc3RyaWJ1dGlvbiBjZW50ZXJpbmcgb24gMC5cbiAqIH45NSUgb2YgbnVtYmVycyByZXR1cm5lZCBzaG91bGQgZmFsbCBiZXR3ZWVuIC0yIGFuZCAyXG4gKlxuICogRnJvbSBodHRwOi8vc3RhY2tvdmVyZmxvdy5jb20vcXVlc3Rpb25zLzc1Njc3L2NvbnZlcnRpbmctYS11bmlmb3JtLWRpc3RyaWJ1dGlvbi10by1hLW5vcm1hbC1kaXN0cmlidXRpb24/cnE9MVxuICovXG5VdGlsLmdhdXNzUmFuZG9tXyA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciB1ID0gMipNYXRoLnJhbmRvbSgpLTE7XG4gICAgdmFyIHYgPSAyKk1hdGgucmFuZG9tKCktMTtcbiAgICB2YXIgciA9IHUqdSArIHYqdjtcbiAgICAvKmlmIG91dHNpZGUgaW50ZXJ2YWwgWzAsMV0gc3RhcnQgb3ZlciovXG4gICAgaWYociA9PSAwIHx8IHIgPiAxKSByZXR1cm4gdGhpcy5nYXVzc1JhbmRvbV8oKTtcblxuICAgIHZhciBjID0gTWF0aC5zcXJ0KC0yKk1hdGgubG9nKHIpL3IpO1xuICAgIHJldHVybiB1KmM7XG5cbiAgICAvKiB0b2RvOiBvcHRpbWl6ZSB0aGlzIGFsZ29yaXRobSBieSBjYWNoaW5nICh2KmMpIFxuICAgICAqIGFuZCByZXR1cm5pbmcgbmV4dCB0aW1lIGdhdXNzUmFuZG9tKCkgaXMgY2FsbGVkLlxuICAgICAqIGxlZnQgb3V0IGZvciBzaW1wbGljaXR5ICovXG59O1xuXG5cbm1vZHVsZS5leHBvcnRzID0gVXRpbDtcbiJdfQ==

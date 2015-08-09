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
 * A model for households.
 *
 * Households are defined by lifespan, wage and saving habits.
 *
 * Households are driven by a schedule, and an internal clock.
 * - Every year, events happen:
 *   - get a wage
 *   - pay income tax
 *   - spend a bunch of money
 *   - invest money
 *   - get back investment returns
 */
function Household(opt_params) {
  var params = opt_params || {};
  // Household annual income.
  this.discretionaryIncome = params.discretionaryIncome ||
      simulation.getValue('discretionaryIncome');
  // Lifespan of the household.
  this.lifespan = Math.round(params.lifespan || simulation.getValue('lifespan'));
  // Spending habits.
  this.spendingPercent = params.spendingPercent ||
      simulation.getValue('spendingPercent');
  // Investment ability as a return rate.
  this.investmentAbility = params.investmentAbility ||
      simulation.getValue('investmentAbility');

  // The schedule of a household.
  this.yearlySchedule = [
    this.earn,
    this.spend,
    this.invest,
    this.inflate
  ];

  // State variables we actually want to track over time.
  this.age = 0;
  this.generation = 0;
  this.netWorth = 0;

  this.initEmitter();
}
Household.prototype = new Emitter();

/**
 * Performs a time step.
 */
Household.prototype.tick = function(year) {
  // Increment age.
  this.age += 1;

  // Run through the yearly schedule.
  for (var i = 0; i < this.yearlySchedule.length; i++) {
    var action = this.yearlySchedule[i];
    action.bind(this)();
  }

  // Check for death.
  if (this.age == this.lifespan) {
    this.bequest();
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

Household.prototype.spend = function() {
  var amount = this.discretionaryIncome * this.spendingPercent;
  this.netWorth -= amount;

  this.fire('spend', {
    household: this,
    amount: amount
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

Household.prototype.inflate = function() {
  // Overall net worth goes down due to inflation.
  if (this.netWorth <= 0) {
    return;
  }
  this.netWorth *= (1 - simulation.inflationRate);
  this.fire('inflate', { household: this });
};

Household.prototype.bequest = function() {
  this.age = 0;
  this.generation += 1;
  this.netWorth = (1 - simulation.estateTaxRate) * this.netWorth;
  //this.lifespan = Math.round(simulation.getValue('lifespan'));
  simulation.payTax(this, this.netWorth * simulation.estateTaxRate);

  this.fire('bequest', {
    household: this
  });
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
  discretionaryIncome: 9699,
  lifespan: 50,
  spendingPercent: 0.4,
  investmentAbility: 0.03
});
var average = new Household({
  discretionaryIncome: 21657,
  lifespan: 50,
  spendingPercent: 0.4,
  investmentAbility: 0.03
});
var rich = new Household({
  discretionaryIncome: 62110,
  lifespan: 50,
  spendingPercent: 0.4,
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
  hh[i].on('spend', onSpend);
  hh[i].on('invest', onInvest);
  hh[i].on('bequest', onBequest);
  hh[i].on('inflate', onInflate);
}
simulation.on('tick', onTick);
simulation.on('welfare', onWelfare);

setInterval(function() {
  simulation.tick();
}, 1000/TICK_FPS);

function onEarn(e) {
  //console.log('%s earned $%d', e.household.label, e.amount);
}

function onIncomeTax(e) {
  //console.log('%s paid $%d in income tax', e.household.label, e.amount);
}

function onSpend(e) {
  //console.log('%s spent $%d on living costs', e.household.label, e.amount);
}

function onInvest(e) {
  //console.log('%s got $%d from investment income', e.household.label, e.amount);
}

function onBequest(e) {
  console.log('%s inherited $%d', e.household.label, e.household.netWorth);
}

function onInflate(e) {
}

function onTick(e) {
  draw();
}

function onWelfare(e) {
  //console.log('%s got $%d of welfare from government.', e.household.label, e.amount);
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
  gui.add(simulation, 'estateTaxRate', 0, 0.5);
  gui.add(simulation, 'wealthTaxRate', 0, 0.1);
  gui.add(simulation, 'inflationRate', 0, 0.1);

  var hh = simulation.households;
  for (var i = 0; i < hh.length; i++) {
    var h = hh[i];
    var folder = gui.addFolder(h.label);
    folder.add(h, 'discretionaryIncome');
    folder.add(h, 'lifespan', 0, 100).step(1);
    folder.add(h, 'spendingPercent', 0, 1);
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
  // Estate tax estimated.
  this.estateTaxRate = 0.3;
  this.wealthTaxRate = 0.00001;
  // Inflation rate from http://goo.gl/vpZSW8.
  this.inflationRate = 0.0322;

  // Parameters that drive household distributions.
  this.discretionaryIncomeDist = {
    mean: 50000,
    sd: 10000
  };
  this.lifespanDist = {
    mean: 30,
    sd: 10
  };
  this.spendingPercentDist = {
    mean: 0.5,
    sd: 0.2
  };
  this.investmentAbilityDist = {
    mean: 0.05,
    sd: 0.03
  };

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

Simulation.prototype.payTax = function(household, amount) {
  // Do nothing about taxes for now.
  return;
  // Split wealth evenly between all other households that need money.
  var hh = this.getOtherHouseholdsInDebt(household);
  var amountPerHousehold = amount / hh.length;

  // Model the fact that taxes aren't actually distributed directly to poor
  // people through this efficiency notion.
  amountPerHousehold *= this.taxEfficiency;
  for (var i = 0; i < hh.length; i++) {
    var h = hh[i];
    // Never give a huge amount of aid, just enough to get out of poverty.
    var maxAid = Math.abs(h.netWorth);
    var aid = Math.min(maxAid, amountPerHousehold);
    h.netWorth += aid;

    this.fire('welfare', {
      household: h,
      amount: aid
    });
  }
};

Simulation.prototype.getOtherHouseholdsInDebt = function(household) {
  var out = [];
  for (var i = 0; i < this.households.length; i++) {
    var h = this.households[i];
    if (h.netWorth <= 0 && h != household) {
      out.push(h);
    }
  }
  return out;
};

Simulation.prototype.replaceHousehold = function(parent, child) {
  var removeIndex = 0;
  for (var i = 0; i < this.households.length; i++) {
    if (this.households[i] == parent) {
      removeIndex = i;
      break;
    }
  }
  this.households[removeIndex] = child;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL3Vzci9sb2NhbC9saWIvbm9kZV9tb2R1bGVzL3dhdGNoaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvc211cy9Qcm9qZWN0cy9pbmVxdWFsaXR5L2VtaXR0ZXIuanMiLCIvVXNlcnMvc211cy9Qcm9qZWN0cy9pbmVxdWFsaXR5L2hvdXNlaG9sZC5qcyIsIi9Vc2Vycy9zbXVzL1Byb2plY3RzL2luZXF1YWxpdHkvbWFpbi5qcyIsIi9Vc2Vycy9zbXVzL1Byb2plY3RzL2luZXF1YWxpdHkvc2ltdWxhdGlvbi5qcyIsIi9Vc2Vycy9zbXVzL1Byb2plY3RzL2luZXF1YWxpdHkvdXRpbC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsImZ1bmN0aW9uIEVtaXR0ZXIoKSB7XG4gIHRoaXMuaW5pdEVtaXR0ZXIoKTtcbn1cblxuRW1pdHRlci5wcm90b3R5cGUuaW5pdEVtaXR0ZXIgPSBmdW5jdGlvbigpIHtcbiAgdGhpcy5jYWxsYmFja3MgPSB7fTtcbn07XG5cbkVtaXR0ZXIucHJvdG90eXBlLmZpcmUgPSBmdW5jdGlvbihldmVudE5hbWUpIHtcbiAgdmFyIGNhbGxiYWNrcyA9IHRoaXMuY2FsbGJhY2tzW2V2ZW50TmFtZV07XG4gIGlmICghY2FsbGJhY2tzKSB7XG4gICAgY29uc29sZS5sb2coJ05vIHZhbGlkIGNhbGxiYWNrIHNwZWNpZmllZCBmb3IgJXMuJywgZXZlbnROYW1lKTtcbiAgICByZXR1cm47XG4gIH1cbiAgdmFyIGFyZ3MgPSBbXS5zbGljZS5jYWxsKGFyZ3VtZW50cylcbiAgLy8gRWxpbWluYXRlIHRoZSBmaXJzdCBwYXJhbSAodGhlIGNhbGxiYWNrKS5cbiAgYXJncy5zaGlmdCgpO1xuICBmb3IgKHZhciBpID0gMDsgaSA8IGNhbGxiYWNrcy5sZW5ndGg7IGkrKykge1xuICAgIGNhbGxiYWNrc1tpXS5hcHBseSh0aGlzLCBhcmdzKTtcbiAgfVxufTtcblxuRW1pdHRlci5wcm90b3R5cGUub24gPSBmdW5jdGlvbihldmVudE5hbWUsIGNhbGxiYWNrKSB7XG4gIGlmIChldmVudE5hbWUgaW4gdGhpcy5jYWxsYmFja3MpIHtcbiAgICB0aGlzLmNhbGxiYWNrc1tldmVudE5hbWVdLnB1c2goY2FsbGJhY2spO1xuICB9IGVsc2Uge1xuICAgIHRoaXMuY2FsbGJhY2tzW2V2ZW50TmFtZV0gPSBbY2FsbGJhY2tdO1xuICB9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IEVtaXR0ZXI7XG4iLCJ2YXIgRW1pdHRlciA9IHJlcXVpcmUoJy4vZW1pdHRlci5qcycpO1xuXG4vKipcbiAqIEEgbW9kZWwgZm9yIGhvdXNlaG9sZHMuXG4gKlxuICogSG91c2Vob2xkcyBhcmUgZGVmaW5lZCBieSBsaWZlc3Bhbiwgd2FnZSBhbmQgc2F2aW5nIGhhYml0cy5cbiAqXG4gKiBIb3VzZWhvbGRzIGFyZSBkcml2ZW4gYnkgYSBzY2hlZHVsZSwgYW5kIGFuIGludGVybmFsIGNsb2NrLlxuICogLSBFdmVyeSB5ZWFyLCBldmVudHMgaGFwcGVuOlxuICogICAtIGdldCBhIHdhZ2VcbiAqICAgLSBwYXkgaW5jb21lIHRheFxuICogICAtIHNwZW5kIGEgYnVuY2ggb2YgbW9uZXlcbiAqICAgLSBpbnZlc3QgbW9uZXlcbiAqICAgLSBnZXQgYmFjayBpbnZlc3RtZW50IHJldHVybnNcbiAqL1xuZnVuY3Rpb24gSG91c2Vob2xkKG9wdF9wYXJhbXMpIHtcbiAgdmFyIHBhcmFtcyA9IG9wdF9wYXJhbXMgfHwge307XG4gIC8vIEhvdXNlaG9sZCBhbm51YWwgaW5jb21lLlxuICB0aGlzLmRpc2NyZXRpb25hcnlJbmNvbWUgPSBwYXJhbXMuZGlzY3JldGlvbmFyeUluY29tZSB8fFxuICAgICAgc2ltdWxhdGlvbi5nZXRWYWx1ZSgnZGlzY3JldGlvbmFyeUluY29tZScpO1xuICAvLyBMaWZlc3BhbiBvZiB0aGUgaG91c2Vob2xkLlxuICB0aGlzLmxpZmVzcGFuID0gTWF0aC5yb3VuZChwYXJhbXMubGlmZXNwYW4gfHwgc2ltdWxhdGlvbi5nZXRWYWx1ZSgnbGlmZXNwYW4nKSk7XG4gIC8vIFNwZW5kaW5nIGhhYml0cy5cbiAgdGhpcy5zcGVuZGluZ1BlcmNlbnQgPSBwYXJhbXMuc3BlbmRpbmdQZXJjZW50IHx8XG4gICAgICBzaW11bGF0aW9uLmdldFZhbHVlKCdzcGVuZGluZ1BlcmNlbnQnKTtcbiAgLy8gSW52ZXN0bWVudCBhYmlsaXR5IGFzIGEgcmV0dXJuIHJhdGUuXG4gIHRoaXMuaW52ZXN0bWVudEFiaWxpdHkgPSBwYXJhbXMuaW52ZXN0bWVudEFiaWxpdHkgfHxcbiAgICAgIHNpbXVsYXRpb24uZ2V0VmFsdWUoJ2ludmVzdG1lbnRBYmlsaXR5Jyk7XG5cbiAgLy8gVGhlIHNjaGVkdWxlIG9mIGEgaG91c2Vob2xkLlxuICB0aGlzLnllYXJseVNjaGVkdWxlID0gW1xuICAgIHRoaXMuZWFybixcbiAgICB0aGlzLnNwZW5kLFxuICAgIHRoaXMuaW52ZXN0LFxuICAgIHRoaXMuaW5mbGF0ZVxuICBdO1xuXG4gIC8vIFN0YXRlIHZhcmlhYmxlcyB3ZSBhY3R1YWxseSB3YW50IHRvIHRyYWNrIG92ZXIgdGltZS5cbiAgdGhpcy5hZ2UgPSAwO1xuICB0aGlzLmdlbmVyYXRpb24gPSAwO1xuICB0aGlzLm5ldFdvcnRoID0gMDtcblxuICB0aGlzLmluaXRFbWl0dGVyKCk7XG59XG5Ib3VzZWhvbGQucHJvdG90eXBlID0gbmV3IEVtaXR0ZXIoKTtcblxuLyoqXG4gKiBQZXJmb3JtcyBhIHRpbWUgc3RlcC5cbiAqL1xuSG91c2Vob2xkLnByb3RvdHlwZS50aWNrID0gZnVuY3Rpb24oeWVhcikge1xuICAvLyBJbmNyZW1lbnQgYWdlLlxuICB0aGlzLmFnZSArPSAxO1xuXG4gIC8vIFJ1biB0aHJvdWdoIHRoZSB5ZWFybHkgc2NoZWR1bGUuXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy55ZWFybHlTY2hlZHVsZS5sZW5ndGg7IGkrKykge1xuICAgIHZhciBhY3Rpb24gPSB0aGlzLnllYXJseVNjaGVkdWxlW2ldO1xuICAgIGFjdGlvbi5iaW5kKHRoaXMpKCk7XG4gIH1cblxuICAvLyBDaGVjayBmb3IgZGVhdGguXG4gIGlmICh0aGlzLmFnZSA9PSB0aGlzLmxpZmVzcGFuKSB7XG4gICAgdGhpcy5iZXF1ZXN0KCk7XG4gIH1cbn07XG5cbi8qKlxuICogVGhlIHRhc2tzIHRoYXQgYSBob3VzZWhvbGQgY2FuIHBlcmZvcm0uXG4gKi9cbkhvdXNlaG9sZC5wcm90b3R5cGUuZWFybiA9IGZ1bmN0aW9uKCkge1xuICB0aGlzLm5ldFdvcnRoICs9IHRoaXMuZGlzY3JldGlvbmFyeUluY29tZTtcblxuICB0aGlzLmZpcmUoJ2Vhcm4nLCB7XG4gICAgaG91c2Vob2xkOiB0aGlzLFxuICAgIGFtb3VudDogdGhpcy5kaXNjcmV0aW9uYXJ5SW5jb21lXG4gIH0pO1xufTtcblxuSG91c2Vob2xkLnByb3RvdHlwZS5zcGVuZCA9IGZ1bmN0aW9uKCkge1xuICB2YXIgYW1vdW50ID0gdGhpcy5kaXNjcmV0aW9uYXJ5SW5jb21lICogdGhpcy5zcGVuZGluZ1BlcmNlbnQ7XG4gIHRoaXMubmV0V29ydGggLT0gYW1vdW50O1xuXG4gIHRoaXMuZmlyZSgnc3BlbmQnLCB7XG4gICAgaG91c2Vob2xkOiB0aGlzLFxuICAgIGFtb3VudDogYW1vdW50XG4gIH0pO1xufTtcblxuSG91c2Vob2xkLnByb3RvdHlwZS5pbnZlc3QgPSBmdW5jdGlvbigpIHtcbiAgLy8gR2FpbiBtdXN0IGJlIHBvc2l0aXZlIChpZS4gaWYgbm8gbmV0IHdvcnRoLCB5b3Ugc2hvdWxkbid0IGxvc2UgbW9uZXkpLlxuICB2YXIgZ2FpbiA9IE1hdGgubWF4KDAsIHRoaXMubmV0V29ydGggKiB0aGlzLmludmVzdG1lbnRBYmlsaXR5KTtcbiAgdGhpcy5uZXRXb3J0aCArPSBnYWluO1xuXG4gIHRoaXMuZmlyZSgnaW52ZXN0Jywge1xuICAgIGhvdXNlaG9sZDogdGhpcyxcbiAgICBhbW91bnQ6IGdhaW5cbiAgfSk7XG59O1xuXG5Ib3VzZWhvbGQucHJvdG90eXBlLmluZmxhdGUgPSBmdW5jdGlvbigpIHtcbiAgLy8gT3ZlcmFsbCBuZXQgd29ydGggZ29lcyBkb3duIGR1ZSB0byBpbmZsYXRpb24uXG4gIGlmICh0aGlzLm5ldFdvcnRoIDw9IDApIHtcbiAgICByZXR1cm47XG4gIH1cbiAgdGhpcy5uZXRXb3J0aCAqPSAoMSAtIHNpbXVsYXRpb24uaW5mbGF0aW9uUmF0ZSk7XG4gIHRoaXMuZmlyZSgnaW5mbGF0ZScsIHsgaG91c2Vob2xkOiB0aGlzIH0pO1xufTtcblxuSG91c2Vob2xkLnByb3RvdHlwZS5iZXF1ZXN0ID0gZnVuY3Rpb24oKSB7XG4gIHRoaXMuYWdlID0gMDtcbiAgdGhpcy5nZW5lcmF0aW9uICs9IDE7XG4gIHRoaXMubmV0V29ydGggPSAoMSAtIHNpbXVsYXRpb24uZXN0YXRlVGF4UmF0ZSkgKiB0aGlzLm5ldFdvcnRoO1xuICAvL3RoaXMubGlmZXNwYW4gPSBNYXRoLnJvdW5kKHNpbXVsYXRpb24uZ2V0VmFsdWUoJ2xpZmVzcGFuJykpO1xuICBzaW11bGF0aW9uLnBheVRheCh0aGlzLCB0aGlzLm5ldFdvcnRoICogc2ltdWxhdGlvbi5lc3RhdGVUYXhSYXRlKTtcblxuICB0aGlzLmZpcmUoJ2JlcXVlc3QnLCB7XG4gICAgaG91c2Vob2xkOiB0aGlzXG4gIH0pO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBIb3VzZWhvbGQ7XG4iLCJ2YXIgU2ltdWxhdGlvbiA9IHJlcXVpcmUoJy4vc2ltdWxhdGlvbi5qcycpO1xudmFyIEhvdXNlaG9sZCA9IHJlcXVpcmUoJy4vaG91c2Vob2xkLmpzJyk7XG5cbnZhciBNQVhfUk9XUyA9IDMwO1xudmFyIFRJQ0tfRlBTID0gMzA7XG5cbndpbmRvdy5zaW11bGF0aW9uID0gbmV3IFNpbXVsYXRpb24oKTtcblxuLy8gRGlzY3JldGlvbmFyeSBpbmNvbWVzIGZyb20gaHR0cDovL2dvby5nbC9XYWs4TWMuXG52YXIgcG9vciA9IG5ldyBIb3VzZWhvbGQoe1xuICBkaXNjcmV0aW9uYXJ5SW5jb21lOiA5Njk5LFxuICBsaWZlc3BhbjogNTAsXG4gIHNwZW5kaW5nUGVyY2VudDogMC40LFxuICBpbnZlc3RtZW50QWJpbGl0eTogMC4wM1xufSk7XG52YXIgYXZlcmFnZSA9IG5ldyBIb3VzZWhvbGQoe1xuICBkaXNjcmV0aW9uYXJ5SW5jb21lOiAyMTY1NyxcbiAgbGlmZXNwYW46IDUwLFxuICBzcGVuZGluZ1BlcmNlbnQ6IDAuNCxcbiAgaW52ZXN0bWVudEFiaWxpdHk6IDAuMDNcbn0pO1xudmFyIHJpY2ggPSBuZXcgSG91c2Vob2xkKHtcbiAgZGlzY3JldGlvbmFyeUluY29tZTogNjIxMTAsXG4gIGxpZmVzcGFuOiA1MCxcbiAgc3BlbmRpbmdQZXJjZW50OiAwLjQsXG4gIGludmVzdG1lbnRBYmlsaXR5OiAwLjAzXG59KTtcblxuc2ltdWxhdGlvbi5ob3VzZWhvbGRzID0gW3Bvb3IsIGF2ZXJhZ2UsIHJpY2hdO1xuXG4vLyBGb3IgZGVidWdnaW5nLCBnaXZlIGVhY2ggaG91c2Vob2xkIGEgbmFtZSBhbmQgYXR0YWNoIGV2ZW50cy5cbnBvb3IubGFiZWwgPSAncG9vcic7XG5hdmVyYWdlLmxhYmVsID0gJ2F2ZXJhZ2UnO1xucmljaC5sYWJlbCA9ICdyaWNoJztcblxudmFyIGhoID0gc2ltdWxhdGlvbi5ob3VzZWhvbGRzO1xuZm9yICh2YXIgaSA9IDA7IGkgPCBoaC5sZW5ndGg7IGkrKykge1xuICBoaFtpXS5vbignZWFybicsIG9uRWFybik7XG4gIGhoW2ldLm9uKCdzcGVuZCcsIG9uU3BlbmQpO1xuICBoaFtpXS5vbignaW52ZXN0Jywgb25JbnZlc3QpO1xuICBoaFtpXS5vbignYmVxdWVzdCcsIG9uQmVxdWVzdCk7XG4gIGhoW2ldLm9uKCdpbmZsYXRlJywgb25JbmZsYXRlKTtcbn1cbnNpbXVsYXRpb24ub24oJ3RpY2snLCBvblRpY2spO1xuc2ltdWxhdGlvbi5vbignd2VsZmFyZScsIG9uV2VsZmFyZSk7XG5cbnNldEludGVydmFsKGZ1bmN0aW9uKCkge1xuICBzaW11bGF0aW9uLnRpY2soKTtcbn0sIDEwMDAvVElDS19GUFMpO1xuXG5mdW5jdGlvbiBvbkVhcm4oZSkge1xuICAvL2NvbnNvbGUubG9nKCclcyBlYXJuZWQgJCVkJywgZS5ob3VzZWhvbGQubGFiZWwsIGUuYW1vdW50KTtcbn1cblxuZnVuY3Rpb24gb25JbmNvbWVUYXgoZSkge1xuICAvL2NvbnNvbGUubG9nKCclcyBwYWlkICQlZCBpbiBpbmNvbWUgdGF4JywgZS5ob3VzZWhvbGQubGFiZWwsIGUuYW1vdW50KTtcbn1cblxuZnVuY3Rpb24gb25TcGVuZChlKSB7XG4gIC8vY29uc29sZS5sb2coJyVzIHNwZW50ICQlZCBvbiBsaXZpbmcgY29zdHMnLCBlLmhvdXNlaG9sZC5sYWJlbCwgZS5hbW91bnQpO1xufVxuXG5mdW5jdGlvbiBvbkludmVzdChlKSB7XG4gIC8vY29uc29sZS5sb2coJyVzIGdvdCAkJWQgZnJvbSBpbnZlc3RtZW50IGluY29tZScsIGUuaG91c2Vob2xkLmxhYmVsLCBlLmFtb3VudCk7XG59XG5cbmZ1bmN0aW9uIG9uQmVxdWVzdChlKSB7XG4gIGNvbnNvbGUubG9nKCclcyBpbmhlcml0ZWQgJCVkJywgZS5ob3VzZWhvbGQubGFiZWwsIGUuaG91c2Vob2xkLm5ldFdvcnRoKTtcbn1cblxuZnVuY3Rpb24gb25JbmZsYXRlKGUpIHtcbn1cblxuZnVuY3Rpb24gb25UaWNrKGUpIHtcbiAgZHJhdygpO1xufVxuXG5mdW5jdGlvbiBvbldlbGZhcmUoZSkge1xuICAvL2NvbnNvbGUubG9nKCclcyBnb3QgJCVkIG9mIHdlbGZhcmUgZnJvbSBnb3Zlcm5tZW50LicsIGUuaG91c2Vob2xkLmxhYmVsLCBlLmFtb3VudCk7XG59XG5cbmZ1bmN0aW9uIGdldFBlcmNlbnRhZ2VzKGhvdXNlcykge1xuICB2YXIgb3V0ID0gW107XG4gIHZhciB0b3RhbE5ldFdvcnRoID0gMDtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBob3VzZXMubGVuZ3RoOyBpKyspIHtcbiAgICB0b3RhbE5ldFdvcnRoICs9IGhvdXNlc1tpXS5uZXRXb3J0aDtcbiAgfVxuICBmb3IgKHZhciBpID0gMDsgaSA8IGhvdXNlcy5sZW5ndGg7IGkrKykge1xuICAgIHZhciBoID0gaG91c2VzW2ldO1xuICAgIG91dC5wdXNoKGgubmV0V29ydGggLyB0b3RhbE5ldFdvcnRoKTtcbiAgfVxuICByZXR1cm4gb3V0O1xufVxuXG5mdW5jdGlvbiBkcmF3KCkge1xuICB2YXIgaG91c2VzID0gc2ltdWxhdGlvbi5ob3VzZWhvbGRzO1xuICB2YXIgcGVyY2VudHMgPSBnZXRQZXJjZW50YWdlcyhob3VzZXMpO1xuICBmb3IgKHZhciBpID0gMDsgaSA8IGhvdXNlcy5sZW5ndGg7IGkrKykge1xuICAgIGhvdXNlc1tpXS5wZXJjZW50ID0gcGVyY2VudHNbaV07XG4gIH1cbiAgZHJhd1Jvdyhob3VzZXMpO1xufVxuXG52YXIgaGlzdG9yeSA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyNoaXN0b3J5Jyk7XG5mdW5jdGlvbiBkcmF3Um93KGhvdXNlcykge1xuICB2YXIgdGFibGUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCd0YWJsZScpO1xuICB2YXIgcm93ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgndHInKTtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBob3VzZXMubGVuZ3RoOyBpKyspIHtcbiAgICB2YXIgaCA9IGhvdXNlc1tpXTtcbiAgICB2YXIgY29sID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgndGgnKTtcbiAgICBjb2wuY2xhc3NOYW1lID0gaC5sYWJlbDtcbiAgICBjb2wud2lkdGggPSAoaC5wZXJjZW50ICogMTAwKSArICclJztcbiAgICByb3cuYXBwZW5kQ2hpbGQoY29sKTtcbiAgfVxuICB0YWJsZS5hcHBlbmRDaGlsZChyb3cpO1xuICBoaXN0b3J5Lmluc2VydEJlZm9yZSh0YWJsZSwgaGlzdG9yeS5maXJzdENoaWxkKTtcblxuICBpZiAoaGlzdG9yeS5jaGlsZHJlbi5sZW5ndGggPiBNQVhfUk9XUykge1xuICAgIGhpc3RvcnkucmVtb3ZlQ2hpbGQoaGlzdG9yeS5jaGlsZHJlbltNQVhfUk9XU10pO1xuICB9XG59XG5cblxuZnVuY3Rpb24gY3JlYXRlR3VpKCkge1xuICAvLyBNYWtlIGEgREFULmd1aSBmb3IgY2hhbmdpbmcgcGFyYW1ldGVycyBvZiBlYWNoIGhvdXNlaG9sZC5cbiAgdmFyIGd1aSA9IG5ldyBkYXQuR1VJKCk7XG4gIGd1aS5hZGQoc2ltdWxhdGlvbiwgJ2VzdGF0ZVRheFJhdGUnLCAwLCAwLjUpO1xuICBndWkuYWRkKHNpbXVsYXRpb24sICd3ZWFsdGhUYXhSYXRlJywgMCwgMC4xKTtcbiAgZ3VpLmFkZChzaW11bGF0aW9uLCAnaW5mbGF0aW9uUmF0ZScsIDAsIDAuMSk7XG5cbiAgdmFyIGhoID0gc2ltdWxhdGlvbi5ob3VzZWhvbGRzO1xuICBmb3IgKHZhciBpID0gMDsgaSA8IGhoLmxlbmd0aDsgaSsrKSB7XG4gICAgdmFyIGggPSBoaFtpXTtcbiAgICB2YXIgZm9sZGVyID0gZ3VpLmFkZEZvbGRlcihoLmxhYmVsKTtcbiAgICBmb2xkZXIuYWRkKGgsICdkaXNjcmV0aW9uYXJ5SW5jb21lJyk7XG4gICAgZm9sZGVyLmFkZChoLCAnbGlmZXNwYW4nLCAwLCAxMDApLnN0ZXAoMSk7XG4gICAgZm9sZGVyLmFkZChoLCAnc3BlbmRpbmdQZXJjZW50JywgMCwgMSk7XG4gICAgZm9sZGVyLmFkZChoLCAnaW52ZXN0bWVudEFiaWxpdHknLCAwLCAwLjEpO1xuICB9XG59XG5cbmNyZWF0ZUd1aSgpO1xuIiwidmFyIEhvdXNlaG9sZCA9IHJlcXVpcmUoJy4vaG91c2Vob2xkLmpzJyk7XG52YXIgRW1pdHRlciA9IHJlcXVpcmUoJy4vZW1pdHRlci5qcycpO1xudmFyIFV0aWwgPSByZXF1aXJlKCcuL3V0aWwuanMnKTtcbi8qKlxuICogQSBzZXQgb2YgY29uc3RhbnRzIHRoYXQgZGVmaW5lIHRoZSB3b3JsZCBvZiB0aGUgbW9kZWwsIGZvciBleGFtcGxlOiB0YXhcbiAqIHJhdGVzLCBtYXJrZXQgcmV0dXJucy4gQWxzbyBkZWZpbmVzIHRoZSBkaXN0cmlidXRpb25zIHRoYXQgZHJpdmUgaG91c2Vob2xkcy5cbiAqL1xuZnVuY3Rpb24gU2ltdWxhdGlvbigpIHtcbiAgLy8gRXN0YXRlIHRheCBlc3RpbWF0ZWQuXG4gIHRoaXMuZXN0YXRlVGF4UmF0ZSA9IDAuMztcbiAgdGhpcy53ZWFsdGhUYXhSYXRlID0gMC4wMDAwMTtcbiAgLy8gSW5mbGF0aW9uIHJhdGUgZnJvbSBodHRwOi8vZ29vLmdsL3ZwWlNXOC5cbiAgdGhpcy5pbmZsYXRpb25SYXRlID0gMC4wMzIyO1xuXG4gIC8vIFBhcmFtZXRlcnMgdGhhdCBkcml2ZSBob3VzZWhvbGQgZGlzdHJpYnV0aW9ucy5cbiAgdGhpcy5kaXNjcmV0aW9uYXJ5SW5jb21lRGlzdCA9IHtcbiAgICBtZWFuOiA1MDAwMCxcbiAgICBzZDogMTAwMDBcbiAgfTtcbiAgdGhpcy5saWZlc3BhbkRpc3QgPSB7XG4gICAgbWVhbjogMzAsXG4gICAgc2Q6IDEwXG4gIH07XG4gIHRoaXMuc3BlbmRpbmdQZXJjZW50RGlzdCA9IHtcbiAgICBtZWFuOiAwLjUsXG4gICAgc2Q6IDAuMlxuICB9O1xuICB0aGlzLmludmVzdG1lbnRBYmlsaXR5RGlzdCA9IHtcbiAgICBtZWFuOiAwLjA1LFxuICAgIHNkOiAwLjAzXG4gIH07XG5cbiAgdGhpcy5ob3VzZWhvbGRzID0gW107XG59XG5TaW11bGF0aW9uLnByb3RvdHlwZSA9IG5ldyBFbWl0dGVyKCk7XG5cblNpbXVsYXRpb24ucHJvdG90eXBlLnRpY2sgPSBmdW5jdGlvbih5ZWFyKSB7XG4gIHZhciB3b3J0aHMgPSBbXTtcbiAgdGhpcy5ob3VzZWhvbGRzLmZvckVhY2goZnVuY3Rpb24oaCkge1xuICAgIGgudGljayh5ZWFyKTtcbiAgICB3b3J0aHMucHVzaChoLm5ldFdvcnRoKTtcbiAgfSk7XG4gIHRoaXMuZmlyZSgndGljaycsIHtuZXRXb3J0aHM6IHdvcnRoc30pO1xufTtcblxuU2ltdWxhdGlvbi5wcm90b3R5cGUuZ2V0VmFsdWUgPSBmdW5jdGlvbih2YWx1ZU5hbWUpIHtcbiAgdmFyIGRpc3ROYW1lID0gdmFsdWVOYW1lICsgJ0Rpc3QnO1xuICB2YXIgZGlzdCA9IHRoaXNbZGlzdE5hbWVdO1xuICByZXR1cm4gVXRpbC5nZXRSYW5kb21Ob3JtYWwoZGlzdC5tZWFuLCBkaXN0LnNkKTtcbn07XG5cblNpbXVsYXRpb24ucHJvdG90eXBlLnBheVRheCA9IGZ1bmN0aW9uKGhvdXNlaG9sZCwgYW1vdW50KSB7XG4gIC8vIERvIG5vdGhpbmcgYWJvdXQgdGF4ZXMgZm9yIG5vdy5cbiAgcmV0dXJuO1xuICAvLyBTcGxpdCB3ZWFsdGggZXZlbmx5IGJldHdlZW4gYWxsIG90aGVyIGhvdXNlaG9sZHMgdGhhdCBuZWVkIG1vbmV5LlxuICB2YXIgaGggPSB0aGlzLmdldE90aGVySG91c2Vob2xkc0luRGVidChob3VzZWhvbGQpO1xuICB2YXIgYW1vdW50UGVySG91c2Vob2xkID0gYW1vdW50IC8gaGgubGVuZ3RoO1xuXG4gIC8vIE1vZGVsIHRoZSBmYWN0IHRoYXQgdGF4ZXMgYXJlbid0IGFjdHVhbGx5IGRpc3RyaWJ1dGVkIGRpcmVjdGx5IHRvIHBvb3JcbiAgLy8gcGVvcGxlIHRocm91Z2ggdGhpcyBlZmZpY2llbmN5IG5vdGlvbi5cbiAgYW1vdW50UGVySG91c2Vob2xkICo9IHRoaXMudGF4RWZmaWNpZW5jeTtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBoaC5sZW5ndGg7IGkrKykge1xuICAgIHZhciBoID0gaGhbaV07XG4gICAgLy8gTmV2ZXIgZ2l2ZSBhIGh1Z2UgYW1vdW50IG9mIGFpZCwganVzdCBlbm91Z2ggdG8gZ2V0IG91dCBvZiBwb3ZlcnR5LlxuICAgIHZhciBtYXhBaWQgPSBNYXRoLmFicyhoLm5ldFdvcnRoKTtcbiAgICB2YXIgYWlkID0gTWF0aC5taW4obWF4QWlkLCBhbW91bnRQZXJIb3VzZWhvbGQpO1xuICAgIGgubmV0V29ydGggKz0gYWlkO1xuXG4gICAgdGhpcy5maXJlKCd3ZWxmYXJlJywge1xuICAgICAgaG91c2Vob2xkOiBoLFxuICAgICAgYW1vdW50OiBhaWRcbiAgICB9KTtcbiAgfVxufTtcblxuU2ltdWxhdGlvbi5wcm90b3R5cGUuZ2V0T3RoZXJIb3VzZWhvbGRzSW5EZWJ0ID0gZnVuY3Rpb24oaG91c2Vob2xkKSB7XG4gIHZhciBvdXQgPSBbXTtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLmhvdXNlaG9sZHMubGVuZ3RoOyBpKyspIHtcbiAgICB2YXIgaCA9IHRoaXMuaG91c2Vob2xkc1tpXTtcbiAgICBpZiAoaC5uZXRXb3J0aCA8PSAwICYmIGggIT0gaG91c2Vob2xkKSB7XG4gICAgICBvdXQucHVzaChoKTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIG91dDtcbn07XG5cblNpbXVsYXRpb24ucHJvdG90eXBlLnJlcGxhY2VIb3VzZWhvbGQgPSBmdW5jdGlvbihwYXJlbnQsIGNoaWxkKSB7XG4gIHZhciByZW1vdmVJbmRleCA9IDA7XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5ob3VzZWhvbGRzLmxlbmd0aDsgaSsrKSB7XG4gICAgaWYgKHRoaXMuaG91c2Vob2xkc1tpXSA9PSBwYXJlbnQpIHtcbiAgICAgIHJlbW92ZUluZGV4ID0gaTtcbiAgICAgIGJyZWFrO1xuICAgIH1cbiAgfVxuICB0aGlzLmhvdXNlaG9sZHNbcmVtb3ZlSW5kZXhdID0gY2hpbGQ7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFNpbXVsYXRpb247XG4iLCJ2YXIgVXRpbCA9IHt9O1xuXG4vKipcbiAqIE5vcm1hbCBkaXN0cmlidXRpb24gaW1wbGVtZW50YXRpb24uIFBvbGFyIGZvcm0gb2YgdGhlIEJveC1NdWxsZXJcbiAqIHRyYW5zZm9ybWF0aW9uLlxuICovXG5VdGlsLmdldFJhbmRvbU5vcm1hbCA9IGZ1bmN0aW9uKG1lYW4sIHNkKSB7XG4gIHJldHVybiBtZWFuICsgKHRoaXMuZ2F1c3NSYW5kb21fKCkgKiBzZCk7XG59O1xuXG4vKlxuICogUmV0dXJucyByYW5kb20gbnVtYmVyIGluIG5vcm1hbCBkaXN0cmlidXRpb24gY2VudGVyaW5nIG9uIDAuXG4gKiB+OTUlIG9mIG51bWJlcnMgcmV0dXJuZWQgc2hvdWxkIGZhbGwgYmV0d2VlbiAtMiBhbmQgMlxuICpcbiAqIEZyb20gaHR0cDovL3N0YWNrb3ZlcmZsb3cuY29tL3F1ZXN0aW9ucy83NTY3Ny9jb252ZXJ0aW5nLWEtdW5pZm9ybS1kaXN0cmlidXRpb24tdG8tYS1ub3JtYWwtZGlzdHJpYnV0aW9uP3JxPTFcbiAqL1xuVXRpbC5nYXVzc1JhbmRvbV8gPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgdSA9IDIqTWF0aC5yYW5kb20oKS0xO1xuICAgIHZhciB2ID0gMipNYXRoLnJhbmRvbSgpLTE7XG4gICAgdmFyIHIgPSB1KnUgKyB2KnY7XG4gICAgLyppZiBvdXRzaWRlIGludGVydmFsIFswLDFdIHN0YXJ0IG92ZXIqL1xuICAgIGlmKHIgPT0gMCB8fCByID4gMSkgcmV0dXJuIHRoaXMuZ2F1c3NSYW5kb21fKCk7XG5cbiAgICB2YXIgYyA9IE1hdGguc3FydCgtMipNYXRoLmxvZyhyKS9yKTtcbiAgICByZXR1cm4gdSpjO1xuXG4gICAgLyogdG9kbzogb3B0aW1pemUgdGhpcyBhbGdvcml0aG0gYnkgY2FjaGluZyAodipjKSBcbiAgICAgKiBhbmQgcmV0dXJuaW5nIG5leHQgdGltZSBnYXVzc1JhbmRvbSgpIGlzIGNhbGxlZC5cbiAgICAgKiBsZWZ0IG91dCBmb3Igc2ltcGxpY2l0eSAqL1xufTtcblxuXG5tb2R1bGUuZXhwb3J0cyA9IFV0aWw7XG4iXX0=

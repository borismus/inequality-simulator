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

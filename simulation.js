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

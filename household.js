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

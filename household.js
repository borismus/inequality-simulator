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

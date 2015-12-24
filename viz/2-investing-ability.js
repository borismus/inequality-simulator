var title = 'Differences in investing abilities leads to wealth inequality'
var rules = [
  {label: 'Salary', action: 'this.total += 2 * this.incomeMultiplier'},
  {label: 'Investment', action: 'this.total += this.investmentAbility * this.total'},
  {label: 'Spending', action: 'this.total -= 1 * this.spendingHabits'},
];

var simulation = new Simulation(rules);
simulation.addActor({
  label: 'non-investor',
  incomeMultiplier: 1,
  spendingHabits: 1,
  investmentAbility: 0
});
simulation.addActor({
  label: 'investor',
  incomeMultiplier: 1,
  spendingHabits: 1,
  investmentAbility: 0.05
});

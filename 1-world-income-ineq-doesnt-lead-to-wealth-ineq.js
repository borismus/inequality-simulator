var title = 'Income inequality leads to proportional wealth inequality';

var rules = [
  {label: 'Salary', action: 'this.total += 2 * this.incomeMultiplier'},
  {label: 'Spending', action: 'this.total -= 1'},
];

var simulation = new Simulation(rules);
simulation.addActor({
  label: 'Low income',
  incomeMultiplier: 1,
});
simulation.addActor({
  label: 'High income',
  incomeMultiplier: 2,
});

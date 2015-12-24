var title = 'Income inequality alone does not explain wealth inequality';

var rules = [
  {label: 'Salary', action: 'this.total += 2 * this.incomeMultiplier'},
  {label: 'Spending', action: 'this.total -= 1 * this.spendingHabits'},
];

var simulation = new Simulation(rules);
simulation.addActor({
  label: 'poor',
  incomeMultiplier: 1,
  spendingHabits: 1,
});
simulation.addActor({
  label: 'rich',
  incomeMultiplier: 2,
  spendingHabits: 1,
});

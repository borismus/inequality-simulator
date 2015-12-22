var rules = [
  {label: 'Salary', action: 'this.total += 2 * this.incomeMultiplier'},
  {label: 'Spending', action: 'this.total -= 1 * this.spendingHabits'},
];

var simulation = new Simulation(rules);
simulation.setTitle('Income inequality alone does not explain wealth inequality');
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

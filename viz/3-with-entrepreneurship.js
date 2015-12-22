var rules = [
  {label: 'Salary', action: 'this.total += 2 * this.incomeMultiplier'},
  {label: 'Enterprise', action: 'this.total += 1.5 * this.total',
    condition: ['Math.random() < 0.05', 'this.isEntrepreneur == true']},
  {label: 'Spending', action: 'this.total -= 1 * this.spendingHabits'},
];

var simulation = new Simulation(rules);

simulation.addActor({
  label: 'entrepreneur',
  incomeMultiplier: 1,
  spendingHabits: 1,
  isEntrepreneur: true
});
simulation.addActor({
  label: 'not-entrepreneur',
  incomeMultiplier: 2,
  spendingHabits: 1,
  isEntrepreneur: false
});

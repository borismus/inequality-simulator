var title = 'Entrepreneurship contributes to volatility';

var rules = [
  {label: 'Salary', action: 'this.total += 2 * this.incomeMultiplier'},
  {label: 'Enterprise success', action: 'this.total += 0.5 * this.total',
    condition: ['Math.random() < 0.01', 'this.isEntrepreneur == true']},
  {label: 'Enterprise fail', action: 'this.total -= 0.05 * this.total',
    condition: ['Math.random() < 0.1', 'this.isEntrepreneur == true']},
  {label: 'Spending', action: 'this.total -= 1'},
];

var simulation = new Simulation(rules);

simulation.addActor({
  label: 'entrepreneur',
  incomeMultiplier: 1,
  isEntrepreneur: true
});
simulation.addActor({
  label: 'not-entrepreneur',
  incomeMultiplier: 1,
  isEntrepreneur: false
});

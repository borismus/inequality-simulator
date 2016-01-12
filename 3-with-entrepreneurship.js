var title = 'Entrepreneurship contributes to volatility';

var rules = [
  {label: 'Salary', action: 'this.total += 2 * this.incomeMultiplier'},
  {label: 'Enterprise success', action: 'this.total += 0.5 * this.total',
    condition: ['Math.random() < (0.01 * this.luckBoost)', 'this.isEntrepreneur == true']},
  {label: 'Enterprise fail', action: 'this.total -= 0.05 * this.total',
    condition: ['Math.random() < 0.1', 'this.isEntrepreneur == true']},
  {label: 'Spending', action: 'this.total -= 1'},
];

var simulation = new Simulation(rules);

simulation.addActor({
  label: 'non-entrepreneur',
  incomeMultiplier: 1,
  isEntrepreneur: false,
  luckBoost: 1
});
simulation.addActor({
  label: 'entrepreneur',
  incomeMultiplier: 1,
  isEntrepreneur: true,
  luckBoost: 1
});
simulation.addActor({
  label: 'lucky-entrepreneur',
  incomeMultiplier: 1,
  isEntrepreneur: true,
  luckBoost: 2,
});

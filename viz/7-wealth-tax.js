var title = 'Adding an additional wealth tax helps even more';

var rules = [
  {label: 'Salary', action: 'this.total += 2 * this.incomeMultiplier'},
  {label: 'Investment', action: 'this.total += this.investmentAbility * this.total'},
  {label: 'Enterprise success', action: 'this.total += 0.5 * this.total',
    condition: ['Math.random() < 0.01', 'this.isEntrepreneur == true']},
  {label: 'Enterprise fail', action: 'this.total -= 0.05 * this.total',
    condition: ['Math.random() < 0.1', 'this.isEntrepreneur == true']},
  {label: 'Spending', action: 'this.total -= 1 * this.spendingHabits'},
  {label: 'Estate tax', action: 'this.total -= 0.4 * this.total',
      condition: ['this.age % 10 == 0', 'this.total > 50']},
  {label: 'Wealth tax', action: 'this.total -= 0.01 * this.total',
      condition: 'this.total > 50'}
];

var simulation = new Simulation(rules);

var incomes = [1, 2];
var incomeLabels = ['low-salary', 'high-salary'];
var investmentAbilities = [0, 0.05];
var investmentLabels = ['not-investor', 'investor'];
var entrepreneurness = [true, false];
var entrepreneurLabels = ['entrepreneur', 'not-entrepreneur'];

for (var i = 0; i < incomes.length; i++) {
  for (var j = 0; j < investmentAbilities.length; j++) {
    for (var k = 0; k < entrepreneurness.length; k++) {
      var label = incomeLabels[i] + ' ' + investmentLabels[j] + ' ' + entrepreneurLabels[k];
      simulation.addActor({
        label: label,
        incomeMultiplier: incomes[i],
        investmentAbility: investmentAbilities[j],
        isEntrepreneur: entrepreneurness[k],
        spendingHabits: 1,
        age: 0
      });
    }
  }
}

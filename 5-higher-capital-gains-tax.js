var title = 'Solution 1: capital gains tax (at 40%)';

var rules = [
  {label: 'Salary', action: 'this.total += 2 * this.incomeMultiplier'},
  {label: 'Investment', action: 'this.total += this.investmentAbility * this.total'},
  {label: 'Enterprise success', action: 'this.total += 0.5 * this.total',
    condition: ['Math.random() < 0.02', 'this.isEntrepreneur == true']},
  {label: 'Enterprise fail', action: 'this.total -= 0.05 * this.total',
    condition: ['Math.random() < 0.1', 'this.isEntrepreneur == true']},
  {label: 'Spending', action: 'this.total -= 1'},
  {label: 'Capital gains tax', action: 'this.total -= this.investmentAbility * 0.4 * this.total'},
];

var simulation = new Simulation(rules);

var incomes = [1, 2];
var incomeLabels = ['Low salary', 'High salary'];
var investmentAbilities = [0, 0.05];
var investmentLabels = ['', 'Investor'];
var entrepreneurness = [true, false];
var entrepreneurLabels = ['Entrepreneur', ''];

for (var i = 0; i < incomes.length; i++) {
  for (var j = 0; j < investmentAbilities.length; j++) {
    for (var k = 0; k < entrepreneurness.length; k++) {
      var label = incomeLabels[i];
      if (investmentLabels[j]) {
        label += ' + ' + investmentLabels[j];
      }
      if (entrepreneurLabels[k]) {
        label += ' + ' + entrepreneurLabels[k];
      }
      simulation.addActor({
        label: label,
        incomeMultiplier: incomes[i],
        investmentAbility: investmentAbilities[j],
        isEntrepreneur: entrepreneurness[k],
      });
    }
  }
}

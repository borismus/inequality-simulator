Inequality interactive explainer
================================

Following up a viral video: https://www.youtube.com/watch?v=QPKKQnijnsM

1. How does society become unequal?
2. How can inequality be reduced?

Closing: is inequality bad?


## What increases inequality?

1. Income inequality is not the problem. Demonstrate this through a simulation
   of just income and spending. The ratio of wealth between rich and poor
   remains constant over time.

2. We start seeing the problem with investment. Demo: add investment income as
   if net worth is being invested. Now you can see inequality increasing
   over time.

3. Now, consider that more capital means you can get more return for it. For
   example, with enough money, you can buy an apartment complex and become a
   landlord with a steady income flow.


## What reduces inequality?

1. Tax the rich more. An easy solution is to add another bracket for the ultra
   rich, for example. In the US, all income above $450K is taxed at 40%. Add
   another bracket, say at $1M. Demo: how does that change things?

2. Increase estate taxes. Two dimensions: exclusion amount and top tax rate.
   Demo: every N years, estate taxes hit.

3. Wealth taxes for folks over a certain amount in net worth. Demo: every year,
   another stage: wealth tax hit. Of course this is quite impractical because of
   tax evasion.


Minimum viable simulation of inequality
=======================================

Actors and rules over time.

Actors have properties which can be configured (income multiplier, saving
ability), and some which are set by the simulation (net worth).

Rules are executed in order on a yearly basis, apply to all actors. They consist
of equations which ultimately change the net worth of each actor. Examples: 

- Income is formulated as "+= 2 * income_multiplier", meaning that each
    year, net worth grows.
- Spending is formulated as "+= -1 * spend_habit", meaning that each year, net worth is reduced
    by some fixed amount due to cost of living.
- Investment income is modeled as "+= 0.05 * net_worth", meaning that each year,
    net worth grows by 5%.
- Wealth tax is modeled as "+= -0.01 * net_worth if 100 < net_worth", meaning
    that if net worth exceeds 100, it is reduced by 1% yearly.
- Estate tax is modeled as "+= -0.40 * net_worth if net_worth > 50 every 30 years",
    meaning that net worth is reduced by 40% but only every 30 years, and only
    if net_worth > 50.


Implementation
==============

Two-pane thing where left pane shows the actual simulation, and right pane is
the configuration of simulation, which can be hidden too. You can add/remove
rules and configure them. All rules are encloded in the URL. No backend
required.

    [Factor(Number)], [Actor.Parameter(Option)]

Actor.Parameters can also be added or removed.

The simulation is controlled by new/play/step controls on the left. Parameters
can be assigned for each actor as well.

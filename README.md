Minimum viable simulation of inequality
=======================================

Households have:
- Discretionary income
- Investment ability (effective market return rate)
- Spending habits
- Lifespan

The world has:
- Estate tax rate
- Wealth tax rate
- Inflation rate

Rules:
- Each year, households spend their discretionary income and invest what's left over.
- Their net worth (including investments) is subject to the wealth tax rate.
- It's also subject to the inflation rate (which effectively decreases their net
  worth).
- When a household reaches the end of its lifespan, it passes on its wealth to
  the next generation, modulo estate taxes.
- All taxes go to the government.

Simplest visualization:
- Time on y, going downward.
- Wealth amount on x, increasing right-ward.
- Scrollable, with latest data on top.

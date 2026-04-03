# Bot Profiles

## Easy Bot — "The Beginner"
- ~12% bluff rate, 10% challenge rate
- Plays cards it holds, targets randomly
- Exploit: bluff freely, they almost never challenge

## Medium Bot — "The Competent Player"  
- Belief tracker, ~20% bluff, ~33% challenge
- Targets highest threat, finishes 1-card players
- Exploit: challenge its counteractions (60% bluff-Contessa)

## Hard Bot — "The Strategist"
- EV-optimal with lookahead, opponent modeling
- 55% Tax, prefers Coup over Assassinate for kills
- Exploit: challenge Tax after Dukes are revealed, make unexpected challenges to break its model

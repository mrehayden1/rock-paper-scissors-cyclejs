import { Maybe } from 'tsmonad';
import xs from 'xstream';
import { Stream } from 'xstream';
import delay from 'xstream/extra/delay';

import { constant, id, randomElem } from './functions';
import { Sources, Sinks } from './interfaces'

enum Choice { Rock, Paper, Scissors }

function choiceToString(c: Choice): string {
  if (c === Choice.Rock) {
    return '✊';
  }
  else if (c === Choice.Paper) {
    return '✋';
  }
  else if (c === Choice.Scissors) {
    return '✌️';
  }

  throw new Error('Unmatched case.');
}

enum Outcome { Win, Lose, Draw }

function outcomeToString(o: Outcome): string {
  return Outcome[o];
}

function outcome(a: Choice, b: Choice): Outcome {
  if (a === b) return Outcome.Draw;

  if (a === Choice.Rock) {
    if (b === Choice.Paper) {
      return Outcome.Lose;
    }
    else if (b === Choice.Scissors) {
      return Outcome.Win;
    }
  }
  else if (a === Choice.Paper) {
    if (b === Choice.Rock) {
      return Outcome.Win;
    }
    else if (b === Choice.Scissors) {
      return Outcome.Lose;
    }
  }
  else if (a === Choice.Scissors) {
    if (b === Choice.Rock) {
      return Outcome.Lose;
    }
    else if (b === Choice.Paper) {
      return Outcome.Win;
    }
  }

  throw new Error('Unmatched case.');
}

export function App(sources : Sources) : Sinks {
  const rockClicks = sources.DOM.select('#rock').events('click');
  const paperClicks = sources.DOM.select('#paper').events('click');
  const scissorsClicks = sources.DOM.select('#scissors').events('click');

  const choice$ = xs.merge(
    rockClicks.mapTo(Choice.Rock),
    paperClicks.mapTo(Choice.Paper),
    scissorsClicks.mapTo(Choice.Scissors)
  );

  const randomChoice: Stream<Choice> = xs.of(true)
    .map(() => randomElem([Choice.Rock, Choice.Paper, Choice.Scissors]));

  const computerChoice$: Stream<Choice> = choice$.mapTo(randomChoice).flatten()
    .compose(delay(1000));

  const thinking = xs.merge(
    choice$.mapTo(true),
    computerChoice$.mapTo(false)
  ).startWith(false)

  const choices$: Stream<[Maybe<Choice>, Maybe<Choice>, boolean]> = xs.combine(
    choice$.map(Maybe.just).startWith(Maybe.nothing<Choice>()),
    computerChoice$.map(Maybe.just).startWith(Maybe.nothing<Choice>()),
    thinking
  );

  const vtree$ = choices$.map(([choice1, choice2, thinking]) => {
    const result = thinking ? 'Thinking...' : choice1
      .bind(x => choice2.lift(y => outcome(x, y)))
      .lift(outcomeToString)
      .valueOr('');

    return (
      <div>
        <button id="rock" disabled={thinking}>{choiceToString(Choice.Rock)}</button>
        <button id="paper" disabled={thinking}>{choiceToString(Choice.Paper)}</button>
        <button id="scissors" disabled={thinking}>{choiceToString(Choice.Scissors)}</button>

        <p>Your choice: {choice1.lift(choiceToString).valueOr('')}</p>
        <p>Opponent choice: {thinking ? '' : choice2.lift(choiceToString).valueOr('')}</p>
        <p>Result: {result}</p>
      </div>
    );
  });

  return {
    DOM: vtree$
  }
}

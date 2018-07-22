import { DOMSource, VNode } from '@cycle/dom'
import { Maybe } from 'tsmonad';
import xs from 'xstream';
import { Stream } from 'xstream';
import delay from 'xstream/extra/delay';

import { constant, id, randomElem } from './functions';
import { Sources, Sinks } from './interfaces'

enum Choice { Rock, Paper, Scissors }

const choices = [Choice.Rock, Choice.Paper, Choice.Scissors];

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

type ChooseSinks = {
  DOM: Stream<VNode>,
  choice$: Stream<Choice>
};

function Choose(sources: Sources): ChooseSinks {
  const rockClicks = sources.DOM.select('#rock').events('click');
  const paperClicks = sources.DOM.select('#paper').events('click');
  const scissorsClicks = sources.DOM.select('#scissors').events('click');
  const randomChoiceClicks = sources.DOM.select('#random').events('click');

  const choice$ = xs.merge(
    rockClicks.mapTo(Choice.Rock),
    paperClicks.mapTo(Choice.Paper),
    scissorsClicks.mapTo(Choice.Scissors),
    randomChoiceClicks.map(() => { return randomElem(choices) })
  );

  const vtree$ = xs.of(
    <div id="choice" key="choice">
      <div className="choices">
        <p>Player 1, choose your hand</p>
        <button id="rock">{choiceToString(Choice.Rock)}</button>
        <button id="paper">{choiceToString(Choice.Paper)}</button>
        <button id="scissors">{choiceToString(Choice.Scissors)}</button>
      </div>
      <button id="random">Choose for me</button>
    </div>
  );

  return {
    DOM: vtree$,
    choice$
  }
}

type GameSources = {
  DOM: DOMSource,
  choice$: Stream<Choice>,
  winner$: Stream<number>
};

type GameSinks = {
  DOM: Stream<VNode>,
  choices$: Stream<[Choice, Choice]>,
  nextClick$: Stream<Event>
}

function Game(sources: GameSources): GameSinks {
  const nextClick$ = sources.DOM.select('#next').events('click');

  const choices$: Stream<[Choice, Choice]> = sources.choice$
    .map(choice1 => {
      return xs.of(null).compose(delay(3000))
        .map(() => [choice1, randomElem(choices)]);
    })
    .flatten()
    .startWith([]);

  const vtree$ = xs
    .combine(
      xs.merge(choices$,sources.choice$.mapTo([])),
      sources.winner$.startWith(0)
    )
    .map(([choices, winner]) => {
      const choiceWrapperAttrs = ['choices'];

      let resultText = '3 2 1...';
      let footer = null;

      if (!choices.length) {
        choiceWrapperAttrs.push('thinking');
      }
      else {
        const [choice1, choice2] = choices;
        resultText = outcomeToString(outcome(choice1, choice2));
        if (winner) {
          footer = <div>Player {winner} wins!</div>
        }
        else {
          footer = <button id="next">Next round</button>;
        }
      }

      return (
        <div id="game" key="game">
          <div>{resultText}</div>
          <div className={choiceWrapperAttrs.join(' ')}>
            <div>
              {choiceToString(choices.length ? choices[0] : Choice.Rock)}
            </div>
            <div>
              {choiceToString(choices.length ? choices[1] : Choice.Rock)}
            </div>
          </div>
          {footer}
        </div>
      );
    });

  return {
    DOM: vtree$,
    choices$,
    nextClick$
  }
}

export function App(sources: Sources): Sinks {
  const GAMES_TO_WIN = 3;

  function renderStep(step: string, choose: VNode, game: VNode): VNode {
    if (step === 'choose') {
      return choose;
    }
    else {
      return game;
    }
  }

  function renderProgress([p1, p2]: [number, number]): VNode {
    return <div id="progress">Player 1 &mdash; {p1} / {p2} &mdash; Player 2</div>
  }

  const choose = Choose(sources);

  const winnerProxy$: Stream<number> = xs.create();

  const game = Game({
    DOM: sources.DOM,
    choice$: choose.choice$,
    winner$: winnerProxy$
  });

  const progress$: Stream<[number, number]> = game
    .choices$.fold((acc, [choice1, choice2]) => {
      const result = outcome(choice1, choice2);
      if (result === Outcome.Win) {
        acc[0]++;
      }
      else if (result === Outcome.Lose) {
        acc[1]++;
      }
      return acc;
    }, [0, 0]);

  const winner$ = progress$.filter(([p1, p2]) => p1 >= GAMES_TO_WIN || p2 >= GAMES_TO_WIN)
    .map(([p1, p2]) => p1 >= GAMES_TO_WIN ? 1 : 2);

  winnerProxy$.imitate(winner$);

  const step$ = xs.merge(
      choose.choice$.mapTo('game'),
      game.nextClick$.mapTo('choose'),
    )
    .startWith('choose');

  const vtree$ = xs
    .combine(
      progress$,
      step$,
      choose.DOM,
      game.DOM
    )
    .map(([progress, step, choose, game]) => {
      const progressVDom = renderProgress(progress);
      const stepVDom = renderStep(step, choose, game);

      return (
        <div>
          {progressVDom}
          {stepVDom}
        </div>
      );
    });

  return {
    DOM: vtree$
  }
}

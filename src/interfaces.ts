import xs from 'xstream'
import {Stream} from 'xstream'
import {DOMSource, VNode} from '@cycle/dom'

export type Sources = {
  DOM : DOMSource;
}

export type Sinks = {
  DOM : Stream<VNode>;
}

export type Component = (s : Sources) => Sinks;

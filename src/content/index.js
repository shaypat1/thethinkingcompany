import day001 from './days/day-001.json'
import day002 from './days/day-002.json'
import day003 from './days/day-003.json'
import day004 from './days/day-004.json'
import day005 from './days/day-005.json'

import fc001 from './flashcards/fc001.json'
import fc002 from './flashcards/fc002.json'
import fc003 from './flashcards/fc003.json'
import gv001 from './flashcards/gv001.json'
import pirate001 from './flashcards/pirate001.json'

import ct001 from './chimptest/ct001.json'
import sm001 from './sequencememory/sm001.json'
import vm001 from './visualmemory/vm001.json'
import cm001 from './cardmatching/cm001.json'
import mi001 from './missingitem/mi001.json'
import vb001 from './verbalmemory/vb001.json'
import bs001 from './backwardsspan/bs001.json'
import ld001 from './logicdetective/ld001.json'

const days = [day001, day002, day003, day004, day005]

const content = {
  flashcard: { fc001, fc002, fc003 },
  gravity: { gv001 },
  pirate: { pirate001 },
  chimptest: { ct001 },
  sequencememory: { sm001 },
  visualmemory: { vm001 },
  cardmatching: { cm001 },
  missingitem: { mi001 },
  verbalmemory: { vb001 },
  backwardsspan: { bs001 },
  logicdetective: { ld001 },
}

export function getDay(dayNumber) {
  return days.find((d) => d.day === dayNumber) || null
}

export function getDayCount() {
  return days.length
}

export function getContent(type, id) {
  return content[type]?.[id] || null
}

export function getDayNodes(dayNumber) {
  const day = getDay(dayNumber)
  return day ? day.nodes : []
}

export function getAllContent() {
  return content
}

export function getAllDays() {
  return days
}

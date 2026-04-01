import day001 from './days/day-001.json'
import day002 from './days/day-002.json'
import day003 from './days/day-003.json'

import fc001 from './flashcards/fc001.json'
import fc002 from './flashcards/fc002.json'
import fc003 from './flashcards/fc003.json'

const days = [day001, day002, day003]

const content = {
  flashcard: {
    fc001,
    fc002,
    fc003,
  },
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

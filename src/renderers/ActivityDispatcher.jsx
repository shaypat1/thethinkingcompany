import FlashcardRenderer from './FlashcardRenderer'
import PlaceholderRenderer from './PlaceholderRenderer'
import ChimpTestRenderer from './ChimpTestRenderer'
import SequenceMemoryRenderer from './SequenceMemoryRenderer'
import VisualMemoryRenderer from './VisualMemoryRenderer'
import CardMatchingRenderer from './CardMatchingRenderer'
import MissingItemRenderer from './MissingItemRenderer'
import VerbalMemoryRenderer from './VerbalMemoryRenderer'
import BackwardsSpanRenderer from './BackwardsSpanRenderer'

export default function ActivityDispatcher({ type, content, label }) {
  switch (type) {
    case 'flashcard':
      return <FlashcardRenderer questions={content.questions} timeLimit={content.timeLimit} />
    case 'chimptest':
      return <ChimpTestRenderer />
    case 'sequencememory':
      return <SequenceMemoryRenderer />
    case 'visualmemory':
      return <VisualMemoryRenderer />
    case 'cardmatching':
      return <CardMatchingRenderer />
    case 'missingitem':
      return <MissingItemRenderer />
    case 'verbalmemory':
      return <VerbalMemoryRenderer />
    case 'backwardsspan':
      return <BackwardsSpanRenderer />
    default:
      return <PlaceholderRenderer label={label} />
  }
}

import FlashcardRenderer from './FlashcardRenderer'
import GravityRenderer from './GravityRenderer'
import PirateRenderer from './PirateRenderer'
import PlaceholderRenderer from './PlaceholderRenderer'
import ChimpTestRenderer from './ChimpTestRenderer'
import SequenceMemoryRenderer from './SequenceMemoryRenderer'
import VisualMemoryRenderer from './VisualMemoryRenderer'
import CardMatchingRenderer from './CardMatchingRenderer'
import MissingItemRenderer from './MissingItemRenderer'
import VerbalMemoryRenderer from './VerbalMemoryRenderer'
import BackwardsSpanRenderer from './BackwardsSpanRenderer'
import LogicDetectiveRenderer from './LogicDetectiveRenderer'

export default function ActivityDispatcher({ type, content, label }) {
  switch (type) {
    case 'flashcard':
      return <FlashcardRenderer questions={content.questions} timeLimit={content.timeLimit} />
    case 'gravity':
      return <GravityRenderer questions={content.questions} />
    case 'pirate':
      return <PirateRenderer />
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
    case 'logicdetective':
      return <LogicDetectiveRenderer cases={content.cases} />
    default:
      return <PlaceholderRenderer label={label} />
  }
}

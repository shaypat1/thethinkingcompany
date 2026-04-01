import FlashcardRenderer from './FlashcardRenderer'
import GravityRenderer from './GravityRenderer'
import PirateRenderer from './PirateRenderer'
import PlaceholderRenderer from './PlaceholderRenderer'

export default function ActivityDispatcher({ type, content, label }) {
  switch (type) {
    case 'flashcard':
      return <FlashcardRenderer questions={content.questions} timeLimit={content.timeLimit} />
    case 'gravity':
      return <GravityRenderer questions={content.questions} />
    case 'pirate':
      return <PirateRenderer />
    default:
      return <PlaceholderRenderer label={label} />
  }
}

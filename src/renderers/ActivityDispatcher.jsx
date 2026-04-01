import FlashcardRenderer from './FlashcardRenderer'
import GravityRenderer from './GravityRenderer'
import PlaceholderRenderer from './PlaceholderRenderer'

export default function ActivityDispatcher({ type, content, label }) {
  switch (type) {
    case 'flashcard':
      return <FlashcardRenderer questions={content.questions} timeLimit={content.timeLimit} />
    case 'gravity':
      return <GravityRenderer questions={content.questions} />
    default:
      return <PlaceholderRenderer label={label} />
  }
}

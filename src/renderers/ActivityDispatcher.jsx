import FlashcardRenderer from './FlashcardRenderer'
import PlaceholderRenderer from './PlaceholderRenderer'

export default function ActivityDispatcher({ type, content, label }) {
  switch (type) {
    case 'flashcard':
      return <FlashcardRenderer questions={content.questions} timeLimit={content.timeLimit} />
    default:
      return <PlaceholderRenderer label={label} />
  }
}

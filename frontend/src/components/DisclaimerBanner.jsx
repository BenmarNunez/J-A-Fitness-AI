export default function DisclaimerBanner({ message }) {
  return (
    <div className="disclaimer">
      <span className="shrink-0 mt-0.5">⚠️</span>
      <span>{message || 'AI-generated content is for guidance only and does not replace professional medical or nutritionist advice.'}</span>
    </div>
  )
}

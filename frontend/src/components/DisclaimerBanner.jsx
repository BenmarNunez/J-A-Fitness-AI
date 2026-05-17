export default function DisclaimerBanner({ message }) {
  return (
    <div className="bg-warn/10 border border-warn/40 text-warn text-sm rounded-lg px-4 py-3 mb-4">
      ⚠️ {message || 'AI-generated content is for guidance only and does not replace professional medical or nutritionist advice.'}
    </div>
  )
}

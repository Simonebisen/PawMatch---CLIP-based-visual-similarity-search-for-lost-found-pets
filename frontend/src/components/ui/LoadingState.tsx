export default function LoadingState({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-stone-500">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-stone-300 border-t-amber-600" />
      <span>{message}</span>
    </div>
  )
}

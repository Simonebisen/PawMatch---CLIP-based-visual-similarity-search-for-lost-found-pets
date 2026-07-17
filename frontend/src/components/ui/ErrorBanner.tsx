export default function ErrorBanner({ message }: { message: string }) {
  return <p className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{message}</p>
}

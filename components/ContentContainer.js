export default function ContentContainer({ children }) {
  return (
    <div className="p-6 bg-base-100">
      <div className="max-w-full mx-auto">
        {children}
      </div>
    </div>
  )
} 
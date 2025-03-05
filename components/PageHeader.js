export default function PageHeader({ title, actions }) {
  return (
    <div className="bg-base-100 border-b border-base-200">
      <div className="flex justify-between items-center p-6">
        <h1 className="text-3xl font-bold text-base-content">{title}</h1>
        {actions && <div className="flex space-x-3">{actions}</div>}
      </div>
    </div>
  )
} 
export default function Navbar({ onLoginClick }) {
  return (
    <nav className="flex justify-between items-center py-6 px-8">
      <div className="text-xl font-medium text-blue-600">{process.env.NEXT_PUBLIC_BRAND_NAME}</div>
      <div className="flex items-center space-x-8">
        <a href="#" className="text-gray-600 hover:text-gray-900">Home</a>
        <a href="#" className="text-gray-600 hover:text-gray-900">Features</a>
        <a href="#" className="text-gray-600 hover:text-gray-900">About</a>
        <button 
          onClick={onLoginClick}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Login
        </button>
      </div>
    </nav>
  );
} 
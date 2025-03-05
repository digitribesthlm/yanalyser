export default function Footer() {
  return (
    <footer className="border-t border-gray-200 mt-20">
      <div className="container mx-auto px-8 py-12">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="text-gray-600">
            © 2024 {process.env.NEXT_PUBLIC_BRAND_NAME}. All rights reserved.
          </div>
          <div className="flex space-x-6 mt-4 md:mt-0">
            <a href="#" className="text-gray-600 hover:text-gray-900">About us</a>
            <a href="#" className="text-gray-600 hover:text-gray-900">Contact</a>
            <a href="#" className="text-gray-600 hover:text-gray-900">Privacy</a>
            <a href="#" className="text-gray-600 hover:text-gray-900">Terms</a>
          </div>
        </div>
      </div>
    </footer>
  );
} 
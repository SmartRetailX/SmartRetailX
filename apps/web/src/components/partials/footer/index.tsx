export function Footer() {
  return (
    <footer className="bg-background border-t">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-8">
          <div>
            <h3 className="font-bold text-lg mb-4 text-gray-900">Get to Know Us</h3>
            <ul className="space-y-2 text-gray-600 text-sm">
              <li>
                <a href="/" className="hover:text-primary">
                  About Us
                </a>
              </li>
              <li>
                <a href="/" className="hover:text-primary">
                  Careers
                </a>
              </li>
              <li>
                <a href="/" className="hover:text-primary">
                  Corporate Information
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="font-bold text-lg mb-4 text-gray-900">Help & Support</h3>
            <ul className="space-y-2 text-gray-600 text-sm">
              <li>
                <a href="/" className="hover:text-primary">
                  Contact Us
                </a>
              </li>
              <li>
                <a href="/" className="hover:text-primary">
                  FAQ
                </a>
              </li>
              <li>
                <a href="/" className="hover:text-primary">
                  Returns & Refunds
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="font-bold text-lg mb-4 text-gray-900">Policies</h3>
            <ul className="space-y-2 text-gray-600 text-sm">
              <li>
                <a href="/" className="hover:text-primary">
                  Privacy Policy
                </a>
              </li>
              <li>
                <a href="/" className="hover:text-primary">
                  Terms of Conditions
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="font-bold text-lg mb-4 text-gray-900">Connect with Us</h3>
            <div className="flex gap-4">
              <div className="h-10 w-10 bg-gray-100 rounded-full flex items-center justify-center hover:bg-primary hover:text-white transition-colors cursor-pointer text-gray-600">
                FB
              </div>
              <div className="h-10 w-10 bg-gray-100 rounded-full flex items-center justify-center hover:bg-primary hover:text-white transition-colors cursor-pointer text-gray-600">
                IG
              </div>
              <div className="h-10 w-10 bg-gray-100 rounded-full flex items-center justify-center hover:bg-primary hover:text-white transition-colors cursor-pointer text-gray-600">
                TW
              </div>
            </div>
          </div>
        </div>
        <div className="pt-8 border-t text-center text-sm text-gray-500">
          <p>© 2026 Smart Retail X. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}

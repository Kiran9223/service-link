import { Link } from 'react-router-dom'
import { Zap } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-white py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          <div>
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-blue-600 rounded-xl flex items-center justify-center">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold">ServiceLink</span>
            </div>
            <p className="text-gray-400 text-sm">Connecting you with trusted local service providers instantly.</p>
          </div>
          <div>
            <h4 className="font-bold mb-4">For Customers</h4>
            <ul className="space-y-2 text-gray-400 text-sm">
              <li><Link to="/services" className="hover:text-white transition">Browse Services</Link></li>
              <li><Link to="/" className="hover:text-white transition">Try AI Booking</Link></li>
              <li><Link to="/dashboard" className="hover:text-white transition">My Bookings</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold mb-4">For Providers</h4>
            <ul className="space-y-2 text-gray-400 text-sm">
              <li><Link to="/register" className="hover:text-white transition">Become a Provider</Link></li>
              <li><Link to="/provider/dashboard" className="hover:text-white transition">Provider Dashboard</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold mb-4">Built At</h4>
            <p className="text-gray-400 text-sm">California State University, Fullerton</p>
            <p className="text-gray-400 text-sm mt-1">Master's Thesis Project</p>
          </div>
        </div>
        <div className="border-t border-gray-800 pt-8 text-center text-gray-400 text-sm">
          <p>&copy; 2025 ServiceLink. All rights reserved. Built with ❤️ at CSUF</p>
        </div>
      </div>
    </footer>
  )
}

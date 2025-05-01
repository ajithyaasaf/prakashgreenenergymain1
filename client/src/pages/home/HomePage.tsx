import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import logoImage from "@/assets/logo.png";

export default function HomePage() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900 flex flex-col">
      {/* Navigation */}
      <header className="bg-white dark:bg-slate-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <img
              src={logoImage}
              alt="Prakash Green Energy Logo"
              className="h-8 w-auto"
            />
          </div>

          <div className="flex items-center space-x-4">
            {isAuthenticated ? (
              <Link to="/dashboard">
                <Button variant="default">Go to Dashboard</Button>
              </Link>
            ) : (
              <>
                <Link to="/auth/login">
                  <Button variant="ghost">Login</Button>
                </Link>
                <Link to="/auth/register">
                  <Button variant="default">Sign Up</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-4xl font-bold text-slate-900 dark:text-white sm:text-5xl">
              Powering India with Smart Solar Solutions
            </h1>
            <p className="mt-6 text-xl text-slate-600 dark:text-slate-300">
              Prakash Energy is dedicated to providing affordable, sustainable
              solar energy solutions for homes and businesses across India.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
              <Link to={isAuthenticated ? "/dashboard" : "/auth/login"}>
                <Button size="lg" className="w-full sm:w-auto">
                  Get Started
                  <i className="ri-arrow-right-line ml-2"></i>
                </Button>
              </Link>
              <Button variant="outline" size="lg" className="w-full sm:w-auto">
                Learn More
              </Button>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="py-20 bg-slate-50 dark:bg-slate-800/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-slate-900 dark:text-white">
                Solar Benefits
              </h2>
              <p className="mt-4 text-lg text-slate-600 dark:text-slate-300">
                Discover why solar energy is the smart choice for your energy
                needs
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-white dark:bg-slate-800 rounded-xl p-8 shadow-sm">
                <div className="w-12 h-12 rounded-lg bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 flex items-center justify-center mb-5">
                  <i className="ri-coins-line text-2xl"></i>
                </div>
                <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">
                  Cost Savings
                </h3>
                <p className="text-slate-600 dark:text-slate-300">
                  Reduce your electricity bills by up to 70% by harnessing the
                  power of the sun.
                </p>
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-xl p-8 shadow-sm">
                <div className="w-12 h-12 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 flex items-center justify-center mb-5">
                  <i className="ri-plant-line text-2xl"></i>
                </div>
                <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">
                  Eco-Friendly
                </h3>
                <p className="text-slate-600 dark:text-slate-300">
                  Solar power is clean, renewable, and helps reduce your carbon
                  footprint.
                </p>
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-xl p-8 shadow-sm">
                <div className="w-12 h-12 rounded-lg bg-secondary-100 dark:bg-secondary-900/30 text-secondary-600 dark:text-secondary-400 flex items-center justify-center mb-5">
                  <i className="ri-home-gear-line text-2xl"></i>
                </div>
                <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">
                  Energy Independence
                </h3>
                <p className="text-slate-600 dark:text-slate-300">
                  Protect yourself from rising utility costs and power outages
                  with your own energy source.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Call to Action */}
        <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          <div className="bg-primary-500 dark:bg-primary-600 rounded-2xl p-8 md:p-12 text-center">
            <h2 className="text-3xl font-bold text-white mb-4">
              Ready to Harness the Power of Solar?
            </h2>
            <p className="text-primary-100 mb-8 max-w-2xl mx-auto">
              Join thousands of satisfied customers who have switched to clean,
              affordable solar energy with Prakash Energy.
            </p>
            <Link to={isAuthenticated ? "/dashboard" : "/auth/register"}>
              <Button size="lg" variant="secondary">
                Get Started Today
              </Button>
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-slate-800 dark:bg-slate-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-2 mb-6 md:mb-0">
              <img
                src={logoImage}
                alt="Prakash Green Energy Logo"
                className="h-8 w-auto"
              />
              <span className="text-lg font-semibold">
                Prakash Green Energy
              </span>
            </div>

            <div className="flex flex-wrap justify-center md:justify-end gap-6">
              <a href="#" className="text-slate-300 hover:text-white">
                About Us
              </a>
              <a href="#" className="text-slate-300 hover:text-white">
                Services
              </a>
              <a href="#" className="text-slate-300 hover:text-white">
                Testimonials
              </a>
              <a href="#" className="text-slate-300 hover:text-white">
                Contact
              </a>
            </div>
          </div>

          <div className="mt-8 pt-8 border-t border-slate-700 text-center md:text-left">
            <p className="text-slate-400">
              &copy; {new Date().getFullYear()} Prakash Energy. All rights
              reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

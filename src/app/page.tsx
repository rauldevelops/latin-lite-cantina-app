import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 to-white">
      {/* Hero Section */}
      <section className="max-w-6xl mx-auto px-4 py-16 sm:py-24">
        <div className="text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6">
            Fresh Latin-Inspired Meals
            <span className="block text-latin-red">Delivered to Your Door</span>
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
            Enjoy delicious, home-cooked Latin meals delivered fresh to you every weekday.
            Choose your favorites from our weekly rotating menu.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/menu"
              className="px-8 py-3 bg-latin-red text-white font-semibold rounded-full hover:bg-latin-orange uppercase transition-colors"
            >
              View This Week&apos;s Menu
            </Link>
            <Link
              href="/order"
              className="px-8 py-3 bg-white text-latin-red font-semibold rounded-full border-2 border-latin-red hover:bg-orange-50 uppercase transition-colors"
            >
              Start Your Order
            </Link>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-white py-16">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
            How It Works
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-latin-red">1</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Browse the Menu
              </h3>
              <p className="text-gray-600">
                Check out our weekly rotating menu with fresh Latin-inspired entrees and sides.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-latin-red">2</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Build Your Order
              </h3>
              <p className="text-gray-600">
                Create your completas (1 entree + 3 sides) for at least 3 days of the week.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-latin-red">3</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Enjoy Fresh Meals
              </h3>
              <p className="text-gray-600">
                We deliver your meals fresh to your door Monday through Friday.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-16">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
            Simple Pricing
          </h2>
          <div className="max-w-md mx-auto bg-white rounded-2xl shadow-lg overflow-hidden">
            <div className="bg-latin-red text-white p-6 text-center">
              <h3 className="text-2xl font-bold">Completa</h3>
              <p className="text-orange-100">1 Entree + 3 Sides</p>
            </div>
            <div className="p-6 text-center">
              <div className="text-4xl font-bold text-gray-900 mb-4">
                $12<span className="text-lg font-normal text-gray-500">/meal</span>
              </div>
              <ul className="text-left text-gray-600 space-y-2 mb-6">
                <li className="flex items-center gap-2">
                  <span className="text-latin-red">&#10003;</span>
                  Fresh, home-cooked meals
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-latin-red">&#10003;</span>
                  Weekly rotating menu
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-latin-red">&#10003;</span>
                  Delivery or pickup available
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-latin-red">&#10003;</span>
                  Add extra entrees or sides anytime
                </li>
              </ul>
              <Link
                href="/order"
                className="block w-full py-3 bg-latin-red text-white font-semibold rounded-full hover:bg-latin-orange uppercase transition-colors"
              >
                Order Now
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <p className="text-xl font-bold text-latin-red mb-2">LatinLite Cantina</p>
          <p className="text-gray-400">Fresh Latin-inspired meals delivered to your door</p>
        </div>
      </footer>
    </div>
  );
}

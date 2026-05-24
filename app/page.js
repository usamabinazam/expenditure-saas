import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-blue-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="text-xl font-bold text-emerald-700">📊 Expenditure Generator</div>
          <div className="flex gap-3">
            <Link href="/login" className="px-4 py-2 text-emerald-700 hover:underline">
              Login
            </Link>
            <Link href="/signup" className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded">
              Sign Up
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-gray-800 mb-4">
            Monthly Expenditure Made Easy
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            KPK Government Schools ke liye Reconciliation Statement banane ka 
            sabse aasaan tareeqa. 2 ghante ka kaam 5 minute mein.
          </p>
          <Link 
            href="/signup" 
            className="inline-block px-8 py-4 bg-emerald-600 hover:bg-emerald-700 text-white text-lg font-semibold rounded-lg shadow-lg"
          >
            Free Trial Start Karein →
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-4xl mb-3">⚡</div>
            <h3 className="font-bold text-lg mb-2">Lightning Fast</h3>
            <p className="text-gray-600 text-sm">
              Sirf is mahine ka data daalein - previous, total, sab automatic calculate hota hai.
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-4xl mb-3">📄</div>
            <h3 className="font-bold text-lg mb-2">Government Format</h3>
            <p className="text-gray-600 text-sm">
              Exact same format jo SDEO office ko chahiye. Print karein aur jama karwa dein.
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-4xl mb-3">🔒</div>
            <h3 className="font-bold text-lg mb-2">Secure & Private</h3>
            <p className="text-gray-600 text-sm">
              Tumhara data sirf tumhara hai. Encrypted storage, no sharing.
            </p>
          </div>
        </div>
      </main>

      <footer className="text-center text-gray-500 text-sm py-8">
        Built for KPK Government Schools 🇵🇰
      </footer>
    </div>
  );
}

import Head from 'next/head'

export default function Home() {
  return (
    <>
      <Head>
        <title>Topic Creation</title>
        <meta name="description" content="Topic Creation App" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="min-h-screen bg-base-200">
        {/* Navbar */}
        <div className="navbar bg-base-100 shadow-lg mb-8">
          <div className="flex-1">
            <a className="btn btn-ghost normal-case text-xl">Topic Creation</a>
          </div>
          <div className="flex-none">
            <button className="btn btn-square btn-ghost">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="inline-block w-5 h-5 stroke-current"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
            </button>
          </div>
        </div>

        {/* Main Content */}
        <main className="container mx-auto px-4">
          <div className="hero bg-base-100 rounded-lg shadow-xl">
            <div className="hero-content text-center">
              <div className="max-w-md">
                <h1 className="text-5xl font-bold">Topic Creation</h1>
                <p className="py-6">Create and manage your topics with ease.</p>
                <button className="btn btn-primary">Get Started</button>
              </div>
            </div>
          </div>

          {/* Feature Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 my-8">
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <h2 className="card-title">Create Topics</h2>
                <p>Easily create new topics for discussion</p>
              </div>
            </div>
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <h2 className="card-title">Manage Content</h2>
                <p>Organize and manage your topic content</p>
              </div>
            </div>
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <h2 className="card-title">Collaborate</h2>
                <p>Work together with your team</p>
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  )
} 
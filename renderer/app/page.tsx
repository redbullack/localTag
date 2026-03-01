export default function Home() {
    return (
        <main className="flex min-h-screen flex-col items-center justify-center p-24 text-center">
            <h1 className="mb-4 bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-5xl font-bold text-transparent">
                LocalTag
            </h1>
            <p className="text-lg text-gray-300">
                Tag-based File Organizer (Next.js + Electron + SQLite + Tailwind)
            </p>
        </main>
    );
}

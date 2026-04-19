import { Link } from "react-router";

export function WireframeIndex() {
  const screens = [
    { name: "Welcome Screen", path: "/welcome" },
    { name: "User Type Selection", path: "/user-type" },
    { name: "Profile: Name", path: "/profile/name" },
    { name: "Profile: Age", path: "/profile/age" },
    { name: "Profile: Avatar", path: "/profile/avatar" },
    { name: "Assessment Screen", path: "/assessment" },
    { name: "Resume Screen", path: "/resume" },
    { name: "Animation Screen", path: "/animation" },
    { name: "Pronunciation Screen", path: "/pronunciation" },
    { name: "Example Words Screen", path: "/example-words" },
    { name: "Game Screen (Multi-State)", path: "/game" },
    { name: "Tracing Screen", path: "/tracing" },
    { name: "Reward Screen", path: "/reward" },
    { name: "Transition Screen", path: "/transition" },
  ];

  return (
    <div className="min-h-screen bg-[#F7F6F2] p-12">
      <div className="max-w-6xl mx-auto">
        <div className="mb-12">
          <h1 className="text-6xl font-bold text-gray-800 mb-4">
            Akshara-Flow Wireframes
          </h1>
          <p className="text-2xl text-gray-600 mb-6 tracking-wide">
            Educational app for dyslexic children (ages 5-10) learning Hindi reading and writing
          </p>
          <div className="flex gap-4 text-lg text-gray-600">
            <span className="bg-white px-4 py-2 rounded-lg border-2 border-gray-300">
              🎯 No Scrolling
            </span>
            <span className="bg-white px-4 py-2 rounded-lg border-2 border-gray-300">
              ✨ Linear Flow
            </span>
            <span className="bg-white px-4 py-2 rounded-lg border-2 border-gray-300">
              🧠 Low Cognitive Load
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {screens.map((screen, index) => (
            <Link
              key={screen.path}
              to={screen.path}
              className="bg-white p-8 rounded-2xl border-2 border-gray-300 hover:border-[#4A90E2] hover:shadow-lg transition-all group"
            >
              <div className="text-sm text-gray-500 mb-2">Screen {index + 1}</div>
              <h2 className="text-2xl font-medium text-gray-800 tracking-wide group-hover:text-[#4A90E2] transition-colors">
                {screen.name}
              </h2>
            </Link>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-8 bg-white rounded-2xl border-2 border-gray-300">
            <h3 className="text-3xl font-bold text-gray-800 mb-6">Design Principles</h3>
            <ul className="space-y-4 text-xl text-gray-700">
              <li className="flex items-start gap-3">
                <span className="text-2xl">✓</span>
                <span>No scrolling - everything fits in viewport</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-2xl">✓</span>
                <span>One screen = one task</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-2xl">✓</span>
                <span>Maximum 2 interactive elements per screen</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-2xl">✓</span>
                <span>Large elements with clear hierarchy</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-2xl">✓</span>
                <span>Minimal cognitive load for dyslexic learners</span>
              </li>
            </ul>
          </div>

          <div className="p-8 bg-white rounded-2xl border-2 border-gray-300">
            <h3 className="text-3xl font-bold text-gray-800 mb-6">Design System</h3>
            <div className="space-y-4">
              <div>
                <p className="text-lg font-medium text-gray-700 mb-2">Colors</p>
                <div className="flex gap-3">
                  <div className="flex-1 h-16 bg-[#F7F6F2] border-2 border-gray-300 rounded-lg flex items-center justify-center text-sm">
                    Background
                  </div>
                  <div className="flex-1 h-16 bg-[#4A90E2] rounded-lg flex items-center justify-center text-sm text-white">
                    Primary
                  </div>
                  <div className="flex-1 h-16 bg-[#4CAF50] rounded-lg flex items-center justify-center text-sm text-white">
                    Success
                  </div>
                </div>
              </div>
              <div>
                <p className="text-lg font-medium text-gray-700 mb-2">Typography</p>
                <p className="text-base text-gray-600">
                  Font: <span className="font-bold">Lexend</span> (dyslexia-friendly)
                  <br />
                  Minimum size: 18px
                  <br />
                  Increased letter spacing
                </p>
              </div>
              <div>
                <p className="text-lg font-medium text-gray-700 mb-2">Interaction</p>
                <p className="text-base text-gray-600">
                  Primary: Tap/Click
                  <br />
                  Feedback: &lt;100ms
                  <br />
                  Animations: 300ms (subtle)
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 p-8 bg-[#4A90E2] text-white rounded-2xl">
          <h3 className="text-3xl font-bold mb-4">Key Features</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-lg">
            <div>• Multisensory learning (visual + audio + touch)</div>
            <div>• Automatic progression and hints</div>
            <div>• Letter confusion reduction</div>
            <div>• Confidence building through success</div>
            <div>• Progressive difficulty adaptation</div>
            <div>• Immediate positive feedback</div>
          </div>
        </div>
      </div>
    </div>
  );
}
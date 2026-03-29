import { useAuth } from "../context/AuthContext";
import {
  UserCircle,
  Settings,
  HelpCircle,
  ShieldCheck,
  LogOut,
  ChevronRight,
  Info,
  FileText,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function More() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const sections = [
    {
      title: "Account",
      items: [
        {
          name: "Profile Settings",
          icon: UserCircle,
          color: "text-blue-600",
          bg: "bg-blue-50",
        },
        {
          name: "Security",
          icon: ShieldCheck,
          color: "text-green-600",
          bg: "bg-green-50",
        },
      ],
    },
    {
      title: "School",
      items: [
        {
          name: "School Information",
          icon: Info,
          color: "text-indigo-600",
          bg: "bg-indigo-50",
        },
        {
          name: "Academic Calendar",
          icon: Settings,
          color: "text-orange-600",
          bg: "bg-orange-50",
        },
        {
          name: "Reports",
          icon: FileText,
          color: "text-purple-600",
          bg: "bg-purple-50",
        },
      ],
    },
    {
      title: "Support",
      items: [
        {
          name: "Help & FAQ",
          icon: HelpCircle,
          color: "text-gray-600",
          bg: "bg-gray-50",
        },
      ],
    },
  ];

  return (
    <div className="space-y-8">
      {/* Profile Header */}
      <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-gray-100 flex items-center space-x-4">
        <div className="h-20 w-20 rounded-3xl bg-indigo-600 flex items-center justify-center text-white text-3xl font-bold shadow-lg shadow-indigo-100">
          {profile?.full_name?.charAt(0) || "U"}
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            {profile?.full_name}
          </h2>
          <p className="text-sm text-gray-500 font-medium capitalize">
            {profile?.role} Account
          </p>
          <p className="text-xs text-indigo-600 font-bold mt-1">
            View Public Profile
          </p>
        </div>
      </div>

      {/* Menu Sections */}
      <div className="space-y-6">
        {sections.map((section) => (
          <div key={section.title}>
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 ml-4">
              {section.title}
            </h3>
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
              {section.items.map((item, idx) => (
                <button
                  key={item.name}
                  className={`w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-all ${
                    idx !== section.items.length - 1
                      ? "border-b border-gray-50"
                      : ""
                  }`}
                >
                  <div className="flex items-center">
                    <div
                      className={`h-10 w-10 rounded-xl ${item.bg} flex items-center justify-center ${item.color} mr-4`}
                    >
                      <item.icon className="h-5 w-5" />
                    </div>
                    <span className="font-bold text-gray-700">{item.name}</span>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-300" />
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Logout Button */}
      <button
        onClick={handleSignOut}
        className="w-full flex items-center justify-center p-5 bg-red-50 text-red-600 rounded-3xl font-bold hover:bg-red-100 transition-all active:scale-95 border border-red-100"
      >
        <LogOut className="h-5 w-5 mr-2" />
        Sign Out of Account
      </button>

      <div className="text-center pb-8">
        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
          The Enlightened Academy v1.0.0
        </p>
        <p className="text-[10px] text-gray-300 mt-1">
          Made with ❤️ for rural education
        </p>
      </div>
    </div>
  );
}

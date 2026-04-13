import { SignUp } from "@clerk/nextjs";

export default function Page() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-[#0A0A0A]">
      <SignUp
        fallbackRedirectUrl="/projects"
        appearance={{
          elements: {
            formButtonPrimary: "bg-blue-600 hover:bg-blue-700 text-sm normal-case",
            card: "bg-[#111111] border border-gray-800",
            headerTitle: "text-white",
            headerSubtitle: "text-gray-400",
            socialButtonsBlockButton: "bg-[#1A1A1A] border-gray-800 text-white hover:bg-[#222222]",
            socialButtonsBlockButtonText: "text-white",
            dividerLine: "bg-gray-800",
            dividerText: "text-gray-500",
            formFieldLabel: "text-gray-400",
            formFieldInput: "bg-[#0A0A0A] border-gray-800 text-white",
            footerActionText: "text-gray-400",
            footerActionLink: "text-blue-500 hover:text-blue-400",
          },
        }}
      />
    </div>
  );
}

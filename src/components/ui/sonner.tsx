"use client"

import {
  CircleCheck,
  Info,
  LoaderCircle,
  OctagonX,
  TriangleAlert,
} from "lucide-react"
import { useTheme } from "next-themes"
import { Toaster as Sonner } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position="top-right"
      visibleToasts={3}
      richColors
      duration={4000}
      icons={{
        success: <CircleCheck className="h-5 w-5" />,
        info: <Info className="h-5 w-5" />,
        warning: <TriangleAlert className="h-5 w-5" />,
        error: <OctagonX className="h-5 w-5" />,
        loading: <LoaderCircle className="h-5 w-5 animate-spin" />,
      }}
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-0 group-[.toaster]:shadow-xl group-[.toaster]:rounded-xl",
          description: "group-[.toast]:text-white group-[.toast]:opacity-90",
          actionButton:
            "group-[.toast]:bg-white group-[.toast]:text-foreground group-[.toast]:hover:bg-white/90",
          cancelButton:
            "group-[.toast]:bg-white/20 group-[.toast]:text-white group-[.toast]:hover:bg-white/30",
          success: "group-[.toast]:bg-emerald-500 group-[.toast]:text-white",
          error: "group-[.toast]:bg-red-500 group-[.toast]:text-white",
          warning: "group-[.toast]:bg-amber-500 group-[.toast]:text-white",
          info: "group-[.toast]:bg-blue-500 group-[.toast]:text-white",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }

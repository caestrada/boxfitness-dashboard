"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { PanelLeft } from "lucide-react"
import { Slot } from "radix-ui"

import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { useMobile } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"

const SIDEBAR_COOKIE_NAME = "boxfitness:sidebar_state"
const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 30
const SIDEBAR_WIDTH = "18rem"
const SIDEBAR_WIDTH_MOBILE = "18rem"

type SidebarContextValue = {
  isMobile: boolean
  open: boolean
  setOpen: (open: boolean) => void
  openMobile: boolean
  setOpenMobile: (openMobile: boolean) => void
  toggleSidebar: () => void
}

const SidebarContext = React.createContext<SidebarContextValue | null>(null)

function useSidebar() {
  const context = React.useContext(SidebarContext)

  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider.")
  }

  return context
}

function SidebarProvider({
  defaultOpen = true,
  open: openProp,
  onOpenChange,
  style,
  className,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  defaultOpen?: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
}) {
  const isMobile = useMobile()
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen)
  const [openMobile, setOpenMobile] = React.useState(false)
  const open = openProp ?? uncontrolledOpen

  const setOpen = (nextOpen: boolean) => {
    if (onOpenChange) {
      onOpenChange(nextOpen)
    } else {
      setUncontrolledOpen(nextOpen)
    }

    document.cookie = `${SIDEBAR_COOKIE_NAME}=${nextOpen}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}`
  }

  const toggleSidebar = () => {
    if (isMobile) {
      setOpenMobile((currentOpen) => !currentOpen)
      return
    }

    setOpen(!open)
  }

  return (
    <SidebarContext.Provider
      value={{
        isMobile,
        open,
        setOpen,
        openMobile,
        setOpenMobile,
        toggleSidebar,
      }}
    >
      <div
        data-slot="sidebar-wrapper"
        style={
          {
            "--sidebar-width": SIDEBAR_WIDTH,
            "--sidebar-width-mobile": SIDEBAR_WIDTH_MOBILE,
            ...style,
          } as React.CSSProperties
        }
        className={cn("group/sidebar-wrapper flex min-h-svh w-full", className)}
        {...props}
      >
        {children}
      </div>
    </SidebarContext.Provider>
  )
}

function Sidebar({
  side = "left",
  variant = "inset",
  collapsible = "offcanvas",
  className,
  children,
  ...props
}: React.ComponentProps<"aside"> & {
  side?: "left" | "right"
  variant?: "sidebar" | "floating" | "inset"
  collapsible?: "offcanvas" | "none"
}) {
  const { isMobile, open, openMobile, setOpenMobile } = useSidebar()

  if (isMobile) {
    return (
      <>
        <div
          aria-hidden="true"
          className={cn(
            "fixed inset-0 z-40 bg-slate-950/20 transition-opacity duration-200 md:hidden",
            openMobile ? "opacity-100" : "pointer-events-none opacity-0"
          )}
          onClick={() => setOpenMobile(false)}
        />

        <aside
          data-slot="sidebar"
          data-mobile="true"
          data-side={side}
          data-state={openMobile ? "open" : "closed"}
          className={cn(
            "fixed inset-y-0 z-50 flex w-[var(--sidebar-width-mobile)] max-w-[calc(100vw-1.25rem)] p-3 transition-transform duration-300 ease-out md:hidden",
            side === "left" ? "left-0" : "right-0",
            openMobile
              ? "translate-x-0"
              : side === "left"
                ? "-translate-x-full"
                : "translate-x-full",
            className
          )}
          {...props}
        >
          <div className="flex h-full w-full flex-col overflow-hidden rounded-[2rem] border border-sidebar-border/80 bg-sidebar shadow-[0_28px_90px_-44px_rgba(15,23,42,0.28)] backdrop-blur-2xl">
            {children}
          </div>
        </aside>
      </>
    )
  }

  return (
    <div
      data-slot="sidebar-gap"
      data-state={open ? "open" : "closed"}
      data-collapsible={!open && collapsible === "offcanvas" ? "offcanvas" : ""}
      data-side={side}
      data-variant={variant}
      className={cn(
        "relative hidden shrink-0 transition-[width] duration-300 ease-out md:sticky md:top-0 md:block md:h-svh md:self-start",
        collapsible === "none" || open ? "w-[var(--sidebar-width)]" : "w-0"
      )}
    >
      <aside
        data-slot="sidebar"
        data-state={open ? "open" : "closed"}
        data-side={side}
        data-variant={variant}
        className={cn(
          "absolute inset-y-0 z-30 hidden w-[var(--sidebar-width)] p-4 transition-transform duration-300 ease-out md:flex",
          side === "left" ? "left-0" : "right-0",
          collapsible === "offcanvas" &&
            !open &&
            (side === "left" ? "-translate-x-full" : "translate-x-full"),
          className
        )}
        {...props}
      >
        <div
          className={cn(
            "flex h-full w-full flex-col overflow-hidden rounded-[2rem] border border-sidebar-border/80 bg-sidebar shadow-[0_24px_72px_-44px_rgba(15,23,42,0.24)] backdrop-blur-2xl",
            variant === "floating" && "bg-card/90",
            variant === "sidebar" && "rounded-none border-y-0 border-l-0 border-r border-sidebar-border shadow-none",
            variant === "inset" && "bg-sidebar"
          )}
        >
          {children}
        </div>
      </aside>
    </div>
  )
}

function SidebarTrigger({
  className,
  onClick,
  ...props
}: React.ComponentProps<typeof Button>) {
  const { toggleSidebar } = useSidebar()

  return (
    <Button
      data-slot="sidebar-trigger"
      variant="ghost"
      size="icon-lg"
      className={cn(
        "surface-control rounded-full text-muted-foreground hover:text-foreground",
        className
      )}
      onClick={(event) => {
        onClick?.(event)
        toggleSidebar()
      }}
      {...props}
    >
      <PanelLeft className="size-4" />
      <span className="sr-only">Toggle sidebar</span>
    </Button>
  )
}

function SidebarInset({ className, ...props }: React.ComponentProps<"main">) {
  return (
    <main
      data-slot="sidebar-inset"
      className={cn("relative flex min-h-0 flex-1 flex-col overflow-hidden", className)}
      {...props}
    />
  )
}

function SidebarHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-header"
      className={cn("flex flex-col gap-3 border-b border-sidebar-border/70 p-4", className)}
      {...props}
    />
  )
}

function SidebarContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-content"
      className={cn("flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto p-4", className)}
      {...props}
    />
  )
}

function SidebarFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-footer"
      className={cn("border-t border-sidebar-border/70 p-4", className)}
      {...props}
    />
  )
}

function SidebarSeparator({
  className,
  ...props
}: React.ComponentProps<typeof Separator>) {
  return (
    <Separator
      data-slot="sidebar-separator"
      className={cn("bg-sidebar-border/70", className)}
      {...props}
    />
  )
}

function SidebarGroup({ className, ...props }: React.ComponentProps<"section">) {
  return (
    <section
      data-slot="sidebar-group"
      className={cn("flex flex-col gap-2", className)}
      {...props}
    />
  )
}

function SidebarGroupLabel({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-group-label"
      className={cn(
        "px-3 font-mono text-[11px] uppercase tracking-[0.28em] text-muted-foreground/90",
        className
      )}
      {...props}
    />
  )
}

function SidebarGroupContent({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-group-content"
      className={cn("flex flex-col gap-1", className)}
      {...props}
    />
  )
}

function SidebarMenu({ className, ...props }: React.ComponentProps<"ul">) {
  return (
    <ul
      data-slot="sidebar-menu"
      className={cn("flex flex-col gap-1", className)}
      {...props}
    />
  )
}

function SidebarMenuItem({ className, ...props }: React.ComponentProps<"li">) {
  return (
    <li
      data-slot="sidebar-menu-item"
      className={cn("group/menu-item", className)}
      {...props}
    />
  )
}

const sidebarMenuButtonVariants = cva(
  "flex w-full items-center gap-3 overflow-hidden rounded-[1.25rem] px-3.5 py-2.5 text-left text-sm transition-[background-color,color,box-shadow,border-color] outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring/20 disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      size: {
        default: "min-h-11",
        sm: "min-h-9 text-xs",
        lg: "min-h-14",
      },
      isActive: {
        true:
          "surface-control text-foreground shadow-[0_18px_44px_-30px_rgba(15,23,42,0.26)] dark:shadow-[0_24px_56px_-34px_rgba(0,0,0,0.62)]",
        false:
          "text-sidebar-foreground/72 hover:bg-sidebar-accent/80 hover:text-sidebar-accent-foreground",
      },
    },
    defaultVariants: {
      size: "default",
      isActive: false,
    },
  }
)

function SidebarMenuButton({
  asChild = false,
  isActive = false,
  size,
  className,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof sidebarMenuButtonVariants> & {
    asChild?: boolean
    isActive?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="sidebar-menu-button"
      data-active={isActive}
      className={cn(sidebarMenuButtonVariants({ size, isActive, className }))}
      {...props}
    />
  )
}

function SidebarMenuBadge({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="sidebar-menu-badge"
      className={cn(
        "surface-control ml-auto rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground",
        className
      )}
      {...props}
    />
  )
}

function SidebarRail({ className, ...props }: React.ComponentProps<"button">) {
  const { toggleSidebar } = useSidebar()

  return (
    <button
      data-slot="sidebar-rail"
      aria-label="Toggle sidebar"
      className={cn(
        "absolute inset-y-0 hidden w-4 -translate-x-1/2 cursor-ew-resize md:block",
        className
      )}
      onClick={toggleSidebar}
      type="button"
      {...props}
    />
  )
}

export {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
}

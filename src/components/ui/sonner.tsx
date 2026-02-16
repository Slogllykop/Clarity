import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="dark"
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-zinc-950 group-[.toaster]:text-zinc-50 group-[.toaster]:border-zinc-800 group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-zinc-400",
          actionButton: "group-[.toast]:bg-accent group-[.toast]:text-zinc-50",
          cancelButton: "group-[.toast]:bg-zinc-800 group-[.toast]:text-zinc-400",
          success: "group-[.toast]:text-accent",
          error: "group-[.toast]:text-red-500",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };

import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      mobileOffset={{ left: 12, right: 12, top: 12 }}
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
        // Em telas estreitas o toast precisa caber na largura disponível, em vez
        // de encostar na borda e quebrar o texto verticalmente.
        style: { maxWidth: "calc(100vw - 24px)", wordBreak: "normal", overflowWrap: "anywhere" },
      }}
      {...props}
    />
  );
};

export { Toaster };

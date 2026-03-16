import { LoaderIcon } from "lucide-react";

function PageLoader() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-base-100">
      <div className="relative flex flex-col items-center gap-5">
        <div className="absolute inset-0 blur-3xl opacity-20 bg-primary rounded-full scale-150"></div>

        <div className="relative flex items-center justify-center size-24 rounded-[28px] border border-base-300/60 bg-base-100 shadow-2xl">
          <div className="absolute inset-0 rounded-[28px] bg-linear-to-br from-primary/10 via-secondary/5 to-accent/10"></div>
          <LoaderIcon className="relative size-10 animate-spin text-primary" />
        </div>

        <div className="relative text-center">
          <h2 className="text-lg font-black tracking-tight">Loading</h2>
          <p className="text-sm text-base-content/55 mt-1">
            Please wait while the page is prepared
          </p>
        </div>
      </div>
    </div>
  );
}

export default PageLoader;
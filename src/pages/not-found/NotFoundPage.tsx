import { useEffect, useRef } from "react";
import { Sprout } from "lucide-react";
import { isRouteErrorResponse, useRouteError } from "react-router-dom";
import { Button } from "@/components/ui";

export default function NotFoundPage() {
  const error = useRouteError();
  const isNotFound = error == null || (isRouteErrorResponse(error) && error.status === 404);
  const title = isNotFound ? "Page not found" : "Page couldn’t load";
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const previousTitle = document.title;
    document.title = `${isNotFound ? "404 — " : ""}${title} | Blazemap`;
    headingRef.current?.focus({ preventScroll: true });
    return () => { document.title = previousTitle; };
  }, [isNotFound, title]);

  return (
    <main id="main-content" aria-labelledby="error-title" className="grid min-h-dvh grid-rows-[auto_1fr] bg-background px-6 py-6 text-forest sm:px-10 sm:py-8">
      <a href="/" aria-label="Blazemap home" className="inline-flex min-h-11 w-fit items-center gap-2 text-lg font-extrabold tracking-tight">
        <Sprout size={23} strokeWidth={1.8} aria-hidden="true" />
        Blazemap
      </a>

      <div className="flex items-center justify-center py-10 sm:py-12">
        <div className="flex w-full max-w-xl flex-col items-center text-center">
          <svg className="not-found-scene" viewBox="0 0 480 288" width="480" height="288" fill="none" aria-hidden="true" focusable="false">
            <path d="M63 235v-69C63 89 131 38 220 38c112 0 196 62 196 147v50Z" className="fill-secondary" />
            <path d="M28 241c49-27 111-21 167-15 64 7 149-28 254 12-83 37-303 42-421 3Z" className="fill-sage/45" />
            <path d="M177 271c-17-28 10-50 54-67 33-13 40-22 26-34l13-4c25 18 17 33-18 48-39 17-56 35-34 57Z" className="fill-background" />
            {isNotFound && <text x="235" y="192" textAnchor="middle" fontSize="132" fontWeight="800" letterSpacing="-8" className="fill-forest/20">404</text>}

            <path d="M77 191c-25 0-34-23-21-42-17-22-4-48 17-51-4-28 35-43 49-19 29-1 42 29 25 48 17 27 0 52-26 49-6 14-26 19-44 15Z" className="fill-sage" />
            <path d="M102 232V116m0 56-23-21m23 2 20-20" className="stroke-forest" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M48 234v-34m0 20-10-9m10 1 8-7" className="stroke-primary" strokeWidth="2" strokeLinecap="round" />
            <path d="M365 196c-29 0-48-25-36-50-21-23-8-59 17-62-2-37 43-52 60-24 32-4 53 31 35 57 22 28 3 67-29 64-11 16-30 18-47 15Z" className="fill-forest" />
            <path d="M382 239V91m0 71-23-22m23-9 24-23m-24 83 26-24" className="stroke-sage" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M427 238c-17-5-21-17-18-29 14 3 20 12 18 29Zm0 0c0-16 9-26 24-28-1 16-9 27-24 28Z" className="fill-primary" />

            <path d="M303 207v37" className="stroke-forest" strokeWidth="4" strokeLinecap="round" />
            <path d="M281 188h45l14 14-14 14h-45Z" className="fill-background stroke-forest" strokeWidth="2" strokeLinejoin="round" />
            <path d="M293 202h29m-6-6 6 6-6 6" className="stroke-forest" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="m130 241-4-9m4 9 7-7m202 10 4-9m-4 9-5-6" className="stroke-primary" strokeWidth="2" strokeLinecap="round" />
            <path d="M76 252h55m208 7h39" className="stroke-sage" strokeWidth="2" strokeLinecap="round" />
          </svg>

          <h1 ref={headingRef} id="error-title" tabIndex={-1} aria-describedby="error-description" className="mt-7 text-[clamp(32px,4.5vw,46px)] leading-[1.12] font-extrabold tracking-[-0.04em] focus:outline-none">
            {isNotFound && <span className="sr-only">404: </span>}
            {title}
          </h1>
          <p id="error-description" className="mt-4 max-w-[38ch] text-base leading-7 text-muted-foreground">
            {isNotFound
              ? "This path doesn’t lead anywhere. Return home to continue."
              : "Something interrupted this page. Try reloading, or return home to continue."}
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            {!isNotFound && <Button type="button" size="lg" onClick={() => window.location.reload()} className="font-bold">Reload page</Button>}
            <Button asChild size="lg" variant={isNotFound ? "default" : "outline"} className="font-bold">
              <a href="/">Back to home</a>
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}

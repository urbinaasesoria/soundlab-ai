import { lazy, Suspense, useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { Shell } from "./components/Shell";
import { AuthGuard } from "./components/AuthGuard";
import { Logo } from "./components/Logo";
import { BRAND } from "./lib/brand";
import { StudioProvider, useStudio } from "./lib/storage/store";
import { HomePage } from "./pages/Home";

/* Rutas secundarias con carga diferida: reduce el bundle inicial. */
const ProjectsPage = lazy(() => import("./pages/Projects").then((m) => ({ default: m.ProjectsPage })));
const ProjectDetailPage = lazy(() =>
  import("./pages/ProjectDetail").then((m) => ({ default: m.ProjectDetailPage })),
);
const ScanPage = lazy(() => import("./pages/Scan").then((m) => ({ default: m.ScanPage })));
const ForensicPage = lazy(() => import("./pages/Forensic").then((m) => ({ default: m.ForensicPage })));
const HumanizerPage = lazy(() => import("./pages/Humanizer").then((m) => ({ default: m.HumanizerPage })));
const SunoPage = lazy(() => import("./pages/Suno").then((m) => ({ default: m.SunoPage })));
const CompositorPage = lazy(() =>
  import("./pages/Compositor").then((m) => ({ default: m.CompositorPage })),
);
const BlindTestPage = lazy(() =>
  import("./pages/BlindTest").then((m) => ({ default: m.BlindTestPage })),
);
const ShieldPage = lazy(() => import("./pages/Shield").then((m) => ({ default: m.ShieldPage })));
const CoverizadorPage = lazy(() =>
  import("./pages/Coverizador").then((m) => ({ default: m.CoverizadorPage })),
);
const BillingPage = lazy(() => import("./pages/Billing").then((m) => ({ default: m.BillingPage })));
const ProfilePage = lazy(() => import("./pages/Profile").then((m) => ({ default: m.ProfilePage })));
const ReportPage = lazy(() => import("./pages/Report").then((m) => ({ default: m.ReportPage })));
const LegalPage = lazy(() => import("./pages/Legal").then((m) => ({ default: m.LegalPage })));

/** Reinicia el scroll al cambiar de ruta, salvo en el informe imprimible. */
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    if (pathname.startsWith("/report/")) return;
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [pathname]);
  return null;
}

/** Pantalla de carga mientras se descarga un módulo de ruta. */
function RouteFallback() {
  return (
    <div className="route-loading" role="status" aria-live="polite">
      <span className="spinner spinner--lg" />
      <p>Cargando módulo…</p>
    </div>
  );
}

function Boot({ children }: { children: React.ReactNode }) {
  const { ready, bootError, resetAll } = useStudio();

  if (!ready) {
    return (
      <div className="boot" role="status" aria-live="polite">
        <div className="boot__mark">
          <Logo size={62} />
        </div>
        <div className="boot__word">{BRAND.wordmark}</div>
        <div className="boot__sub">
          {BRAND.sub} · LABORATORIO DE AUDIO
        </div>
        <span className="spinner spinner--lg" />
        <p className="boot__text">Abriendo tu laboratorio local…</p>
        <p className="boot__legal">{BRAND.copyright}</p>
      </div>
    );
  }

  if (bootError) {
    return (
      <div className="boot boot--error" role="alert">
        <div className="boot__mark">
          <Logo size={62} glow={false} />
        </div>
        <div className="boot__word">{BRAND.wordmark}</div>
        <div className="callout callout--danger boot__error">
          <AlertTriangle size={18} />
          <div>
            <b>No se pudo abrir el almacenamiento local</b>
            <p>{bootError}</p>
          </div>
        </div>
        <p className="boot__text">
          IndexedDB puede estar bloqueado por el navegador o por el modo privado. Puedes reintentar recargando la
          página o reiniciar los datos locales.
        </p>
        <div className="row-flex">
          <button className="btn btn--primary" onClick={() => window.location.reload()}>
            <RotateCcw size={14} /> Recargar
          </button>
          <button className="btn btn--ghost" onClick={resetAll}>
            Reiniciar datos
          </button>
        </div>
        <p className="boot__legal">{BRAND.copyright}</p>
      </div>
    );
  }

  return <>{children}</>;
}

export function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <StudioProvider>
          <Boot>
            <ScrollToTop />
            <Suspense fallback={<RouteFallback />}>
              <Routes>
                <Route path="/report/:scanId" element={<ReportPage />} />
                <Route element={<Shell />}>
                  <Route index element={<HomePage />} />
                  <Route path="billing" element={<BillingPage />} />
                  <Route path="profile" element={<ProfilePage />} />
                  <Route path="legal" element={<LegalPage />} />

                  {/* Rutas exclusivas del laboratorio (requieren registro / inicio de sesión) */}
                  <Route element={<AuthGuard />}>
                    <Route path="projects" element={<ProjectsPage />} />
                    <Route path="projects/:id" element={<ProjectDetailPage />} />
                    <Route path="scan" element={<ScanPage />} />
                    <Route path="forensic" element={<ForensicPage />} />
                    <Route path="humanizer" element={<HumanizerPage />} />
                    <Route path="suno" element={<SunoPage />} />
                    <Route path="compositor" element={<CompositorPage />} />
                    <Route path="comparador" element={<BlindTestPage />} />
                    <Route path="shield" element={<ShieldPage />} />
                    <Route path="coverizador" element={<CoverizadorPage />} />
                  </Route>

                  <Route path="*" element={<Navigate to="/" replace />} />
                </Route>
              </Routes>
            </Suspense>
          </Boot>
        </StudioProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

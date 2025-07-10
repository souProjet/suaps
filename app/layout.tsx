import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Planificateur SUAPS - Université de Nantes",
  description: "Trouvez facilement des créneaux compatibles pour vos activités sportives SUAPS",
  manifest: "/manifest.json",
  themeColor: "#3b82f6",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "SUAPS Planner"
  },
  openGraph: {
    title: "Planificateur SUAPS",
    description: "Trouvez facilement des créneaux compatibles pour vos activités sportives SUAPS",
    type: "website",
    locale: "fr_FR"
  },
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "default",
    "apple-mobile-web-app-title": "SUAPS Planner",
    "application-name": "SUAPS Planner",
    "msapplication-TileColor": "#3b82f6",
    "msapplication-TileImage": "/icons/icon-144x144.png"
  }
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <head>
        {/* PWA Icons */}
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/icons/icon-72x72.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/icons/icon-72x72.png" />
        
        {/* Manifest */}
        <link rel="manifest" href="/manifest.json" />
        
        {/* Apple specific */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="SUAPS Planner" />
        
        {/* Microsoft specific */}
        <meta name="msapplication-TileColor" content="#3b82f6" />
        <meta name="msapplication-TileImage" content="/icons/icon-144x144.png" />
        
        {/* Theme color */}
        <meta name="theme-color" content="#3b82f6" />
        
        {/* Viewport for PWA */}
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
        
        {/* Service Worker Registration */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js')
                    .then(function(registration) {
                      console.log('Service Worker registered successfully:', registration.scope);
                      
                      // Vérifier les mises à jour
                      registration.addEventListener('updatefound', () => {
                        const newWorker = registration.installing;
                        if (newWorker) {
                          newWorker.addEventListener('statechange', () => {
                            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                              // Nouvelle version disponible
                              console.log('Nouvelle version disponible');
                              // Optionnel: afficher une notification à l'utilisateur
                            }
                          });
                        }
                      });
                    })
                    .catch(function(error) {
                      console.log('Service Worker registration failed:', error);
                    });
                });
              } else {
                console.log('Service Worker not supported');
              }
              
              // Gérer l'événement beforeinstallprompt pour PWA
              let deferredPrompt;
              window.addEventListener('beforeinstallprompt', (e) => {
                e.preventDefault();
                deferredPrompt = e;
                console.log('PWA install prompt ready');
                
                // Optionnel: Afficher un bouton d'installation personnalisé
                // showInstallButton();
              });
              
              // Gérer l'installation réussie
              window.addEventListener('appinstalled', (evt) => {
                console.log('PWA installed successfully');
                deferredPrompt = null;
              });
              
              // Fonction pour déclencher l'installation (si besoin)
              window.installPWA = function() {
                if (deferredPrompt) {
                  deferredPrompt.prompt();
                  deferredPrompt.userChoice.then((choiceResult) => {
                    if (choiceResult.outcome === 'accepted') {
                      console.log('User accepted the PWA install prompt');
                    } else {
                      console.log('User dismissed the PWA install prompt');
                    }
                    deferredPrompt = null;
                  });
                }
              };
            `,
          }}
        />
      </head>
      <body className={inter.className}>
        {children}
      </body>
    </html>
  );
} 
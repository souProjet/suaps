@echo off
title Planificateur SUAPS - Démarrage
echo.
echo ===============================================
echo   🎯 Planificateur SUAPS - Universite de Nantes
echo ===============================================
echo.

echo ⏳ Vérification de Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js n'est pas installé !
    echo.
    echo 📥 Veuillez installer Node.js depuis : https://nodejs.org
    echo    - Téléchargez la version LTS (recommandée)
    echo    - Redémarrez ce script après l'installation
    echo.
    pause
    exit /b 1
)

echo ✅ Node.js détecté !
echo.

echo ⏳ Installation des dépendances...
call npm install
if errorlevel 1 (
    echo ❌ Erreur lors de l'installation !
    pause
    exit /b 1
)

echo.
echo ✅ Dépendances installées !
echo.

echo 🚀 Lancement de l'application...
echo.
echo 🌐 L'application sera disponible sur : http://localhost:3000
echo.
echo 💡 Conseils :
echo    - Laissez cette fenêtre ouverte pendant l'utilisation
echo    - Utilisez Ctrl+C pour arrêter l'application
echo    - Actualisez votre navigateur si nécessaire
echo.

start http://localhost:3000
call npm run dev

pause 
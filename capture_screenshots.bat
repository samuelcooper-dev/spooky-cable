@echo off
echo.
echo =============================================
echo   Spooky Cable - Feature Screenshot Tool
echo =============================================
echo.
echo This will capture screenshots of all features:
echo   - Power screen, live TV, info banner
echo   - Guide (fullscreen, PiP, interactive)
echo   - Fullscreen mode, retro mode
echo   - On-demand library and player
echo   - Channel switching demos
echo.
echo Make sure the server is running first!
echo (Run serve.py in another terminal)
echo.
pause

echo.
echo Starting screenshot capture...
echo.

node capture_features.js

echo.
echo.
echo =============================================
echo   Screenshots captured!
echo =============================================
echo.
echo Check the tv/shots/ folder for:
echo   feature-01-power-screen.png
echo   feature-02-live-tv.png
echo   feature-03-info-banner.png
echo   ... and more!
echo.
pause

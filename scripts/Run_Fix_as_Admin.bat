@echo off
echo Running PowerShell database fix script with administrator privileges...
echo.

powershell -ExecutionPolicy Bypass -Command "Start-Process powershell -ArgumentList '-ExecutionPolicy Bypass -File \"%~dp0fix-database.ps1\"' -Verb RunAs" 
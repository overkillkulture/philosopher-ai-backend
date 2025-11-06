@echo off
echo ========================================
echo CHECKING USB WIFI ADAPTER
echo ========================================
echo.
echo Looking for network devices with errors...
echo.

powershell -Command "Get-PnpDevice | Where-Object {$_.Status -ne 'OK' -and ($_.Class -eq 'Net' -or $_.FriendlyName -match 'Network' -or $_.FriendlyName -match 'Wireless' -or $_.FriendlyName -match 'WiFi' -or $_.FriendlyName -match '802.11')} | Format-Table FriendlyName, Status, Class, InstanceId -AutoSize"

echo.
echo ========================================
echo Looking for ALL network adapters...
echo ========================================
echo.

powershell -Command "Get-PnpDevice -Class Net | Format-Table FriendlyName, Status, Manufacturer -AutoSize"

echo.
echo ========================================
echo DONE
echo ========================================
echo.
echo If you see a device with Status "Error" or "Unknown",
echo that's your WiFi dongle!
echo.
echo Copy the device name and tell me what it is.
echo.
pause

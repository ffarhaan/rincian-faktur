Set WshShell = CreateObject("WScript.Shell")
WshShell.CurrentDirectory = "c:\\Users\\medikabinainvestama_\\Downloads\\faktur-database"
WshShell.Run "cmd /c npm run start", 0, False